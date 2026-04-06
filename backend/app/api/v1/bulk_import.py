"""Bulk import endpoints."""

from __future__ import annotations

import io
import re
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal, TypeVar, cast
from uuid import UUID

import structlog
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select

from app.api.dependencies import (
    AsyncDB,
    CurrentBulkImportUser,
    OrganizationContext,
    PageNumber,
    PageSize,
)
from app.authz.authz import raise_bad_request, raise_org_access_denied, raise_resource_not_found
from app.core.config import settings
from app.models.bulk_import import ImportItem, ImportRun
from app.models.company import Company
from app.models.discovery_session import DiscoverySource
from app.models.location import Location
from app.models.voice_interview import ImportRunIdempotencyKey, VoiceInterview
from app.schemas.bulk_import import (
    AssignOrphansRequest,
    AssignOrphansResponse,
    BulkImportDiscoveryDraftDecisionRequest,
    BulkImportDiscoveryDraftDecisionResponse,
    BulkImportFinalizeRequest,
    BulkImportFinalizeResponse,
    BulkImportFinalizeSummary,
    BulkImportItemPatchRequest,
    BulkImportItemResponse,
    BulkImportRunLocationOption,
    BulkImportRunResponse,
    BulkImportSummaryResponse,
    BulkImportUploadResponse,
    ItemStatus,
    RunStatus,
)
from app.schemas.common import PaginatedResponse
from app.services.bulk_import_service import MAX_IMPORT_FILE_BYTES, BulkImportService
from app.services.s3_service import upload_file_to_s3
from app.services.storage_delete_service import delete_storage_keys

router = APIRouter()
service = BulkImportService()
logger = structlog.get_logger(__name__)
TResult = TypeVar("TResult")

ALLOWED_BULK_IMPORT_EXTENSIONS = {
    (ext if ext.startswith(".") else f".{ext}").casefold()
    for ext in settings.bulk_import_allowed_extensions_list
}


@router.post(
    "/upload", response_model=BulkImportUploadResponse, status_code=status.HTTP_201_CREATED
)
async def upload_bulk_import_file(
    entrypoint_type: Annotated[str, Form()],
    entrypoint_id: Annotated[UUID, Form()],
    file: Annotated[UploadFile, File()],
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> BulkImportUploadResponse:
    file_name = _sanitize_filename(file.filename or "")
    if not file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    extension = Path(file_name).suffix.casefold()
    if extension == ".xls":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Legacy .xls is not supported. Use .xlsx instead.",
        )
    if extension not in ALLOWED_BULK_IMPORT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {extension or 'unknown'}",
        )

    await _validate_entrypoint(
        db=db, org_id=org.id, entrypoint_type=entrypoint_type, entrypoint_id=entrypoint_id
    )

    file_bytes = await file.read(MAX_IMPORT_FILE_BYTES + 1)
    if len(file_bytes) > MAX_IMPORT_FILE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    run_id = uuid.uuid4()
    stored_filename = f"{uuid.uuid4()}{extension}"
    storage_key = f"imports/{run_id}/{stored_filename}"

    try:
        await upload_file_to_s3(io.BytesIO(file_bytes), storage_key, file.content_type)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store import file",
        ) from exc

    run = ImportRun(
        id=run_id,
        organization_id=org.id,
        entrypoint_type=entrypoint_type,
        entrypoint_id=entrypoint_id,
        source_file_path=storage_key,
        source_filename=file_name,
        status="uploaded",
        processing_attempts=0,
        processing_available_at=datetime.now(UTC),
        created_by_user_id=current_user.id,
    )
    db.add(run)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        try:
            await delete_storage_keys([storage_key])
        except Exception:
            logger.warning(
                "bulk_import_upload_cleanup_failed", storage_key=storage_key, exc_info=True
            )
        raise
    return BulkImportUploadResponse(run_id=run.id, status="uploaded")


@router.get("/runs/pending", response_model=BulkImportRunResponse | None)
async def get_pending_run(
    entrypoint_type: Annotated[
        Literal["company", "location"], Query(description="company or location")
    ],
    entrypoint_id: Annotated[UUID, Query(description="Company or location UUID")],
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> BulkImportRunResponse | None:
    """Return the latest review_ready run for an entrypoint, or null."""
    from sqlalchemy import select

    run = await db.scalar(
        select(ImportRun)
        .where(
            ImportRun.organization_id == org.id,
            ImportRun.entrypoint_type == entrypoint_type,
            ImportRun.entrypoint_id == entrypoint_id,
            ImportRun.status == "review_ready",
        )
        .order_by(ImportRun.created_at.desc())
        .limit(1)
    )
    if not run:
        return None
    return await _with_voice_interview_id(db, run)


@router.get("/runs/{run_id}", response_model=BulkImportRunResponse)
async def get_bulk_import_run(
    run_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> BulkImportRunResponse:
    run = await service.get_run(db, organization_id=org.id, run_id=run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return await _with_voice_interview_id(db, run)


@router.get("/runs/{run_id}/items", response_model=PaginatedResponse[BulkImportItemResponse])
async def list_bulk_import_items(
    run_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
    page: PageNumber = 1,
    size: PageSize = 50,
    status_filter: Annotated[
        ItemStatus | None,
        Query(alias="status", description="pending_review, accepted, amended, rejected, invalid"),
    ] = None,
) -> PaginatedResponse[BulkImportItemResponse]:
    run = await service.get_run(db, organization_id=org.id, run_id=run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    items, total = await service.list_items(
        db,
        organization_id=org.id,
        run_id=run_id,
        page=page,
        size=size,
        status_filter=status_filter,
    )
    total_pages = (total + size - 1) // size if total > 0 else 1
    return PaginatedResponse(
        items=[BulkImportItemResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        size=size,
        pages=total_pages,
    )


@router.get("/runs/{run_id}/locations", response_model=list[BulkImportRunLocationOption])
async def list_bulk_import_run_locations(
    run_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
    query: Annotated[str, Query(description="Location search query")] = "",
    limit: Annotated[int, Query(ge=1, le=50, description="Max results")] = 20,
) -> list[BulkImportRunLocationOption]:
    run = await service.get_run(db, organization_id=org.id, run_id=run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    company_id = await service.get_effective_company_id_for_run(db, run=run)
    search_term = query.strip()

    stmt = (
        select(Location)
        .where(
            Location.organization_id == org.id,
            Location.company_id == company_id,
            Location.archived_at.is_(None),
        )
        .order_by(Location.name, Location.city, Location.state)
        .limit(limit)
    )

    if search_term:
        like = f"%{search_term}%"
        stmt = stmt.where(
            Location.name.ilike(like)
            | Location.city.ilike(like)
            | Location.state.ilike(like)
            | Location.address.ilike(like)
        )

    result = await db.execute(stmt)
    locations = result.scalars().all()
    return [
        BulkImportRunLocationOption(
            id=location.id,
            name=location.name,
            city=location.city,
            state=location.state,
            address=location.address,
        )
        for location in locations
    ]


@router.patch("/items/{item_id}", response_model=BulkImportItemResponse)
async def patch_bulk_import_item(
    item_id: UUID,
    payload: BulkImportItemPatchRequest,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> BulkImportItemResponse:
    item_probe = await db.get(ImportItem, item_id)
    if item_probe is None:
        raise_resource_not_found("Item not found", details={"item_id": str(item_id)})
    assert item_probe is not None
    if item_probe.organization_id != org.id:
        raise_org_access_denied(org_id=str(org.id))

    async def _operation() -> ImportItem:
        return await service.update_item_decision(
            db,
            organization_id=org.id,
            item_id=item_id,
            action=payload.action,
            normalized_data=payload.normalized_data,
            review_notes=payload.review_notes,
            location_resolution=payload.location_resolution,
            confirm_create_new=payload.confirm_create_new,
        )

    item = await _execute_in_transaction(db, _operation)
    await db.refresh(item, attribute_names=["updated_at"])
    return BulkImportItemResponse.model_validate(item)


@router.post(
    "/items/{item_id}/discovery-decision",
    response_model=BulkImportDiscoveryDraftDecisionResponse,
)
async def decide_discovery_draft_item(
    item_id: UUID,
    payload: BulkImportDiscoveryDraftDecisionRequest,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> BulkImportDiscoveryDraftDecisionResponse:
    item_probe = await db.get(ImportItem, item_id)
    if item_probe is None:
        raise_resource_not_found("Item not found", details={"item_id": str(item_id)})
    assert item_probe is not None
    if item_probe.organization_id != org.id:
        raise_org_access_denied(org_id=str(org.id))

    async def _operation() -> tuple[ImportItem, BulkImportFinalizeSummary, ImportRun]:
        return await service.decide_discovery_project_draft(
            db,
            organization_id=org.id,
            item_id=item_id,
            current_user=current_user,
            action=payload.action,
            normalized_data=payload.normalized_data,
            review_notes=payload.review_notes,
            location_resolution=payload.location_resolution,
            confirm_create_new=payload.confirm_create_new,
            owner_user_id=payload.owner_user_id,
        )

    item, summary, run = await _execute_in_transaction(db, _operation)
    await db.refresh(item, attribute_names=["updated_at"])
    return BulkImportDiscoveryDraftDecisionResponse(
        status=_run_status_literal(run.status),
        summary=summary,
        item=BulkImportItemResponse.model_validate(item),
    )


@router.post("/runs/{run_id}/finalize", response_model=BulkImportFinalizeResponse)
async def finalize_bulk_import_run(
    run_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
    payload: BulkImportFinalizeRequest | None = None,
) -> BulkImportFinalizeResponse:
    run_probe = await db.get(ImportRun, run_id)
    if run_probe is None:
        raise_resource_not_found("Run not found", details={"run_id": str(run_id)})
    assert run_probe is not None
    if run_probe.organization_id != org.id:
        raise_org_access_denied(org_id=str(org.id))

    async def _operation() -> BulkImportFinalizeSummary:
        return await service.finalize_run(
            db,
            run_id=run_id,
            organization_id=org.id,
            current_user=current_user,
            resolved_group_ids=payload.resolved_group_ids if payload else None,
            idempotency_key=payload.idempotency_key if payload else None,
            close_reason=payload.close_reason if payload else None,
        )

    summary = await _execute_in_transaction(db, _operation)
    run = await service.get_run(db, organization_id=org.id, run_id=run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    if payload and payload.idempotency_key and run.source_type == "voice_interview":
        from sqlalchemy import select

        replay_result = await db.execute(
            select(ImportRunIdempotencyKey.response_json).where(
                ImportRunIdempotencyKey.operation_type == "finalize",
                ImportRunIdempotencyKey.run_id == run.id,
                ImportRunIdempotencyKey.idempotency_key == payload.idempotency_key,
            )
        )
        replay_json = replay_result.scalar_one_or_none()
        if isinstance(replay_json, dict):
            return BulkImportFinalizeResponse.model_validate(replay_json)
    return BulkImportFinalizeResponse(status=_run_status_literal(run.status), summary=summary)


@router.get("/runs/{run_id}/summary", response_model=BulkImportSummaryResponse)
async def get_bulk_import_summary(
    run_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> BulkImportSummaryResponse:
    run = await service.get_run(db, organization_id=org.id, run_id=run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    if run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Run summary not available yet",
        )
    summary = service.get_run_summary(run)
    return BulkImportSummaryResponse(summary=summary)


@router.post(
    "/runs/{run_id}/orphan-projects/import",
    response_model=AssignOrphansResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_orphan_projects(
    run_id: UUID,
    body: AssignOrphansRequest,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> AssignOrphansResponse:
    """Create projects directly from orphan items without re-analysis."""
    run_probe = await db.get(ImportRun, run_id)
    if run_probe is None:
        raise_resource_not_found("Run not found", details={"run_id": str(run_id)})
    assert run_probe is not None
    if run_probe.organization_id != org.id:
        raise_org_access_denied(org_id=str(org.id))
    if run_probe.source_type == "voice_interview":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voice orphan import is disabled. Resolve from Needs Confirmation.",
        )

    result = await service.import_orphan_projects(
        db,
        organization_id=org.id,
        run_id=run_id,
        location_id=body.location_id,
        item_ids=body.item_ids,
        user_id=current_user.id,
    )
    await db.commit()
    projects_created_raw = result.get("projects_created")
    created_project_ids_raw = result.get("created_project_ids")
    skipped_raw = result.get("skipped")
    if not isinstance(projects_created_raw, int):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid response"
        )
    if not isinstance(created_project_ids_raw, dict):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid response"
        )
    if not isinstance(skipped_raw, int):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid response"
        )
    projects_created = projects_created_raw
    created_project_ids_untyped = cast(dict[object, object], created_project_ids_raw)
    skipped = skipped_raw
    created_project_ids = {
        str(key): str(value) for key, value in created_project_ids_untyped.items()
    }
    return AssignOrphansResponse(
        projects_created=projects_created,
        created_project_ids=created_project_ids,
        skipped=skipped,
    )


async def _validate_entrypoint(
    *,
    db: AsyncDB,
    org_id: UUID,
    entrypoint_type: str,
    entrypoint_id: UUID,
) -> None:
    if entrypoint_type == "company":
        company = await db.get(Company, entrypoint_id)
        if company is None:
            raise_resource_not_found(
                "Company not found", details={"company_id": str(entrypoint_id)}
            )
        assert company is not None
        if company.organization_id != org_id:
            raise_org_access_denied(org_id=str(org_id))
        return
    if entrypoint_type == "location":
        location = await db.get(Location, entrypoint_id)
        if location is None:
            raise_resource_not_found(
                "Location not found", details={"location_id": str(entrypoint_id)}
            )
        assert location is not None
        if location.organization_id != org_id:
            raise_org_access_denied(org_id=str(org_id))
        return
    raise_bad_request("Invalid entrypoint_type")


async def _with_voice_interview_id(db: AsyncDB, run: ImportRun) -> BulkImportRunResponse:
    """Build BulkImportRunResponse, enriching with voice_interview_id if applicable."""
    from sqlalchemy import select

    response = BulkImportRunResponse.model_validate(run)
    discovery_source_type = await db.scalar(
        select(DiscoverySource.source_type).where(DiscoverySource.import_run_id == run.id).limit(1)
    )
    if discovery_source_type in {"file", "audio", "text"}:
        response.discovery_source_type = cast(
            Literal["file", "audio", "text"], discovery_source_type
        )
    if run.source_type == "voice_interview":
        vi_id = await db.scalar(
            select(VoiceInterview.id).where(VoiceInterview.bulk_import_run_id == run.id)
        )
        response.voice_interview_id = vi_id
    return response


def _sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", Path(filename).name).strip()
    if len(cleaned) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename too long")
    return cleaned


async def _execute_in_transaction(
    db: AsyncDB,
    operation: Callable[[], Awaitable[TResult]],
) -> TResult:
    try:
        result = await operation()
        await db.commit()
        return result
    except Exception:
        await db.rollback()
        raise


def _run_status_literal(status_value: str) -> RunStatus:
    if status_value not in {
        "uploaded",
        "processing",
        "review_ready",
        "finalizing",
        "completed",
        "failed",
        "no_data",
    }:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid run status")
    return cast(RunStatus, status_value)
