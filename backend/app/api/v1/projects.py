"""
Projects CRUD endpoints.
"""

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException, Path, Query, Request, Response, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import raiseload, selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.api.dependencies import (
    ArchivedFilter,
    AsyncDB,
    CurrentProjectCreator,
    CurrentUser,
    OrganizationContext,
    PageNumber,
    PageSize,
    ProjectArchiveActionDep,
    ProjectDep,
    ProjectPurgeActionDep,
    RateLimitUser10,
    RateLimitUser300,
    SearchQuery,
    SectorFilter,
    StatusFilter,
    apply_archived_filter,
    require_not_archived,
)
from app.authz import permissions
from app.authz.authz import (
    Ownership,
    has_any_scope_access,
    raise_org_access_denied,
    raise_resource_not_found,
    require_permission,
)
from app.main import limiter
from app.models.project import Project
from app.schemas.common import ErrorResponse, PaginatedResponse, SuccessResponse
from app.schemas.project import (
    DashboardStatsResponse,
    PipelineStageStats,
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)
from app.services.storage_delete_service import (
    StorageDeleteError,
    delete_storage_keys,
    validate_storage_keys,
)
from app.utils.purge_utils import collect_project_storage_paths, extract_confirm_name

logger = structlog.get_logger(__name__)

router = APIRouter()


async def _lock_project_for_update(
    db: AsyncDB,
    org_id: UUID,
    project_id: UUID,
) -> Project | None:
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.organization_id == org_id)
        .with_for_update()
    )
    return result.scalar_one_or_none()


async def _archive_project(
    db: AsyncDB,
    org_id: UUID,
    project_id: UUID,
    user_id: UUID,
) -> SuccessResponse:
    project = await _lock_project_for_update(db=db, org_id=org_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.archived_at is not None:
        return SuccessResponse(message=f"Project {project.name} already archived")

    project.archived_at = datetime.now(UTC)
    project.archived_by_user_id = user_id
    project.archived_by_parent_id = None

    await db.commit()
    return SuccessResponse(message=f"Project {project.name} archived successfully")


async def _restore_project(
    db: AsyncDB,
    org_id: UUID,
    project_id: UUID,
) -> SuccessResponse:
    project = await _lock_project_for_update(db=db, org_id=org_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.archived_at is None:
        return SuccessResponse(message=f"Project {project.name} already active")

    project.archived_at = None
    project.archived_by_user_id = None
    project.archived_by_parent_id = None

    await db.commit()
    return SuccessResponse(message=f"Project {project.name} restored successfully")


@router.get(
    "",
    response_model=PaginatedResponse[ProjectSummary],
    summary="List all projects",
    description="Retrieve a paginated list of projects with optional filtering",
)
async def list_projects(
    request: Request,
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser300,  # User-based rate limiting via Redis
    page: PageNumber = 1,
    page_size: PageSize = 10,
    search: SearchQuery = None,
    status: StatusFilter = None,
    sector: SectorFilter = None,
    archived: ArchivedFilter = "active",
    company_id: Annotated[UUID | None, Query(description="Filter by company ID")] = None,
    location_id: Annotated[UUID | None, Query(description="Filter by location ID")] = None,
):
    """
    List user's projects with filtering and pagination.

    Performance optimizations:
    - No relationship loading (raiseload) for list view
    - Uses proposals_count property (no N+1)
    - Indexed queries for fast filtering

    Returns lightweight ProjectSummary objects.
    """
    require_permission(current_user, permissions.PROJECT_READ)
    # Build query with selective loading
    # proposals_count is a scalar subquery column_property (no relationship load needed)
    # Load location_rel and company for company_name/location_name computed fields
    from app.models.location import Location

    query = select(Project).options(
        selectinload(Project.location_rel).selectinload(Location.company),  # For computed fields
        raiseload(Project.files),
        raiseload(Project.timeline),
    )

    # Organization + permission filter
    query = query.where(Project.organization_id == org.id)
    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        query = query.where(Project.user_id == current_user.id)

    query = apply_archived_filter(query, Project, archived)

    # Add search filter
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Project.name.ilike(search_filter)) | (Project.client.ilike(search_filter))
        )

    # Add status filter (supports comma-separated list for multi-status)
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if len(statuses) == 1:
            query = query.where(Project.status == statuses[0])
        elif statuses:
            query = query.where(Project.status.in_(statuses))

    # Add sector filter
    if sector:
        query = query.where(Project.sector == sector)

    # Add company filter (via location relationship)
    if company_id:
        query = query.join(Project.location_rel).where(Location.company_id == company_id)

    # Add location filter
    if location_id:
        query = query.where(Project.location_id == location_id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total: int = int(total_result.scalar_one() or 0)

    # Apply pagination
    query = query.order_by(Project.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    # Execute query
    result = await db.execute(query)
    projects = result.scalars().all()

    # Convert to response models
    # Pydantic V2 handles SQLAlchemy models automatically
    items = [ProjectSummary.model_validate(p, from_attributes=True) for p in projects]

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=page_size,
        pages=total_pages,
    )


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    summary="Get dashboard statistics",
    description="Pre-aggregated statistics for dashboard (replaces client-side calculations)",
)
async def get_dashboard_stats(
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser300,
    archived: ArchivedFilter = "active",
):
    """
    Get pre-aggregated dashboard statistics.

    Performance optimization:
    - Single query with database aggregations (100x faster than client-side)
    - O(1) complexity vs O(N) on frontend
    - Replaces SimplifiedStats and ProjectPipeline calculations

    Returns:
        DashboardStatsResponse with totals, averages, and pipeline breakdown
    """
    require_permission(current_user, permissions.PROJECT_READ)
    # Single aggregation query
    conditions = [Project.organization_id == org.id]
    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        conditions.append(Project.user_id == current_user.id)
    if archived == "active":
        conditions.append(Project.archived_at.is_(None))
    elif archived == "archived":
        conditions.append(Project.archived_at.isnot(None))

    stats_query = select(
        func.count(Project.id).label("total_projects"),
        func.count(case((Project.status == "In Preparation", 1))).label("in_preparation"),
        func.count(case((Project.status == "Generating Proposal", 1))).label("generating"),
        func.count(case((Project.status == "Proposal Ready", 1))).label("ready"),
        func.count(case((Project.status == "Completed", 1))).label("completed"),
        func.avg(Project.progress).label("avg_progress"),
        func.sum(Project.budget).label("total_budget"),
        func.max(Project.updated_at).label("last_updated"),
    ).where(*conditions)

    result = await db.execute(stats_query)
    stats = result.one()

    # Pipeline stages breakdown
    pipeline_query = (
        select(
            Project.status,
            func.count(Project.id).label("project_count"),
            func.avg(Project.progress).label("avg_progress"),
        )
        .where(*conditions)
        .group_by(Project.status)
    )

    pipeline_result = await db.execute(pipeline_query)
    pipeline_rows = pipeline_result.mappings().all()
    pipeline_stages = {}
    for row in pipeline_rows:
        status_value = row.get("status")
        if not isinstance(status_value, str):
            continue
        raw_count = row.get("project_count")
        count_value = int(raw_count) if isinstance(raw_count, int | float) else 0
        avg_value = row.get("avg_progress") or 0
        pipeline_stages[status_value] = PipelineStageStats(
            count=count_value,
            avg_progress=round(avg_value),
        )

    logger.info("Dashboard stats generated for user %s", current_user.id)

    return DashboardStatsResponse(
        total_projects=stats.total_projects or 0,
        in_preparation=stats.in_preparation or 0,
        generating=stats.generating or 0,
        ready=stats.ready or 0,
        completed=stats.completed or 0,
        avg_progress=round(stats.avg_progress or 0),
        total_budget=stats.total_budget or 0.0,
        last_updated=stats.last_updated,
        pipeline_stages=pipeline_stages,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Get project by ID",
    description="Retrieve full project details with eager-loaded relationships",
    responses={404: {"model": ErrorResponse}},
)
async def get_project(
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser300,
    project_id: Annotated[UUID, Path(description="Project unique identifier")],
):
    """
    Get full project details including proposals and recent timeline.

    Returns last 10 timeline events (limited in serializer).
    Use dedicated endpoint for full timeline history.
    """
    require_permission(current_user, permissions.PROJECT_READ)
    from app.models.location import Location

    # Permission: superusers can access any project; members only their own
    conditions = [
        Project.id == project_id,
        Project.organization_id == org.id,
    ]
    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(
        select(Project)
        .where(*conditions)
        .options(
            selectinload(Project.location_rel).selectinload(Location.company),
            selectinload(Project.proposals),
            selectinload(Project.timeline),
            raiseload(Project.files),
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    logger.info("Project retrieved", project_id=str(project.id), name=project.name)
    return ProjectDetail.model_validate(project, from_attributes=True)


@router.post(
    "",
    response_model=ProjectDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Create a new project with the provided information",
    responses={400: {"model": ErrorResponse}},
)
@limiter.limit("100/minute")  # Balanced: Prevents abuse while allowing normal usage with retries
async def create_project(
    request: Request,
    project_data: ProjectCreate,
    current_user: CurrentProjectCreator,
    org: OrganizationContext,
    db: AsyncDB,  # Use type alias
):
    """
    Create a new project with assessment questionnaire applied.

    Assessment questionnaire is the standard form for all waste assessments.
    Returns complete project with questionnaire ready to fill.
    """
    # Fetch location with company (fail-fast if not found)
    from app.models.location import Location
    from app.services.timeline_service import create_timeline_event
    from app.templates.assessment_questionnaire import get_assessment_questionnaire

    location_result = await db.execute(
        select(Location)
        .options(selectinload(Location.company))
        .where(
            Location.id == project_data.location_id,
            Location.organization_id == org.id,
        )
    )
    location = location_result.scalar_one_or_none()

    # Validation: location must exist
    if not location:
        cross_tenant_location = await db.get(Location, project_data.location_id)
        if cross_tenant_location is not None:
            raise_org_access_denied(org_id=str(org.id))
        raise_resource_not_found(
            "Location not found",
            details={"location_id": str(project_data.location_id)},
        )
    assert location is not None
    require_not_archived(location)

    # Validation: location must have company (fail-fast)
    if not location.company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Location '{location.name}' has no associated company. Please assign a company first.",
        )
    assert location.company is not None

    # Inherit all data from company/location
    sector = location.company.sector
    subsector = location.company.subsector
    client_name = location.company.name
    location_name = f"{location.name}, {location.city}"

    logger.info(
        f"📍 Assessment created: {location.company.name} "
        f"({sector}/{subsector or 'N/A'}) at {location.name}, {location.city}"
    )

    new_project = Project(
        user_id=current_user.id,
        location_id=project_data.location_id,
        organization_id=org.id,
        name=project_data.name,
        client=client_name,  # Inherited from Company.name
        sector=sector,  # Inherited from Company.sector
        subsector=subsector,  # Inherited from Company.subsector
        location=location_name,  # Inherited from Location (name + city)
        project_type=project_data.project_type,
        description=project_data.description,
        budget=project_data.budget,
        schedule_summary=project_data.schedule_summary,
        tags=project_data.tags,
        status="In Preparation",
        progress=0,
    )

    db.add(new_project)
    await db.flush()  # Get ID before applying questionnaire

    # Apply standard assessment questionnaire (same for all projects)
    questionnaire = get_assessment_questionnaire()
    new_project.project_data["technical_sections"] = questionnaire
    flag_modified(new_project, "project_data")  # Mark JSONB as modified for SQLAlchemy

    # Create timeline event
    await create_timeline_event(
        db=db,
        project_id=new_project.id,
        organization_id=org.id,
        event_type="project_created",
        title="Assessment created",
        description=f"Assessment '{new_project.name}' created with standard questionnaire",
        actor=current_user.email,
        metadata={
            "sector": new_project.sector,
            "subsector": new_project.subsector,
            "budget": new_project.budget,
            "questionnaire_sections": len(questionnaire),
        },
    )

    await db.commit()

    # Reload project with relationships to avoid greenlet error
    from app.models.location import Location

    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.location_rel).selectinload(Location.company),
            selectinload(Project.proposals),
        )
        .where(Project.id == new_project.id)
    )
    new_project = result.scalar_one()

    # Calculate total fields for logging
    total_fields = sum(len(section["fields"]) for section in questionnaire)

    logger.info(
        f"Assessment created: {new_project.id} - {new_project.name}. "
        f"Questionnaire applied: {len(questionnaire)} sections, {total_fields} fields"
    )

    return ProjectDetail.model_validate(new_project)


@router.patch(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Update project",
    description="Update project fields. Only provided fields will be updated.",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("20/minute")  # Write endpoint - moderate
async def update_project(
    request: Request,
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
):
    """Update project fields and log timeline event."""
    from app.services.timeline_service import create_timeline_event

    result = await db.execute(
        select(Project)
        .where(
            Project.id == project_id,
            Project.organization_id == org.id,
        )
        .with_for_update()
    )
    project = result.scalar_one_or_none()

    if project is None:
        cross_tenant_probe = await db.get(Project, project_id)
        if cross_tenant_probe is not None:
            raise_org_access_denied(org_id=str(org.id))
        raise_resource_not_found("Project not found", details={"project_id": str(project_id)})
    assert project is not None
    require_permission(
        current_user,
        permissions.PROJECT_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    require_not_archived(project)

    # Update fields
    update_data = project_data.model_dump(exclude_unset=True, by_alias=False)
    changed_fields = list(update_data.keys())

    for field, value in update_data.items():
        setattr(project, field, value)

    # Create timeline event
    await create_timeline_event(
        db=db,
        project_id=project.id,
        organization_id=project.organization_id,
        event_type="project_updated",
        title="Project updated",
        description=f"Updated fields: {', '.join(changed_fields)}",
        actor=current_user.email,
        metadata={"changed_fields": changed_fields},
    )

    await db.commit()

    # Reload project with relationships to avoid greenlet error
    from app.models.location import Location

    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.location_rel).selectinload(Location.company),
            selectinload(Project.proposals),
        )
        .where(Project.id == project.id)
    )
    project = result.scalar_one()

    logger.info("Project updated: %s", project.id)
    return ProjectDetail.model_validate(project)


@router.post("/{project_id}/archive", response_model=SuccessResponse)
async def archive_project(
    project: ProjectArchiveActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
):
    require_permission(
        current_user,
        permissions.PROJECT_ARCHIVE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    return await _archive_project(
        db=db,
        org_id=org.id,
        project_id=project.id,
        user_id=current_user.id,
    )


@router.post("/{project_id}/restore", response_model=SuccessResponse)
async def restore_project(
    project: ProjectArchiveActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
):
    require_permission(
        current_user,
        permissions.PROJECT_RESTORE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    return await _restore_project(
        db=db,
        org_id=org.id,
        project_id=project.id,
    )


@router.post("/{project_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def purge_project(
    project: ProjectPurgeActionDep,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
    payload: dict[str, str] | None = None,
):
    confirm_name = extract_confirm_name(payload)
    if not confirm_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="confirm_name is required"
        )
    if confirm_name != project.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="confirm_name does not match"
        )

    locked_project = await _lock_project_for_update(
        db=db,
        org_id=org.id,
        project_id=project.id,
    )
    if not locked_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if locked_project.archived_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project must be archived before purge",
        )

    storage_paths = await collect_project_storage_paths(
        db=db,
        org_id=org.id,
        project_id=project.id,
    )
    try:
        validate_storage_keys(storage_paths)
    except StorageDeleteError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    await db.delete(locked_project)
    await db.commit()

    try:
        await delete_storage_keys(storage_paths)
    except Exception as exc:
        logger.warning("project_purge_storage_delete_failed", error=str(exc))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/{project_id}",
    response_model=SuccessResponse,
    summary="Delete project",
    description="Archive a project (compat delete)",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("10/minute")
async def delete_project(
    request: Request,
    project: ProjectArchiveActionDep,
    db: AsyncDB,
    current_user: CurrentUser,
):
    """Archive a project (compat delete)."""
    require_permission(
        current_user,
        permissions.PROJECT_DELETE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    response = await _archive_project(
        db=db,
        org_id=project.organization_id,
        project_id=project.id,
        user_id=current_user.id,
    )
    logger.info("project_archived", project_id=str(project.id))
    return response


@router.get(
    "/{project_id}/timeline",
    response_model=list,
    summary="Get project timeline",
    description="Get full project activity timeline with pagination",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("60/minute")
async def get_project_timeline(
    request: Request,
    project: ProjectDep,
    db: AsyncDB,
    limit: Annotated[int, Query(ge=1, le=100, description="Max events to return")] = 50,
):
    """Get project activity timeline (most recent first)."""
    from app.models.timeline import TimelineEvent
    from app.schemas.timeline import TimelineEventResponse

    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.project_id == project.id)
        .order_by(TimelineEvent.created_at.desc())
        .limit(limit)
    )
    events = result.scalars().all()

    return [TimelineEventResponse.model_validate(e).model_dump(by_alias=True) for e in events]
