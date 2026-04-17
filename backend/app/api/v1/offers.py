"""Offer endpoints for canonical and compatibility routes."""

from __future__ import annotations

import uuid
from contextlib import suppress
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Annotated, Literal, cast
from uuid import UUID

import aiofiles
import aiofiles.os
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi import Path as ApiPath
from sqlalchemy import and_, case, func, or_, select

from app.api.dependencies import (
    ActiveProjectDataEditorDep,
    ActiveProjectDep,
    AsyncDB,
    CurrentUser,
    OrganizationContext,
)
from app.authz import permissions
from app.authz.authz import Ownership, has_any_scope_access, require_permission
from app.core.config import settings
from app.models.offer import Offer
from app.models.project import Project
from app.schemas.common import ErrorResponse
from app.schemas.dashboard import (
    OfferArchiveCountsResponse,
    OfferArchiveResponse,
    OfferArchiveRow,
    OfferArchiveState,
    OfferPipelineCountsResponse,
    OfferPipelineResponse,
    OfferPipelineRow,
    OfferPipelineState,
)
from app.schemas.offer import OfferDetailDTO, OfferFollowUpStateResponseDTO
from app.services.offer_service import OfferService
from app.services.project_file_service import OFFER_DOCUMENT_CATEGORY
from app.services.s3_service import USE_S3, upload_file_to_s3
from app.services.storage_delete_service import delete_storage_keys

router = APIRouter()
project_router = APIRouter()

OPEN_OFFER_PIPELINE_STATES: tuple[OfferPipelineState, ...] = (
    "uploaded",
    "waiting_to_send",
    "waiting_response",
    "under_negotiation",
)

TERMINAL_OFFER_ARCHIVE_STATE_MAP: dict[str, OfferArchiveState] = {
    "accepted": "accepted",
    "rejected": "declined",
}


def _matches_search(
    *,
    search: str | None,
    stream_name: str,
    company_label: str | None,
    location_label: str | None,
) -> bool:
    if not search:
        return True
    needle = search.strip().lower()
    if not needle:
        return True
    haystacks = [stream_name, company_label or "", location_label or ""]
    return any(needle in haystack.lower() for haystack in haystacks)


def _normalize_archive_state(state: str) -> OfferArchiveState | None:
    return TERMINAL_OFFER_ARCHIVE_STATE_MAP.get(state)


def _normalize_file_name(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in {".pdf", ".doc", ".docx"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported offer document type",
        )
    return ext


async def _stream_file_to_temp(upload: UploadFile, destination: Path) -> tuple[int, str]:
    import hashlib

    size = 0
    hasher = hashlib.sha256()
    async with aiofiles.open(destination, "wb") as out:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024} MB",
                )
            hasher.update(chunk)
            await out.write(chunk)
    return size, hasher.hexdigest()


async def _store_offer_document_file(*, offer_id: UUID, upload: UploadFile) -> tuple[str, int, str, str]:
    if not upload.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")
    ext = _normalize_file_name(upload.filename)
    unique_name = f"{uuid.uuid4()}{ext}"

    if USE_S3:
        key = f"offers/{offer_id}/files/{unique_name}"
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
            temp_path = Path(tmp_file.name)
        try:
            size, digest = await _stream_file_to_temp(upload, temp_path)
            async with aiofiles.open(temp_path, "rb") as handle:
                temp_content = await handle.read()
            await upload_file_to_s3(BytesIO(temp_content), key, upload.content_type)
        finally:
            with suppress(FileNotFoundError):
                await aiofiles.os.remove(temp_path)
        return key, size, digest, ext.lstrip(".")

    storage_key = f"offers/{offer_id}/files/{unique_name}"
    storage_path = Path(settings.LOCAL_STORAGE_PATH) / storage_key
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    size, digest = await _stream_file_to_temp(upload, storage_path)
    return storage_key, size, digest, ext.lstrip(".")


@router.post(
    "",
    response_model=OfferDetailDTO,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Create manual offer",
)
async def create_manual_offer(
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    file: Annotated[UploadFile, File()],
    client: Annotated[str, Form(min_length=1, max_length=255)],
    location: Annotated[str, Form(min_length=1, max_length=255)],
    title: Annotated[str, Form(min_length=1, max_length=255)],
    initial_status: Annotated[OfferPipelineState, Form()],
) -> OfferDetailDTO:
    require_permission(current_user, permissions.PROJECT_CREATE)

    trimmed_client = client.strip()
    trimmed_location = location.strip()
    trimmed_title = title.strip()
    if not trimmed_client or not trimmed_location or not trimmed_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="client, location, and title must not be blank",
        )

    manual_offer = Offer(
        organization_id=org.id,
        source_kind="manual",
        project_id=None,
        status=initial_status,
        display_client=trimmed_client,
        display_location=trimmed_location,
        display_title=trimmed_title,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    db.add(manual_offer)
    await db.flush()

    storage_key = ""
    try:
        storage_key, file_size, file_hash, file_type = await _store_offer_document_file(
            offer_id=manual_offer.id,
            upload=file,
        )
        await OfferService.replace_offer_document(
            db=db,
            offer=manual_offer,
            filename=file.filename or "offer-document",
            file_path=storage_key,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            file_type=file_type,
            file_hash=file_hash,
            uploaded_by=current_user,
        )
        await db.commit()
    except Exception:
        await db.rollback()
        if storage_key:
            await delete_storage_keys([storage_key])
        raise

    return await OfferService.get_offer_detail_by_offer_id(
        db=db,
        offer_id=manual_offer.id,
        organization_id=org.id,
        current_user=current_user,
    )


@router.get("/pipeline", summary="Get active Offers pipeline")
async def get_offers_pipeline(
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    search: Annotated[str | None, Query()] = None,
) -> OfferPipelineResponse:
    from app.models.company import Company
    from app.models.location import Location
    from app.models.proposal import Proposal

    require_permission(current_user, permissions.PROJECT_READ)

    ranked_proposals = (
        select(
            Proposal.project_id.label("project_id"),
            Proposal.id.label("proposal_id"),
            Proposal.version.label("proposal_version"),
            Proposal.title.label("proposal_title"),
            Proposal.capex.label("proposal_capex"),
            func.row_number()
            .over(
                partition_by=Proposal.project_id,
                order_by=(
                    case((Proposal.status == "Current", 1), else_=0).desc(),
                    Proposal.created_at.desc(),
                    Proposal.id.desc(),
                ),
            )
            .label("rank"),
        )
        .where(
            Proposal.organization_id == org.id,
            Proposal.status != "Archived",
        )
        .subquery()
    )

    latest_proposal = (
        select(
            ranked_proposals.c.project_id,
            ranked_proposals.c.proposal_id,
            ranked_proposals.c.proposal_version,
            ranked_proposals.c.proposal_title,
            ranked_proposals.c.proposal_capex,
        )
        .where(ranked_proposals.c.rank == 1)
        .subquery()
    )

    query = (
        select(
            Offer,
            Project,
            Company.name.label("company_label"),
            Location.name.label("location_label"),
            latest_proposal.c.proposal_id,
            latest_proposal.c.proposal_version,
            latest_proposal.c.proposal_title,
            latest_proposal.c.proposal_capex,
        )
        .outerjoin(
            Project,
            and_(
                Offer.project_id == Project.id,
                Offer.organization_id == Project.organization_id,
            ),
        )
        .outerjoin(
            Location,
            and_(
                Project.location_id == Location.id,
                Project.organization_id == Location.organization_id,
            ),
        )
        .outerjoin(
            Company,
            and_(
                Location.company_id == Company.id,
                Company.organization_id == Offer.organization_id,
            ),
        )
        .outerjoin(latest_proposal, latest_proposal.c.project_id == Offer.project_id)
        .where(
            Offer.organization_id == org.id,
            Offer.archived_at.is_(None),
            Offer.status.in_(OPEN_OFFER_PIPELINE_STATES),
        )
    )

    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        query = query.where(
            or_(
                and_(
                    Offer.source_kind == "manual",
                    Offer.created_by_user_id == current_user.id,
                ),
                Project.user_id == current_user.id,
            )
        )

    result = await db.execute(query.order_by(Offer.updated_at.desc()))

    counts: dict[str, int] = {
        "uploaded": 0,
        "waiting_to_send": 0,
        "waiting_response": 0,
        "under_negotiation": 0,
    }
    rows: list[OfferPipelineRow] = []
    for (
        offer,
        project,
        company_label,
        location_label,
        latest_proposal_id,
        latest_proposal_version,
        latest_proposal_title,
        latest_proposal_capex,
    ) in result.all():
        assert isinstance(offer, Offer)
        project_obj = project if isinstance(project, Project) else None

        stream_name = offer.display_title
        if offer.source_kind == "stream" and project_obj is not None:
            stream_name = project_obj.name

        resolved_company = company_label or offer.display_client or (
            project_obj.company_name if project_obj is not None else None
        )
        resolved_location = location_label or offer.display_location or (
            project_obj.location_name if project_obj is not None else None
        )
        if not _matches_search(
            search=search,
            stream_name=stream_name,
            company_label=resolved_company,
            location_label=resolved_location,
        ):
            continue

        state = cast(OfferPipelineState, offer.status)
        counts[state] += 1
        rows.append(
            OfferPipelineRow(
                offer_id=offer.id,
                project_id=offer.project_id,
                stream_name=stream_name,
                company_label=resolved_company,
                location_label=resolved_location,
                proposal_follow_up_state=state,
                latest_proposal_id=latest_proposal_id,
                latest_proposal_version=latest_proposal_version,
                latest_proposal_title=latest_proposal_title,
                value_usd=latest_proposal_capex,
                last_activity_at=offer.updated_at,
            )
        )

    return OfferPipelineResponse(
        counts=OfferPipelineCountsResponse(total=len(rows), **counts),
        items=rows,
    )


@router.get("/archive", summary="Get archived Offers")
async def get_offers_archive(
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[
        OfferArchiveState | None,
        Query(alias="status", description="Filter by final archived state"),
    ] = None,
) -> OfferArchiveResponse:
    from app.models.company import Company
    from app.models.location import Location
    from app.models.proposal import Proposal

    require_permission(current_user, permissions.PROJECT_READ)

    ranked_proposals = (
        select(
            Proposal.project_id.label("project_id"),
            Proposal.id.label("proposal_id"),
            Proposal.version.label("proposal_version"),
            Proposal.title.label("proposal_title"),
            Proposal.capex.label("proposal_capex"),
            func.row_number()
            .over(
                partition_by=Proposal.project_id,
                order_by=(
                    case((Proposal.status == "Current", 1), else_=0).desc(),
                    Proposal.created_at.desc(),
                    Proposal.id.desc(),
                ),
            )
            .label("rank"),
        )
        .where(
            Proposal.organization_id == org.id,
            Proposal.status != "Archived",
        )
        .subquery()
    )

    latest_proposal = (
        select(
            ranked_proposals.c.project_id,
            ranked_proposals.c.proposal_id,
            ranked_proposals.c.proposal_version,
            ranked_proposals.c.proposal_title,
            ranked_proposals.c.proposal_capex,
        )
        .where(ranked_proposals.c.rank == 1)
        .subquery()
    )

    query = (
        select(
            Offer,
            Project,
            Company.name.label("company_label"),
            Location.name.label("location_label"),
            latest_proposal.c.proposal_id,
            latest_proposal.c.proposal_version,
            latest_proposal.c.proposal_title,
            latest_proposal.c.proposal_capex,
        )
        .outerjoin(
            Project,
            and_(
                Offer.project_id == Project.id,
                Offer.organization_id == Project.organization_id,
            ),
        )
        .outerjoin(
            Location,
            and_(
                Project.location_id == Location.id,
                Project.organization_id == Location.organization_id,
            ),
        )
        .outerjoin(
            Company,
            and_(
                Location.company_id == Company.id,
                Company.organization_id == Offer.organization_id,
            ),
        )
        .outerjoin(latest_proposal, latest_proposal.c.project_id == Offer.project_id)
        .where(
            Offer.organization_id == org.id,
            Offer.archived_at.isnot(None),
        )
    )

    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        query = query.where(
            or_(
                and_(
                    Offer.source_kind == "manual",
                    Offer.created_by_user_id == current_user.id,
                ),
                Project.user_id == current_user.id,
            )
        )

    result = await db.execute(query.order_by(Offer.updated_at.desc()))
    counts: dict[OfferArchiveState, int] = {"accepted": 0, "declined": 0}
    rows: list[OfferArchiveRow] = []

    for (
        offer,
        project,
        company_label,
        location_label,
        latest_proposal_id,
        latest_proposal_version,
        latest_proposal_title,
        latest_proposal_capex,
    ) in result.all():
        assert isinstance(offer, Offer)
        project_obj = project if isinstance(project, Project) else None
        archive_state = _normalize_archive_state(offer.status)
        if archive_state is None:
            continue
        if status_filter is not None and archive_state != status_filter:
            continue

        stream_name = offer.display_title
        if offer.source_kind == "stream" and project_obj is not None:
            stream_name = project_obj.name
        resolved_company = company_label or offer.display_client or (
            project_obj.company_name if project_obj is not None else None
        )
        resolved_location = location_label or offer.display_location or (
            project_obj.location_name if project_obj is not None else None
        )
        if not _matches_search(
            search=search,
            stream_name=stream_name,
            company_label=resolved_company,
            location_label=resolved_location,
        ):
            continue

        if offer.archived_at is None:
            continue

        counts[archive_state] += 1
        rows.append(
            OfferArchiveRow(
                offer_id=offer.id,
                project_id=offer.project_id,
                stream_name=stream_name,
                company_label=resolved_company,
                location_label=resolved_location,
                proposal_follow_up_state=archive_state,
                latest_proposal_id=latest_proposal_id,
                latest_proposal_version=latest_proposal_version,
                latest_proposal_title=latest_proposal_title,
                value_usd=latest_proposal_capex,
                last_activity_at=offer.updated_at,
                archived_at=offer.archived_at,
            )
        )

    return OfferArchiveResponse(
        counts=OfferArchiveCountsResponse(total=len(rows), **counts),
        items=rows,
    )


@router.get(
    "/{offer_id}",
    summary="Get Offer detail by offer id",
)
async def get_offer_detail_by_offer_id(
    offer_id: Annotated[UUID, ApiPath(description="Offer unique identifier")],
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
) -> OfferDetailDTO:
    require_permission(current_user, permissions.PROJECT_READ)
    return await OfferService.get_offer_detail_by_offer_id(
        db=db,
        offer_id=offer_id,
        organization_id=org.id,
        current_user=current_user,
    )


@project_router.get(
    "/{project_id}/offer",
    summary="Get Offer detail by project",
)
async def get_offer_detail(
    project: ActiveProjectDep,
    current_user: CurrentUser,
    db: AsyncDB,
) -> OfferDetailDTO:
    require_permission(
        current_user,
        permissions.PROJECT_READ,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    offer = await OfferService.ensure_stream_offer_exists(
        db=db,
        project=project,
        current_user=current_user,
    )
    await db.commit()
    detail = await OfferService.get_offer_detail(db=db, project=project)
    detail.offer_id = offer.id
    detail.source_type = "stream"
    return detail


@project_router.post(
    "/{project_id}/offer/refresh-insights",
    summary="Refresh Offer insights",
)
async def refresh_offer_insights(
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    db: AsyncDB,
) -> OfferDetailDTO:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    offer = await OfferService.ensure_stream_offer_exists(
        db=db,
        project=project,
        current_user=current_user,
    )
    refreshed = await OfferService.refresh_offer_insights(
        db=db,
        project=project,
        current_user=current_user,
    )
    refreshed.offer_id = offer.id
    refreshed.source_type = "stream"
    await db.commit()
    return refreshed


@router.patch("/{offer_id}/status", summary="Transition Offer follow-up state")
async def update_offer_follow_up_state(
    offer_id: Annotated[UUID, ApiPath(description="Offer unique identifier")],
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    payload: dict,
) -> OfferFollowUpStateResponseDTO:
    next_state_raw = payload.get("state")
    if not isinstance(next_state_raw, str):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="state is required")
    next_state = cast(
        OfferPipelineState | Literal["accepted", "rejected"],
        next_state_raw,
    )

    result = await db.execute(
        select(Offer).where(
            Offer.id == offer_id,
            Offer.organization_id == org.id,
        )
    )
    offer = result.scalar_one_or_none()
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")

    if offer.source_kind == "stream" and offer.project_id is not None:
        project_result = await db.execute(
            select(Project).where(
                Project.id == offer.project_id,
                Project.organization_id == offer.organization_id,
            )
        )
        project = project_result.scalar_one_or_none()
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
        require_permission(
            current_user,
            permissions.PROJECT_UPDATE,
            ownership=Ownership.OWN,
            owner_user_id=project.user_id,
        )
        project.proposal_follow_up_state = cast(str, next_state)
        offer.status = cast(str, next_state)
        offer.archived_at = (
            datetime.now(UTC)
            if next_state in {"accepted", "rejected"}
            else None
        )
        offer.updated_by_user_id = current_user.id
        await db.commit()
        await db.refresh(offer, attribute_names=["updated_at", "status", "project_id"])
        return OfferFollowUpStateResponseDTO(
            offer_id=offer.id,
            project_id=offer.project_id,
            follow_up_state=cast(OfferPipelineState | Literal["accepted", "rejected"], offer.status),
            updated_at=offer.updated_at,
        )

    if offer.source_kind == "manual":
        if (
            not has_any_scope_access(current_user, permissions.PROJECT_UPDATE)
            and offer.created_by_user_id != current_user.id
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
        offer.status = cast(str, next_state)
        offer.archived_at = (
            datetime.now(UTC)
            if next_state in {"accepted", "rejected"}
            else None
        )
        offer.updated_by_user_id = current_user.id
        await db.commit()
        await db.refresh(offer, attribute_names=["updated_at", "status", "project_id"])
        return OfferFollowUpStateResponseDTO(
            offer_id=offer.id,
            project_id=offer.project_id,
            follow_up_state=cast(OfferPipelineState | Literal["accepted", "rejected"], offer.status),
            updated_at=offer.updated_at,
        )

    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Offer source not supported")


@router.post(
    "/{offer_id}/document",
    response_model=OfferDetailDTO,
    status_code=status.HTTP_200_OK,
    summary="Upload/replace offer document",
)
async def upload_offer_document(
    offer_id: Annotated[UUID, ApiPath(description="Offer unique identifier")],
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    file: Annotated[UploadFile, File()],
) -> OfferDetailDTO:
    require_permission(current_user, permissions.FILE_UPLOAD)
    result = await db.execute(
        select(Offer).where(
            Offer.id == offer_id,
            Offer.organization_id == org.id,
        )
    )
    offer = result.scalar_one_or_none()
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")

    if offer.source_kind == "stream" and offer.project_id is not None:
        project_result = await db.execute(
            select(Project).where(
                Project.id == offer.project_id,
                Project.organization_id == offer.organization_id,
            )
        )
        project = project_result.scalar_one_or_none()
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
        require_permission(
            current_user,
            permissions.FILE_UPLOAD,
            ownership=Ownership.OWN,
            owner_user_id=project.user_id,
        )

    storage_key, file_size, file_hash, file_type = await _store_offer_document_file(
        offer_id=offer.id,
        upload=file,
    )
    await OfferService.replace_offer_document(
        db=db,
        offer=offer,
        filename=file.filename or "offer-document",
        file_path=storage_key,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        file_type=file_type,
        file_hash=file_hash,
        uploaded_by=current_user,
    )

    if offer.source_kind == "stream" and offer.project_id is not None:
        from app.models.file import ProjectFile

        existing_offer_file_result = await db.execute(
            select(ProjectFile).where(
                ProjectFile.project_id == offer.project_id,
                ProjectFile.organization_id == offer.organization_id,
                ProjectFile.category == OFFER_DOCUMENT_CATEGORY,
            )
        )
        existing_offer_files = list(existing_offer_file_result.scalars().all())
        for existing in existing_offer_files:
            await db.delete(existing)

        db.add(
            ProjectFile(
                organization_id=offer.organization_id,
                project_id=offer.project_id,
                filename=file.filename or "offer-document",
                file_path=storage_key,
                file_size=file_size,
                mime_type=file.content_type or "application/octet-stream",
                file_type=file_type,
                category=OFFER_DOCUMENT_CATEGORY,
                processing_status="completed",
                processing_attempts=0,
                uploaded_by=current_user.id,
                file_hash=file_hash,
                processed_at=datetime.now(UTC),
            )
        )

    await db.commit()
    return await OfferService.get_offer_detail_by_offer_id(
        db=db,
        offer_id=offer.id,
        organization_id=org.id,
        current_user=current_user,
    )
