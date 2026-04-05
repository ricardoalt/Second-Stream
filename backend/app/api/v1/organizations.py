"""
Organization (tenant) endpoints.
"""

from functools import cache
from time import perf_counter
from typing import Annotated, Any, NoReturn, cast
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi_users.exceptions import UserAlreadyExists
from sqlalchemy import and_, func, select

from app.api.dependencies import AsyncDB, CurrentUser, OrganizationContext, SuperAdminOnly
from app.authz import permissions
from app.authz.authz import raise_org_access_denied, require_permission
from app.core.user_manager import UserManager, get_user_manager
from app.main import limiter
from app.models.company import Company
from app.models.location import Location
from app.models.organization import Organization
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.user import User, UserRole
from app.schemas.org_user import OrgUserCreate, OrgUserCreateRequest, OrgUserUpdate
from app.schemas.org_user_detail import (
    AgentDetailKPIs,
    AgentDetailResponse,
    AgentDetailStreamRow,
    ProposalFollowUpState,
)
from app.schemas.organization import (
    OrganizationArchiveRead,
    OrganizationArchiveRequest,
    OrganizationCreate,
    OrganizationPurgeForceRequest,
    OrganizationRead,
    OrganizationUpdate,
)
from app.schemas.user_fastapi import UserRead
from app.services.organization_lifecycle_service import (
    PURGE_RETENTION_DAYS,
    OrganizationLifecycleError,
    archive_organization,
    cleanup_purged_organization_storage,
    purge_force_organization,
    restore_organization,
)

router = APIRouter()
logger = structlog.get_logger(__name__)

OPEN_OFFER_PIPELINE_STATES = (
    "uploaded",
    "waiting_to_send",
    "waiting_response",
    "under_negotiation",
)


def _raise_forbidden_superadmin_required() -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "FORBIDDEN_SUPERADMIN_REQUIRED",
            "message": "Superadmin required",
        },
    )


def _raise_lifecycle_error(exc: OrganizationLifecycleError) -> NoReturn:
    raise HTTPException(
        status_code=exc.status_code,
        detail={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    ) from exc


def _raise_org_inactive_for_user_mutation(org_id: UUID) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "ORG_NOT_ACTIVE",
            "message": "Organization is archived; cannot create or activate users",
            "details": {"org_id": str(org_id)},
        },
    )


def _raise_user_already_exists(email: str) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "USER_ALREADY_EXISTS",
            "message": "A user with this email already exists in this organization.",
            "details": {"email": email},
        },
    )


def _ensure_superadmin_global(current_user: User) -> None:
    if not current_user.is_superuser:
        _raise_forbidden_superadmin_required()
    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "INVALID_ADMIN_STATE",
                "message": "Superadmin must not be scoped to an organization",
                "details": {"actor_user_id": str(current_user.id)},
            },
        )


async def _get_organization_for_update(db: AsyncDB, org_id: UUID) -> Organization | None:
    result = await db.execute(
        select(Organization).where(Organization.id == org_id).with_for_update()
    )
    return result.scalar_one_or_none()


async def _list_users_with_open_streams_count(db: AsyncDB, org_id: UUID) -> list[UserRead]:
    query = (
        select(User, func.count(Project.id).label("open_streams_count"))
        .outerjoin(
            Project,
            and_(
                Project.user_id == User.id,
                Project.organization_id == org_id,
                Project.archived_at.is_(None),
                Project.status != "Completed",
            ),
        )
        .where(User.organization_id == org_id)
        .group_by(User.id)
        .order_by(User.email)
    )
    result = await db.execute(query)
    rows = result.all()

    return [
        UserRead.from_user(
            user,
            organization_id=user.organization_id,
            open_streams_count=open_streams_count,
        )
        for user, open_streams_count in rows
    ]


def _is_missing_value(value: Any) -> bool:
    return value is None or value == "" or value == []


@cache
def _required_dashboard_field_labels() -> dict[str, str]:
    from app.templates.assessment_questionnaire import get_assessment_questionnaire

    labels: dict[str, str] = {}
    for section in get_assessment_questionnaire():
        if not isinstance(section, dict):
            continue
        section_data = cast(dict[str, Any], section)
        fields = section_data.get("fields")
        if not isinstance(fields, list):
            continue
        for field in fields:
            if not isinstance(field, dict) or not field.get("required"):
                continue
            field_id = field.get("id")
            label = field.get("label")
            if isinstance(field_id, str) and isinstance(label, str):
                labels[field_id] = label
    return labels


def _missing_required_field_labels(project: Project) -> list[str]:
    required_fields = _required_dashboard_field_labels()
    project_data = project.project_data if isinstance(project.project_data, dict) else {}
    technical_sections = project_data.get("technical_sections")
    if not isinstance(technical_sections, list):
        return list(required_fields.values())

    observed_values: dict[str, Any] = {}
    for section in technical_sections:
        if not isinstance(section, dict):
            continue
        section_data = cast(dict[str, Any], section)
        fields = section_data.get("fields")
        if not isinstance(fields, list):
            continue
        for field in fields:
            if not isinstance(field, dict):
                continue
            field_id = field.get("id")
            if isinstance(field_id, str) and field_id in required_fields:
                observed_values[field_id] = field.get("value")

    missing_labels: list[str] = []
    for field_id, label in required_fields.items():
        if _is_missing_value(observed_values.get(field_id)):
            missing_labels.append(label)
    return missing_labels


def _effective_proposal_follow_up_state(
    *, stored_state: str | None, proposal_count: int
) -> ProposalFollowUpState | None:
    if stored_state == "uploaded":
        return "uploaded"
    if proposal_count == 0:
        return None
    if stored_state is not None:
        return cast(ProposalFollowUpState, stored_state)
    return "uploaded"


async def _get_field_agent_in_org_or_404(
    *,
    db: AsyncDB,
    org_id: UUID,
    user_id: UUID,
) -> User:
    user = await db.get(User, user_id)
    if user is None or user.organization_id != org_id:
        raise HTTPException(status_code=404, detail="User not found in this organization")
    if user.role != UserRole.FIELD_AGENT.value:
        raise HTTPException(status_code=404, detail="User not found in this organization")
    return user


async def _build_field_agent_detail_response(
    *,
    db: AsyncDB,
    org_id: UUID,
    target_user: User,
    page: int,
    size: int,
) -> AgentDetailResponse:
    proposal_counts = (
        select(
            Proposal.project_id.label("project_id"),
            func.count(Proposal.id).label("proposal_count"),
        )
        .where(Proposal.organization_id == org_id)
        .group_by(Proposal.project_id)
        .subquery()
    )

    query = (
        select(
            Project,
            Company.name.label("company_label"),
            Location.name.label("location_label"),
            func.coalesce(proposal_counts.c.proposal_count, 0).label("proposal_count"),
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
                Company.organization_id == Project.organization_id,
            ),
        )
        .outerjoin(proposal_counts, proposal_counts.c.project_id == Project.id)
        .where(
            Project.organization_id == org_id,
            Project.user_id == target_user.id,
            Project.archived_at.is_(None),
        )
        .order_by(Project.updated_at.desc())
    )

    result = await db.execute(query)

    open_streams = 0
    missing_information = 0
    offers_in_progress = 0
    completed_streams = 0
    streams: list[AgentDetailStreamRow] = []

    for project, company_label, location_label, proposal_count in result.all():
        assert isinstance(project, Project)
        missing_fields = _missing_required_field_labels(project)
        effective_state = _effective_proposal_follow_up_state(
            stored_state=project.proposal_follow_up_state,
            proposal_count=int(proposal_count),
        )
        is_completed = project.status == "Completed"
        if is_completed:
            completed_streams += 1
        else:
            open_streams += 1
            if missing_fields:
                missing_information += 1
            if effective_state in OPEN_OFFER_PIPELINE_STATES:
                offers_in_progress += 1

        streams.append(
            AgentDetailStreamRow(
                project_id=project.id,
                stream_name=project.name,
                status=project.status,
                company_label=company_label or project.company_name,
                location_label=location_label or project.location_name,
                last_activity_at=project.updated_at,
                missing_required_info=bool(missing_fields),
                missing_fields=missing_fields,
                proposal_follow_up_state=effective_state,
            )
        )

    total = len(streams)
    pages = (total + size - 1) // size if total > 0 else 1
    start_index = (page - 1) * size
    end_index = start_index + size
    paged_streams = streams[start_index:end_index]

    return AgentDetailResponse(
        user=UserRead.from_user(
            target_user,
            organization_id=target_user.organization_id,
            open_streams_count=open_streams,
        ),
        kpis=AgentDetailKPIs(
            open_streams=open_streams,
            missing_information=missing_information,
            offers_in_progress=offers_in_progress,
            completed_streams=completed_streams,
        ),
        streams=paged_streams,
        page=page,
        size=size,
        total=total,
        pages=pages,
    )


@router.get("", response_model=list[OrganizationRead])
async def list_organizations(
    current_user: CurrentUser,
    db: AsyncDB,
    include_inactive: Annotated[bool, Query()] = False,
):
    _ensure_superadmin_global(current_user)

    query = select(Organization)
    if not include_inactive:
        query = query.where(Organization.is_active.is_(True))
    query = query.order_by(Organization.name)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    request: Request,
    data: OrganizationCreate,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    require_permission(admin, permissions.ORGANIZATION_CREATE)
    raw_payload = await request.json()
    if isinstance(raw_payload, dict) and ("is_active" in raw_payload or "isActive" in raw_payload):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ORG_LIFECYCLE_FIELD_IMMUTABLE",
                "message": "New organizations are created active; use lifecycle endpoints to change state",
            },
        )

    # BaseSchema serializes with camelCase by default; ORM expects snake_case field names.
    org = Organization(**data.model_dump(by_alias=False))
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/current", response_model=OrganizationRead)
async def get_current_organization(
    org: OrganizationContext,
):
    return org


@router.get("/current/users", response_model=list[UserRead])
async def list_my_org_users(
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
):
    """List users in my organization. Org Admin or Platform Admin only."""
    require_permission(current_user, permissions.ORG_USER_READ)

    return await _list_users_with_open_streams_count(db, org.id)


@router.get("/current/users/{user_id}", response_model=AgentDetailResponse)
async def get_my_org_user_detail(
    user_id: UUID,
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    require_permission(current_user, permissions.ORG_USER_READ)
    target_user = await _get_field_agent_in_org_or_404(db=db, org_id=org.id, user_id=user_id)
    return await _build_field_agent_detail_response(
        db=db,
        org_id=org.id,
        target_user=target_user,
        page=page,
        size=size,
    )


@router.post("/current/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_in_my_org(
    data: OrgUserCreateRequest,
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
    user_manager: Annotated[UserManager, Depends(get_user_manager)],
):
    """Create user in my organization. Org Admin or Platform Admin only."""
    require_permission(current_user, permissions.ORG_USER_CREATE)

    locked_org = await _get_organization_for_update(db, org.id)
    if locked_org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not locked_org.is_active:
        _raise_org_inactive_for_user_mutation(locked_org.id)

    # Block creating platform admins from this endpoint
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot create platform admin from this endpoint. Use /admin/users instead.",
        )

    user_create = OrgUserCreate(
        **data.model_dump(),
        organization_id=locked_org.id,
        is_superuser=False,
    )
    try:
        return await user_manager.create(user_create)
    except UserAlreadyExists:
        _raise_user_already_exists(data.email)


@router.get("/{org_id}", response_model=OrganizationRead)
async def get_organization(
    org_id: UUID,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/{org_id}/users", response_model=list[UserRead])
async def list_org_users(
    org_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
):
    """List users of a specific organization. Platform Admin only."""
    require_permission(current_user, permissions.ORG_USER_READ)
    if org.id != org_id:
        raise_org_access_denied(org_id=str(org_id))

    return await _list_users_with_open_streams_count(db, org.id)


@router.get("/{org_id}/users/{user_id}", response_model=AgentDetailResponse)
async def get_org_user_detail(
    org_id: UUID,
    user_id: UUID,
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    require_permission(current_user, permissions.ORG_USER_READ)
    if org.id != org_id:
        raise_org_access_denied(org_id=str(org_id))

    target_user = await _get_field_agent_in_org_or_404(db=db, org_id=org.id, user_id=user_id)
    return await _build_field_agent_detail_response(
        db=db,
        org_id=org.id,
        target_user=target_user,
        page=page,
        size=size,
    )


@router.post("/{org_id}/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_org_user(
    org_id: UUID,
    data: OrgUserCreateRequest,
    admin: SuperAdminOnly,
    db: AsyncDB,
    user_manager: Annotated[UserManager, Depends(get_user_manager)],
):
    """Create user in a specific organization. Platform Admin only."""
    require_permission(admin, permissions.ORG_USER_CREATE)
    org = await _get_organization_for_update(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not org.is_active:
        _raise_org_inactive_for_user_mutation(org.id)

    # Block creating platform admins from this endpoint
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot create platform admin from this endpoint. Use /admin/users instead.",
        )

    user_create = OrgUserCreate(
        **data.model_dump(),
        organization_id=org.id,
        is_superuser=False,
    )
    try:
        user = await user_manager.create(user_create)
    except UserAlreadyExists:
        _raise_user_already_exists(data.email)
    return user


@router.patch("/{org_id}", response_model=OrganizationRead)
async def update_organization(
    request: Request,
    org_id: UUID,
    data: OrganizationUpdate,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    """Update an organization. Platform Admin only."""
    require_permission(admin, permissions.ORGANIZATION_UPDATE)
    raw_payload = await request.json()
    if isinstance(raw_payload, dict) and ("is_active" in raw_payload or "isActive" in raw_payload):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ORG_LIFECYCLE_FIELD_IMMUTABLE",
                "message": "is_active can only be changed via lifecycle endpoints",
            },
        )

    org = await _get_organization_for_update(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True, by_alias=False)
    if update_data and not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ORG_NOT_ACTIVE",
                "message": "Organization is archived; cannot update metadata",
                "details": {"org_id": str(org.id)},
            },
        )

    for field, value in update_data.items():
        setattr(org, field, value)

    await db.commit()
    await db.refresh(org)
    return org


@router.post("/{org_id}/archive", response_model=OrganizationArchiveRead)
@limiter.limit("10/minute")
async def archive_organization_endpoint(
    request: Request,
    org_id: UUID,
    current_user: CurrentUser,
    db: AsyncDB,
    payload: OrganizationArchiveRequest | None = None,
):
    started_at = perf_counter()
    request_id = request.headers.get("x-request-id")
    force_deactivate_users = bool(payload and payload.force_deactivate_users)

    try:
        _ensure_superadmin_global(current_user)
        require_permission(current_user, permissions.ORGANIZATION_ARCHIVE)
    except HTTPException as exc:
        logger.warning(
            "organization_archive_attempt",
            actor_user_id=str(current_user.id),
            org_id=str(org_id),
            forceDeactivateUsers=force_deactivate_users,
            deactivatedUsersCount=0,
            request_id=request_id,
            result="error",
            error_code=(
                "FORBIDDEN_SUPERADMIN_REQUIRED"
                if exc.status_code == status.HTTP_403_FORBIDDEN
                else "INVALID_ADMIN_STATE"
            ),
        )
        raise

    try:
        archive_result = await archive_organization(
            db=db,
            organization_id=org_id,
            actor_user_id=current_user.id,
            force_deactivate_users=force_deactivate_users,
        )
    except OrganizationLifecycleError as exc:
        logger.warning(
            "organization_archive_attempt",
            actor_user_id=str(current_user.id),
            org_id=str(org_id),
            forceDeactivateUsers=force_deactivate_users,
            deactivatedUsersCount=0,
            request_id=request_id,
            result="error",
            error_code=exc.code,
            error_details=exc.details,
            duration_ms=int((perf_counter() - started_at) * 1000),
        )
        _raise_lifecycle_error(exc)

    logger.info(
        "organization_archive_attempt",
        actor_user_id=str(current_user.id),
        org_id=str(archive_result.organization.id),
        org_slug=archive_result.organization.slug,
        forceDeactivateUsers=force_deactivate_users,
        deactivatedUsersCount=archive_result.deactivated_users_count,
        request_id=request_id,
        result="success",
        archived_at=(
            archive_result.organization.archived_at.isoformat()
            if archive_result.organization.archived_at
            else None
        ),
        duration_ms=int((perf_counter() - started_at) * 1000),
    )
    return {
        **OrganizationRead.model_validate(archive_result.organization).model_dump(by_alias=True),
        "deactivatedUsersCount": archive_result.deactivated_users_count,
    }


@router.post("/{org_id}/restore", response_model=OrganizationRead)
@limiter.limit("10/minute")
async def restore_organization_endpoint(
    request: Request,
    org_id: UUID,
    current_user: CurrentUser,
    db: AsyncDB,
):
    started_at = perf_counter()
    request_id = request.headers.get("x-request-id")

    try:
        _ensure_superadmin_global(current_user)
        require_permission(current_user, permissions.ORGANIZATION_RESTORE)
    except HTTPException as exc:
        logger.warning(
            "organization_restore_attempt",
            actor_user_id=str(current_user.id),
            org_id=str(org_id),
            request_id=request_id,
            result="error",
            error_code=(
                "FORBIDDEN_SUPERADMIN_REQUIRED"
                if exc.status_code == status.HTTP_403_FORBIDDEN
                else "INVALID_ADMIN_STATE"
            ),
        )
        raise

    try:
        organization = await restore_organization(
            db=db,
            organization_id=org_id,
        )
    except OrganizationLifecycleError as exc:
        logger.warning(
            "organization_restore_attempt",
            actor_user_id=str(current_user.id),
            org_id=str(org_id),
            request_id=request_id,
            result="error",
            error_code=exc.code,
            error_details=exc.details,
            duration_ms=int((perf_counter() - started_at) * 1000),
        )
        _raise_lifecycle_error(exc)

    logger.info(
        "organization_restore_attempt",
        actor_user_id=str(current_user.id),
        org_id=str(organization.id),
        org_slug=organization.slug,
        request_id=request_id,
        result="success",
        duration_ms=int((perf_counter() - started_at) * 1000),
    )
    return organization


@router.post("/{org_id}/purge-force", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def purge_force_organization_endpoint(
    request: Request,
    org_id: UUID,
    payload: OrganizationPurgeForceRequest,
    current_user: CurrentUser,
    db: AsyncDB,
):
    started_at = perf_counter()
    request_id = request.headers.get("x-request-id")

    try:
        _ensure_superadmin_global(current_user)
        require_permission(current_user, permissions.ORGANIZATION_PURGE)
    except HTTPException as exc:
        logger.warning(
            "organization_purge_force_attempt",
            actor_user_id=str(current_user.id),
            org_id=str(org_id),
            request_id=request_id,
            reason_present=bool(payload.reason),
            reason_length=len(payload.reason),
            ticket_id=payload.ticket_id,
            result="error",
            error_code=(
                "FORBIDDEN_SUPERADMIN_REQUIRED"
                if exc.status_code == status.HTTP_403_FORBIDDEN
                else "INVALID_ADMIN_STATE"
            ),
        )
        raise

    try:
        purge_result = await purge_force_organization(
            db=db,
            organization_id=org_id,
            confirm_name=payload.confirm_name,
            confirm_phrase=payload.confirm_phrase,
        )
    except OrganizationLifecycleError as exc:
        logger.warning(
            "organization_purge_force_attempt",
            actor_user_id=str(current_user.id),
            org_id=str(org_id),
            request_id=request_id,
            reason_present=bool(payload.reason),
            reason_length=len(payload.reason),
            ticket_id=payload.ticket_id,
            result="error",
            error_code=exc.code,
            error_details=exc.details,
            duration_ms=int((perf_counter() - started_at) * 1000),
        )
        _raise_lifecycle_error(exc)

    try:
        cleanup_status = await cleanup_purged_organization_storage(
            db=db,
            organization_id=org_id,
            cleanup_manifest_id=purge_result.cleanup_manifest_id,
            storage_paths=purge_result.storage_paths,
        )
    except OrganizationLifecycleError as exc:
        logger.warning(
            "organization_purge_force_attempt",
            actor_user_id=str(current_user.id),
            org_id=str(org_id),
            request_id=request_id,
            reason_present=bool(payload.reason),
            reason_length=len(payload.reason),
            ticket_id=payload.ticket_id,
            retention_days=PURGE_RETENTION_DAYS,
            result="error",
            error_code=exc.code,
            error_details=exc.details,
            duration_ms=int((perf_counter() - started_at) * 1000),
        )
        _raise_lifecycle_error(exc)

    logger.info(
        "organization_purge_force_attempt",
        actor_user_id=str(current_user.id),
        org_id=str(org_id),
        request_id=request_id,
        reason_present=bool(payload.reason),
        reason_length=len(payload.reason),
        ticket_id=payload.ticket_id,
        retention_days=PURGE_RETENTION_DAYS,
        archived_at=purge_result.archived_at.isoformat(),
        cleanup_status=cleanup_status,
        cleanup_manifest_id=str(purge_result.cleanup_manifest_id),
        deleted_counts=purge_result.deleted_counts,
        result="success" if cleanup_status == "completed" else "pending_cleanup",
        duration_ms=int((perf_counter() - started_at) * 1000),
    )
    if cleanup_status == "failed":
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "error": {
                    "code": "ORG_STORAGE_CLEANUP_PENDING",
                    "message": "Organization purged from DB; storage cleanup pending manual replay",
                    "details": {
                        "org_id": str(org_id),
                        "manifest_id": str(purge_result.cleanup_manifest_id),
                    },
                }
            },
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Keep "/current/..." routes before "/{org_id}/..." routes to avoid
# path shadowing (e.g. "current" matching dynamic org_id paths).
@router.patch("/current/users/{user_id}", response_model=UserRead)
async def update_my_org_user(
    user_id: UUID,
    data: OrgUserUpdate,
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
):
    """Update user role or status in my organization. Org Admin or Platform Admin only."""
    require_permission(current_user, permissions.ORG_USER_UPDATE)

    user = await db.get(User, user_id)
    if not user or user.organization_id != org.id:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    locked_org = await _get_organization_for_update(db, org.id)
    if locked_org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    update_data = data.model_dump(exclude_unset=True, by_alias=False)
    if update_data and not locked_org.is_active:
        _raise_org_inactive_for_user_mutation(locked_org.id)

    # Prevent self-demotion for org admins
    if user.id == current_user.id and data.role and data.role != current_user.role:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own role.",
        )

    if user.id == current_user.id and data.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account.",
        )

    # Block changing to platform admin role
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot promote to platform admin from this endpoint.",
        )
    is_demoting_org_admin = (
        user.role == UserRole.ORG_ADMIN
        and update_data.get("role")
        and update_data["role"] != UserRole.ORG_ADMIN
    )
    is_deactivating_org_admin = (
        user.role == UserRole.ORG_ADMIN and update_data.get("is_active") is False
    )

    if is_demoting_org_admin or is_deactivating_org_admin:
        query = select(User.id).where(
            User.organization_id == locked_org.id,
            User.is_active,
            User.role == UserRole.ORG_ADMIN,
            User.id != user.id,
        )
        result = await db.execute(query)
        if result.first() is None:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last active org admin.",
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{org_id}/users/{user_id}", response_model=UserRead)
async def update_org_user(
    org_id: UUID,
    user_id: UUID,
    data: OrgUserUpdate,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    """Update user role or status in a specific organization. Platform Admin only."""
    require_permission(admin, permissions.ORG_USER_UPDATE)
    locked_org = await _get_organization_for_update(db, org_id)
    if not locked_org:
        raise HTTPException(status_code=404, detail="Organization not found")

    user = await db.get(User, user_id)
    if not user or user.organization_id != org_id:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    update_data = data.model_dump(exclude_unset=True, by_alias=False)
    if update_data and not locked_org.is_active:
        _raise_org_inactive_for_user_mutation(locked_org.id)

    # Block changing to platform admin role
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot promote to platform admin from this endpoint.",
        )
    is_demoting_org_admin = (
        user.role == UserRole.ORG_ADMIN
        and update_data.get("role")
        and update_data["role"] != UserRole.ORG_ADMIN
    )
    is_deactivating_org_admin = (
        user.role == UserRole.ORG_ADMIN and update_data.get("is_active") is False
    )

    if is_demoting_org_admin or is_deactivating_org_admin:
        query = select(User.id).where(
            User.organization_id == locked_org.id,
            User.is_active,
            User.role == UserRole.ORG_ADMIN,
            User.id != user.id,
        )
        result = await db.execute(query)
        if result.first() is None:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last active org admin.",
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user
