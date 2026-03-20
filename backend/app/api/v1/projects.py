"""
Projects CRUD endpoints.
"""

from datetime import UTC, datetime
from functools import cache
from typing import Annotated, Any, Literal, cast
from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException, Path, Query, Request, Response, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import aliased, raiseload, selectinload
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
    can,
    has_any_scope_access,
    raise_org_access_denied,
    raise_resource_not_found,
    require_permission,
)
from app.main import limiter
from app.models.discovery_session import DiscoverySource
from app.models.project import Project
from app.schemas.common import ErrorResponse, PaginatedResponse, SuccessResponse
from app.schemas.dashboard import (
    DashboardBucket,
    DashboardCountsResponse,
    DashboardDraftPreviewSlice,
    DashboardListResponse,
    DraftItemDashboardRow,
    DraftTargetResponse,
    PersistedStreamDashboardRow,
    ProposalFollowUpState,
    ProposalFollowUpStateResponse,
    ProposalFollowUpStateUpdateRequest,
)
from app.schemas.project import (
    DashboardStatsResponse,
    PipelineStageStats,
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)
from app.services.bulk_import_service import BulkImportService
from app.services.project_data_service import ProjectDataService
from app.services.storage_delete_service import (
    StorageDeleteError,
    delete_storage_keys,
    validate_storage_keys,
)
from app.services.timeline_service import create_timeline_event
from app.utils.purge_utils import collect_project_storage_paths, extract_confirm_name

logger = structlog.get_logger(__name__)

router = APIRouter()

INTELLIGENCE_REPORT_THRESHOLD = 70
TOTAL_DRAFT_PREVIEW_LIMIT = 5


bulk_import_service = BulkImportService()


PROPOSAL_FOLLOW_UP_TRANSITIONS: dict[str | None, set[str]] = {
    None: {"uploaded"},
    "uploaded": {"waiting_to_send"},
    "waiting_to_send": {"waiting_response", "rejected"},
    "waiting_response": {"waiting_to_send", "under_negotiation", "accepted", "rejected"},
    "under_negotiation": {"waiting_response", "accepted", "rejected"},
    "accepted": set(),
    "rejected": set(),
}


def _extract_volume_summary(payload: dict[str, Any] | None) -> str | None:
    if not isinstance(payload, dict):
        return None

    direct_value = payload.get("estimated_volume") or payload.get("volume_summary")
    if isinstance(direct_value, str) and direct_value.strip():
        return direct_value.strip()

    technical_sections = payload.get("technical_sections")
    if not isinstance(technical_sections, list):
        return None

    for section in technical_sections:
        if not isinstance(section, dict):
            continue
        fields = section.get("fields")
        if not isinstance(fields, list):
            continue
        for field in fields:
            if not isinstance(field, dict):
                continue
            if field.get("id") != "volume-per-category":
                continue
            value = field.get("value")
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def _is_missing_value(value: Any) -> bool:
    return value is None or value == "" or value == []


@cache
def _dashboard_required_field_labels() -> dict[str, str]:
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
    required_fields = _dashboard_required_field_labels()
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


def _humanize_dashboard_token(value: str) -> str:
    normalized = value.strip().replace("_", " ").replace("-", " ")
    return normalized.title() if normalized else value


def _extract_waste_category_label(project: Project) -> str | None:
    project_data = project.project_data if isinstance(project.project_data, dict) else {}
    technical_sections = project_data.get("technical_sections")
    if isinstance(technical_sections, list):
        for section in technical_sections:
            if not isinstance(section, dict):
                continue
            section_data = cast(dict[str, Any], section)
            fields = section_data.get("fields")
            if not isinstance(fields, list):
                continue
            for field in fields:
                if not isinstance(field, dict) or field.get("id") != "waste-types":
                    continue
                value = field.get("value")
                if isinstance(value, str) and value.strip():
                    return value.strip()
    raw_category = project_data.get("bulk_import_category")
    if isinstance(raw_category, str) and raw_category.strip():
        return _humanize_dashboard_token(raw_category)
    return None


def _owner_display_name(project: Project, *, can_view_owner: bool) -> str | None:
    if not can_view_owner:
        return None
    owner = getattr(project, "user", None)
    if owner is None:
        return None
    full_name = owner.full_name.strip()
    return full_name or owner.email


def _project_completion(project: Project) -> int:
    project_data = project.project_data if isinstance(project.project_data, dict) else {}
    technical_sections = project_data.get("technical_sections")
    if not isinstance(technical_sections, list):
        return 0
    normalized_sections = [
        {str(key): value for key, value in section.items()}
        for section in technical_sections
        if isinstance(section, dict)
    ]
    return ProjectDataService.calculate_progress(normalized_sections)


def _has_workspace_discovery_completion_flag(project: Project) -> bool:
    project_data = project.project_data if isinstance(project.project_data, dict) else {}
    workspace_data_raw = project_data.get("workspace_v1")
    if not isinstance(workspace_data_raw, dict):
        return False
    workspace_data = {str(key): value for key, value in workspace_data_raw.items()}
    completed_at = workspace_data.get("discovery_completed_at")
    return isinstance(completed_at, str) and bool(completed_at.strip())


def _derive_persisted_bucket(
    *,
    proposal_follow_up_state: ProposalFollowUpState | None,
    workspace_discovery_completed: bool,
    completion: int,
) -> DashboardBucket:
    if proposal_follow_up_state is not None:
        return "proposal"
    if workspace_discovery_completed:
        return "intelligence_report"
    if completion >= INTELLIGENCE_REPORT_THRESHOLD:
        return "intelligence_report"
    return "missing_information"


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


def _effective_proposal_follow_up_state(
    *,
    stored_state: str | None,
    proposal_count: int,
) -> ProposalFollowUpState | None:
    if proposal_count == 0:
        return None
    if stored_state is not None:
        return cast(ProposalFollowUpState, stored_state)
    return "uploaded"


async def _build_persisted_dashboard_rows(
    *,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    archived: Literal["active", "archived", "all"],
    company_id: UUID | None,
    proposal_follow_up_state: ProposalFollowUpState | None,
    search: str | None,
) -> list[PersistedStreamDashboardRow]:
    from app.models.company import Company
    from app.models.intake_suggestion import IntakeSuggestion
    from app.models.location import Location
    from app.models.proposal import Proposal
    from app.models.user import User

    pending_suggestions = (
        select(
            IntakeSuggestion.project_id.label("project_id"),
            func.count(IntakeSuggestion.id).label("pending_count"),
        )
        .where(
            IntakeSuggestion.organization_id == org.id,
            IntakeSuggestion.status == "pending",
        )
        .group_by(IntakeSuggestion.project_id)
        .subquery()
    )
    proposal_counts = (
        select(
            Proposal.project_id.label("project_id"),
            func.count(Proposal.id).label("proposal_count"),
        )
        .where(Proposal.organization_id == org.id)
        .group_by(Proposal.project_id)
        .subquery()
    )

    query = (
        select(
            Project,
            Company.id.label("company_id"),
            Company.name.label("company_label"),
            Location.name.label("location_label"),
            func.coalesce(pending_suggestions.c.pending_count, 0).label("pending_count"),
            func.coalesce(proposal_counts.c.proposal_count, 0).label("proposal_count"),
        )
        .options(selectinload(Project.user))
        .outerjoin(User, Project.user_id == User.id)
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
        .outerjoin(pending_suggestions, pending_suggestions.c.project_id == Project.id)
        .outerjoin(proposal_counts, proposal_counts.c.project_id == Project.id)
        .where(Project.organization_id == org.id)
    )

    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        query = query.where(Project.user_id == current_user.id)

    query = apply_archived_filter(query, Project, archived)

    if company_id is not None:
        query = query.where(Company.id == company_id)

    result = await db.execute(query.order_by(Project.updated_at.desc()))
    rows: list[PersistedStreamDashboardRow] = []
    can_view_owner = has_any_scope_access(current_user, permissions.PROJECT_READ)
    for (
        project,
        resolved_company_id,
        company_label,
        location_label,
        pending_count,
        proposal_count,
    ) in result.all():
        assert isinstance(project, Project)
        completion = _project_completion(project)
        workspace_discovery_completed = _has_workspace_discovery_completion_flag(project)
        pending_confirmation = bool(pending_count)
        missing_fields = _missing_required_field_labels(project)
        effective_state = _effective_proposal_follow_up_state(
            stored_state=project.proposal_follow_up_state,
            proposal_count=int(proposal_count),
        )
        if proposal_follow_up_state is not None and effective_state != proposal_follow_up_state:
            continue
        bucket = _derive_persisted_bucket(
            proposal_follow_up_state=effective_state,
            workspace_discovery_completed=workspace_discovery_completed,
            completion=completion,
        )
        resolved_company_label = company_label or project.company_name
        resolved_location_label = location_label or project.location_name
        if not _matches_search(
            search=search,
            stream_name=project.name,
            company_label=resolved_company_label,
            location_label=resolved_location_label,
        ):
            continue
        rows.append(
            PersistedStreamDashboardRow(
                bucket=bucket,
                project_id=project.id,
                stream_name=project.name,
                can_edit_proposal_follow_up=can(
                    current_user,
                    permissions.PROJECT_UPDATE,
                    ownership=Ownership.OWN,
                    owner_user_id=project.user_id,
                ),
                waste_category_label=_extract_waste_category_label(project),
                owner_display_name=_owner_display_name(
                    project,
                    can_view_owner=can_view_owner,
                ),
                company_id=resolved_company_id,
                company_label=resolved_company_label,
                location_label=resolved_location_label,
                archived_at=project.archived_at,
                volume_summary=_extract_volume_summary(project.project_data),
                last_activity_at=project.updated_at,
                pending_confirmation=pending_confirmation,
                missing_required_info=bool(missing_fields),
                missing_fields=missing_fields,
                intelligence_ready=(
                    workspace_discovery_completed or completion >= INTELLIGENCE_REPORT_THRESHOLD
                )
                and effective_state is None,
                proposal_follow_up_state=effective_state,
            )
        )
    return rows


async def _build_draft_dashboard_rows(
    *,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    archived: Literal["active", "archived", "all"],
    company_id: UUID | None,
    proposal_follow_up_state: ProposalFollowUpState | None,
    search: str | None,
) -> list[DraftItemDashboardRow]:
    if archived == "archived" or proposal_follow_up_state is not None:
        return []

    from app.models.bulk_import import ImportItem, ImportRun
    from app.models.company import Company
    from app.models.location import Location

    ParentItem = aliased(ImportItem)
    EntrypointLocation = aliased(Location)
    EntrypointCompany = aliased(Company)
    LocationCompany = aliased(Company)

    query = (
        select(
            ImportItem,
            ImportRun,
            ParentItem,
            EntrypointCompany.id.label("entrypoint_company_id"),
            EntrypointCompany.name.label("entrypoint_company_name"),
            EntrypointLocation.company_id.label("entrypoint_location_company_id"),
            EntrypointLocation.name.label("entrypoint_location_name"),
            LocationCompany.name.label("entrypoint_location_company_name"),
        )
        .join(
            ImportRun,
            and_(
                ImportItem.run_id == ImportRun.id,
                ImportItem.organization_id == ImportRun.organization_id,
            ),
        )
        .outerjoin(ParentItem, ParentItem.id == ImportItem.parent_item_id)
        .outerjoin(
            EntrypointCompany,
            and_(
                ImportRun.entrypoint_type == "company",
                ImportRun.entrypoint_id == EntrypointCompany.id,
                EntrypointCompany.organization_id == ImportRun.organization_id,
            ),
        )
        .outerjoin(
            EntrypointLocation,
            and_(
                ImportRun.entrypoint_type == "location",
                ImportRun.entrypoint_id == EntrypointLocation.id,
                EntrypointLocation.organization_id == ImportRun.organization_id,
            ),
        )
        .outerjoin(
            LocationCompany,
            and_(
                EntrypointLocation.company_id == LocationCompany.id,
                LocationCompany.organization_id == ImportRun.organization_id,
            ),
        )
        .where(
            ImportRun.organization_id == org.id,
            ImportItem.organization_id == org.id,
            ImportRun.status == "review_ready",
            ImportItem.item_type == "project",
            ImportItem.created_project_id.is_(None),
            ImportItem.status.in_(("pending_review", "accepted", "amended")),
            select(DiscoverySource.id)
            .where(
                DiscoverySource.import_run_id == ImportRun.id,
                DiscoverySource.source_type.in_(("file", "text", "audio")),
            )
            .exists(),
        )
    )

    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        query = query.where(ImportRun.created_by_user_id == current_user.id)

    result = await db.execute(query.order_by(ImportItem.updated_at.desc()))
    rows: list[DraftItemDashboardRow] = []
    for (
        item,
        run,
        parent_item,
        entrypoint_company_id,
        entrypoint_company_name,
        entrypoint_location_company_id,
        entrypoint_location_name,
        entrypoint_location_company_name,
    ) in result.all():
        normalized_data = item.normalized_data if isinstance(item.normalized_data, dict) else {}
        parent_data = (
            parent_item.normalized_data
            if parent_item is not None and isinstance(parent_item.normalized_data, dict)
            else {}
        )
        resolved_company_id = entrypoint_company_id or entrypoint_location_company_id
        resolved_company_label = entrypoint_company_name or entrypoint_location_company_name
        if company_id is not None and (
            resolved_company_id is None or resolved_company_id != company_id
        ):
            continue

        location_label: str | None = None
        if isinstance(parent_data.get("name"), str):
            parent_name = parent_data.get("name")
            assert isinstance(parent_name, str)
            normalized_parent_name = parent_name.strip()
            if normalized_parent_name:
                location_label = normalized_parent_name

        if (
            location_label is None
            and run.entrypoint_type == "location"
            and isinstance(entrypoint_location_name, str)
            and entrypoint_location_name.strip()
        ):
            location_label = entrypoint_location_name.strip()

        stream_name = str(normalized_data.get("name") or "").strip() or "Pending"

        draft_kind: Literal["linked", "orphan_stream", "location_only"]
        if parent_item is not None or run.entrypoint_type == "location":
            draft_kind = "linked"
        else:
            draft_kind = "orphan_stream"

        group_id = bulk_import_service._effective_group_id(item)

        confirmable = group_id is not None
        if not _matches_search(
            search=search,
            stream_name=stream_name,
            company_label=resolved_company_label,
            location_label=location_label,
        ):
            continue

        rows.append(
            DraftItemDashboardRow(
                bucket="needs_confirmation",
                item_id=item.id,
                run_id=run.id,
                group_id=group_id,
                stream_name=stream_name,
                company_id=resolved_company_id,
                company_label=resolved_company_label,
                location_label=location_label,
                volume_summary=_extract_volume_summary(normalized_data),
                last_activity_at=item.updated_at,
                source_type=run.source_type,
                draft_status=item.status,
                confidence=item.confidence,
                draft_kind=draft_kind,
                confirmable=confirmable,
                target=(
                    DraftTargetResponse(
                        target_kind="confirmation_flow",
                        run_id=run.id,
                        item_id=item.id,
                        source_type=run.source_type,
                        entrypoint_type=run.entrypoint_type,
                        entrypoint_id=run.entrypoint_id,
                    )
                    if confirmable
                    else None
                ),
            )
        )
    return rows


async def _build_location_only_draft_rows(
    *,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    archived: Literal["active", "archived", "all"],
    company_id: UUID | None,
    proposal_follow_up_state: ProposalFollowUpState | None,
    search: str | None,
) -> list[DraftItemDashboardRow]:
    if archived == "archived" or proposal_follow_up_state is not None:
        return []

    from app.models.bulk_import import ImportItem, ImportRun
    from app.models.company import Company
    from app.models.location import Location

    EntrypointLocation = aliased(Location)
    EntrypointCompany = aliased(Company)
    LocationCompany = aliased(Company)

    query = (
        select(
            ImportItem,
            ImportRun,
            EntrypointCompany.id.label("entrypoint_company_id"),
            EntrypointCompany.name.label("entrypoint_company_name"),
            EntrypointLocation.company_id.label("entrypoint_location_company_id"),
            EntrypointLocation.name.label("entrypoint_location_name"),
            LocationCompany.name.label("entrypoint_location_company_name"),
        )
        .join(
            ImportRun,
            and_(
                ImportItem.run_id == ImportRun.id,
                ImportItem.organization_id == ImportRun.organization_id,
            ),
        )
        .outerjoin(
            EntrypointCompany,
            and_(
                ImportRun.entrypoint_type == "company",
                ImportRun.entrypoint_id == EntrypointCompany.id,
                EntrypointCompany.organization_id == ImportRun.organization_id,
            ),
        )
        .outerjoin(
            EntrypointLocation,
            and_(
                ImportRun.entrypoint_type == "location",
                ImportRun.entrypoint_id == EntrypointLocation.id,
                EntrypointLocation.organization_id == ImportRun.organization_id,
            ),
        )
        .outerjoin(
            LocationCompany,
            and_(
                EntrypointLocation.company_id == LocationCompany.id,
                LocationCompany.organization_id == ImportRun.organization_id,
            ),
        )
        .where(
            ImportRun.organization_id == org.id,
            ImportItem.organization_id == org.id,
            ImportRun.status == "review_ready",
            ImportItem.item_type == "location",
            ImportItem.created_location_id.is_(None),
            ImportItem.status.in_(("pending_review", "accepted", "amended")),
            select(DiscoverySource.id)
            .where(
                DiscoverySource.import_run_id == ImportRun.id,
                DiscoverySource.source_type.in_(("file", "text", "audio")),
            )
            .exists(),
        )
    )

    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        query = query.where(ImportRun.created_by_user_id == current_user.id)

    candidates_result = await db.execute(query.order_by(ImportItem.updated_at.desc()))
    candidates = candidates_result.all()
    if not candidates:
        return []

    candidate_item_ids = [row[0].id for row in candidates]
    active_child_result = await db.execute(
        select(ImportItem.parent_item_id)
        .where(
            ImportItem.organization_id == org.id,
            ImportItem.item_type == "project",
            ImportItem.parent_item_id.in_(candidate_item_ids),
            ImportItem.created_project_id.is_(None),
            ImportItem.status.in_(("pending_review", "accepted", "amended")),
        )
        .group_by(ImportItem.parent_item_id)
    )
    location_ids_with_active_projects = {
        parent_item_id
        for parent_item_id in active_child_result.scalars().all()
        if parent_item_id is not None
    }

    rows: list[DraftItemDashboardRow] = []
    for (
        item,
        run,
        entrypoint_company_id,
        entrypoint_company_name,
        entrypoint_location_company_id,
        entrypoint_location_name,
        entrypoint_location_company_name,
    ) in candidates:
        if item.id in location_ids_with_active_projects:
            continue

        normalized_data = item.normalized_data if isinstance(item.normalized_data, dict) else {}
        resolved_company_id = entrypoint_company_id or entrypoint_location_company_id
        resolved_company_label = entrypoint_company_name or entrypoint_location_company_name
        if company_id is not None and (
            resolved_company_id is None or resolved_company_id != company_id
        ):
            continue

        detected_location_name_raw = normalized_data.get("name")
        detected_location_name = (
            detected_location_name_raw.strip()
            if isinstance(detected_location_name_raw, str)
            else ""
        )
        if not detected_location_name:
            detected_location_name = "Detected location"

        location_label: str | None = detected_location_name
        if not location_label and isinstance(entrypoint_location_name, str):
            normalized_entrypoint_name = entrypoint_location_name.strip()
            if normalized_entrypoint_name:
                location_label = normalized_entrypoint_name

        if not _matches_search(
            search=search,
            stream_name=detected_location_name,
            company_label=resolved_company_label,
            location_label=location_label,
        ):
            continue

        rows.append(
            DraftItemDashboardRow(
                bucket="needs_confirmation",
                item_id=item.id,
                run_id=run.id,
                group_id=item.group_id,
                stream_name=detected_location_name,
                company_id=resolved_company_id,
                company_label=resolved_company_label,
                location_label=location_label,
                volume_summary=None,
                last_activity_at=item.updated_at,
                source_type=run.source_type,
                draft_status=item.status,
                confidence=item.confidence,
                draft_kind="location_only",
                confirmable=False,
                target=None,
            )
        )
    return rows


def _paginate_dashboard_rows(
    *,
    rows: list[PersistedStreamDashboardRow | DraftItemDashboardRow],
    page: int,
    size: int,
) -> tuple[list[PersistedStreamDashboardRow | DraftItemDashboardRow], int, int]:
    total = len(rows)
    pages = (total + size - 1) // size if total > 0 else 1
    start = (page - 1) * size
    end = start + size
    return rows[start:end], total, pages


def _count_dashboard_rows(
    rows: list[PersistedStreamDashboardRow | DraftItemDashboardRow],
) -> DashboardCountsResponse:
    counts: dict[str, int] = {
        "total": len(rows),
        "needs_confirmation": 0,
        "missing_information": 0,
        "intelligence_report": 0,
        "proposal": 0,
    }
    for row in rows:
        if row.kind == "draft_item":
            counts["needs_confirmation"] += 1
            continue
        counts[row.bucket] += 1
    return DashboardCountsResponse(**counts)


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
    "/dashboard",
    summary="Get dashboard triage projection",
    description="Dedicated dashboard counts and rows without changing legacy project contracts.",
)
async def get_dashboard_projection(
    current_user: CurrentUser,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser300,
    bucket: Annotated[DashboardBucket, Query()] = "total",
    page: PageNumber = 1,
    size: PageSize = 10,
    search: SearchQuery = None,
    archived: ArchivedFilter = "active",
    company_id: Annotated[UUID | None, Query(description="Filter by company ID")] = None,
    proposal_follow_up_state: Annotated[
        ProposalFollowUpState | None,
        Query(description="Filter by stream-level proposal follow-up state"),
    ] = None,
) -> DashboardListResponse:
    require_permission(current_user, permissions.PROJECT_READ)

    persisted_rows = await _build_persisted_dashboard_rows(
        db=db,
        current_user=current_user,
        org=org,
        archived=archived,
        company_id=company_id,
        proposal_follow_up_state=proposal_follow_up_state,
        search=search,
    )
    draft_rows = await _build_draft_dashboard_rows(
        db=db,
        current_user=current_user,
        org=org,
        archived=archived,
        company_id=company_id,
        proposal_follow_up_state=proposal_follow_up_state,
        search=search,
    )
    secondary_draft_rows: list[DraftItemDashboardRow] = []

    all_rows = sorted(
        [*persisted_rows, *draft_rows],
        key=lambda row: row.last_activity_at,
        reverse=True,
    )
    counts = _count_dashboard_rows(all_rows)
    draft_preview: DashboardDraftPreviewSlice | None = None
    bucket_rows: list[PersistedStreamDashboardRow | DraftItemDashboardRow]
    if bucket == "total":
        bucket_rows = list(persisted_rows)
        preview_rows = sorted(draft_rows, key=lambda row: row.last_activity_at, reverse=True)
        draft_preview = DashboardDraftPreviewSlice(
            items=preview_rows[:TOTAL_DRAFT_PREVIEW_LIMIT],
            total=len(preview_rows),
        )
    else:
        bucket_rows = [row for row in all_rows if row.bucket == bucket]
    paged_rows, total, pages = _paginate_dashboard_rows(rows=bucket_rows, page=page, size=size)

    return DashboardListResponse(
        bucket=bucket,
        counts=counts,
        items=paged_rows,
        total=total,
        page=page,
        size=size,
        pages=pages,
        draft_preview=draft_preview,
        secondary_draft_rows=secondary_draft_rows,
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


@router.patch(
    "/{project_id}/proposal-follow-up-state",
    response_model=ProposalFollowUpStateResponse,
    summary="Update stream-level proposal commercial follow-up state",
)
@limiter.limit("20/minute")
async def update_project_proposal_follow_up_state(
    request: Request,
    project_id: UUID,
    payload: ProposalFollowUpStateUpdateRequest,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
):
    from app.models.proposal import Proposal

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

    proposal_count = int(
        await db.scalar(
            select(func.count(Proposal.id)).where(
                Proposal.project_id == project.id,
                Proposal.organization_id == project.organization_id,
            )
        )
        or 0
    )
    current_state = _effective_proposal_follow_up_state(
        stored_state=project.proposal_follow_up_state,
        proposal_count=proposal_count,
    )
    next_state = payload.state

    if current_state == next_state:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Proposal follow-up state already set",
        )

    allowed_next = PROPOSAL_FOLLOW_UP_TRANSITIONS.get(current_state, set())
    if next_state not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid proposal follow-up transition",
        )

    if proposal_count == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot start proposal follow-up without a proposal",
        )

    project.proposal_follow_up_state = next_state
    await create_timeline_event(
        db=db,
        project_id=project.id,
        organization_id=project.organization_id,
        event_type="proposal_follow_up_updated",
        title="Proposal follow-up updated",
        actor=current_user.email,
        description=f"Proposal follow-up moved from {current_state or 'none'} to {next_state}",
        metadata={
            "old_state": current_state,
            "new_state": next_state,
            "actor_user_id": str(current_user.id),
            "actor_email": current_user.email,
        },
    )

    await db.commit()
    await db.refresh(project, attribute_names=["updated_at", "proposal_follow_up_state"])
    return ProposalFollowUpStateResponse(
        project_id=project.id,
        proposal_follow_up_state=cast(ProposalFollowUpState, project.proposal_follow_up_state),
        updated_at=project.updated_at,
    )


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
