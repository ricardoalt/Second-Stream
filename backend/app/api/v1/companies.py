"""
Companies API endpoints.
CRUD operations for companies and their locations.
"""

from datetime import UTC, datetime
from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import load_only, selectinload

from app.api.dependencies import (
    ActiveCompanyEditor,
    ActiveCompanyInScopeDep,
    ActiveCompanyLocationCreator,
    ActiveLocationDep,
    ActiveLocationEditor,
    ArchivedFilter,
    AsyncDB,
    CompanyAdminActionDep,
    CurrentCompanyCreator,
    CurrentIncomingMaterialsCreator,
    CurrentIncomingMaterialsDeleter,
    CurrentIncomingMaterialsEditor,
    CurrentLocationContactsCreator,
    CurrentLocationContactsDeleter,
    CurrentLocationContactsEditor,
    CurrentUser,
    LocationAdminActionDep,
    OrganizationContext,
    RateLimitUser10,
    RateLimitUser30,
    RateLimitUser60,
    apply_archived_filter,
)
from app.authz import permissions
from app.authz.authz import Ownership, can, require_permission
from app.models import Company, CompanyContact, IncomingMaterial, Location, LocationContact, Project
from app.models.file import ProjectFile
from app.models.proposal import Proposal
from app.schemas.common import SuccessResponse
from app.schemas.company import (
    CompanyCreate,
    CompanyDetail,
    CompanySummary,
    CompanyUpdate,
)
from app.schemas.company_contact import (
    CompanyContactCreate,
    CompanyContactRead,
    CompanyContactUpdate,
)
from app.schemas.incoming_material import (
    IncomingMaterialCreate,
    IncomingMaterialRead,
    IncomingMaterialUpdate,
)
from app.schemas.location import (
    LocationCreate,
    LocationDetail,
    LocationProjectSummary,
    LocationSummary,
    LocationUpdate,
)
from app.schemas.location_contact import (
    LocationContactCreate,
    LocationContactRead,
    LocationContactUpdate,
)
from app.services.storage_delete_service import (
    StorageDeleteError,
    delete_storage_keys,
    validate_storage_keys,
)
from app.utils.purge_utils import (
    extract_confirm_name,
    extract_pdf_paths,
)

router = APIRouter()
logger = structlog.get_logger(__name__)

COMPANY_CONTACT_PRIMARY_UNIQUE_INDEX = "uq_company_contacts_primary_per_company"
COMPANY_CONTACT_IDENTITY_CHECK = "ck_company_contacts_identity_present"
PRIMARY_CONTACT_CONFLICT_DETAIL = "Company already has a primary contact"


async def _get_project_counts_by_location(
    db: AsyncDB,
    org_id: UUID,
    location_ids: list[UUID],
    current_user: CurrentUser,
    archived: ArchivedFilter = "active",
) -> dict[UUID, int]:
    if not location_ids:
        return {}

    count_conditions = [
        Project.organization_id == org_id,
        Project.location_id.in_(location_ids),
    ]
    if archived == "active":
        count_conditions.append(Project.archived_at.is_(None))
    elif archived == "archived":
        count_conditions.append(Project.archived_at.isnot(None))
    if not can(current_user, permissions.PROJECT_PURGE):
        count_conditions.append(Project.user_id == current_user.id)

    counts_result = await db.execute(
        select(
            Project.location_id,
            func.count(Project.id).label("project_count"),
        )
        .where(*count_conditions)
        .group_by(Project.location_id)
    )
    return {row.location_id: row.project_count for row in counts_result}


async def _collect_location_storage_paths(
    db: AsyncDB,
    org_id: UUID,
    location_id: UUID,
) -> set[str]:
    storage_paths: set[str] = set()

    file_rows = await db.execute(
        select(ProjectFile.file_path)
        .join(Project, ProjectFile.project_id == Project.id)
        .where(
            ProjectFile.organization_id == org_id,
            Project.organization_id == org_id,
            Project.location_id == location_id,
        )
    )
    storage_paths.update({row.file_path for row in file_rows if row.file_path})

    proposal_rows = await db.execute(
        select(Proposal.pdf_path, Proposal.ai_metadata)
        .join(Project, Proposal.project_id == Project.id)
        .where(
            Proposal.organization_id == org_id,
            Project.organization_id == org_id,
            Project.location_id == location_id,
        )
    )
    for pdf_path, ai_metadata in proposal_rows:
        if pdf_path:
            storage_paths.add(pdf_path)
        storage_paths.update(extract_pdf_paths(ai_metadata))

    return storage_paths


async def _collect_company_storage_paths(
    db: AsyncDB,
    org_id: UUID,
    company_id: UUID,
) -> set[str]:
    storage_paths: set[str] = set()

    file_rows = await db.execute(
        select(ProjectFile.file_path)
        .join(Project, ProjectFile.project_id == Project.id)
        .join(Location, Project.location_id == Location.id)
        .where(
            ProjectFile.organization_id == org_id,
            Project.organization_id == org_id,
            Location.organization_id == org_id,
            Location.company_id == company_id,
        )
    )
    storage_paths.update({row.file_path for row in file_rows if row.file_path})

    proposal_rows = await db.execute(
        select(Proposal.pdf_path, Proposal.ai_metadata)
        .join(Project, Proposal.project_id == Project.id)
        .join(Location, Project.location_id == Location.id)
        .where(
            Proposal.organization_id == org_id,
            Project.organization_id == org_id,
            Location.organization_id == org_id,
            Location.company_id == company_id,
        )
    )
    for pdf_path, ai_metadata in proposal_rows:
        if pdf_path:
            storage_paths.add(pdf_path)
        storage_paths.update(extract_pdf_paths(ai_metadata))

    return storage_paths


async def _lock_company_for_update(db: AsyncDB, org_id: UUID, company_id: UUID) -> Company | None:
    result = await db.execute(
        select(Company)
        .where(Company.id == company_id, Company.organization_id == org_id)
        .with_for_update()
    )
    return result.scalar_one_or_none()


async def _load_company_with_relations(
    db: AsyncDB, org_id: UUID, company_id: UUID
) -> Company | None:
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.locations), selectinload(Company.contacts))
        .where(Company.id == company_id, Company.organization_id == org_id)
    )
    return result.scalar_one_or_none()


def _build_company_contacts_summary(company: Company) -> list[CompanyContactRead]:
    return [
        CompanyContactRead.model_validate(contact, from_attributes=True)
        for contact in (company.contacts or [])
    ]


def _build_locations_summary(
    locations: list[Location],
    project_counts_by_location: dict[UUID, int],
) -> list[LocationSummary]:
    return [
        LocationSummary.model_validate(location, from_attributes=True).model_copy(
            update={"project_count": project_counts_by_location.get(location.id, 0)}
        )
        for location in locations
    ]


async def _build_company_detail_response(
    *,
    db: AsyncDB,
    company: Company,
    current_user: CurrentUser,
    org_id: UUID,
    archived: ArchivedFilter,
) -> CompanyDetail:
    locations = company.locations or []
    if archived != "all":
        locations = [
            location
            for location in locations
            if (location.archived_at is None) == (archived == "active")
        ]

    location_ids = [location.id for location in locations]
    project_counts_by_location = await _get_project_counts_by_location(
        db=db,
        org_id=org_id,
        location_ids=location_ids,
        current_user=current_user,
        archived=archived,
    )

    company_summary = CompanySummary.model_validate(company, from_attributes=True)
    return CompanyDetail(
        **company_summary.model_dump(),
        locations=_build_locations_summary(locations, project_counts_by_location),
        contacts=_build_company_contacts_summary(company),
    )


def _extract_constraint_name(exc: IntegrityError) -> str | None:
    diag = getattr(exc.orig, "diag", None)
    constraint_name = getattr(diag, "constraint_name", None)
    if isinstance(constraint_name, str):
        return constraint_name
    return None


def _is_primary_company_contact_conflict(exc: IntegrityError) -> bool:
    constraint_name = _extract_constraint_name(exc)
    if constraint_name == COMPANY_CONTACT_PRIMARY_UNIQUE_INDEX:
        return True
    return COMPANY_CONTACT_PRIMARY_UNIQUE_INDEX in str(exc)


def _is_identity_check_violation(exc: IntegrityError) -> bool:
    constraint_name = _extract_constraint_name(exc)
    if constraint_name == COMPANY_CONTACT_IDENTITY_CHECK:
        return True
    return COMPANY_CONTACT_IDENTITY_CHECK in str(exc)


def _validate_storage_paths_or_raise_bad_request(storage_paths: set[str]) -> None:
    try:
        validate_storage_keys(storage_paths)
    except StorageDeleteError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


async def _lock_location_for_update(
    db: AsyncDB,
    org_id: UUID,
    location_id: UUID,
) -> Location | None:
    result = await db.execute(
        select(Location)
        .where(Location.id == location_id, Location.organization_id == org_id)
        .with_for_update()
    )
    return result.scalar_one_or_none()


async def _archive_company(
    db: AsyncDB,
    org_id: UUID,
    company_id: UUID,
    user_id: UUID,
) -> SuccessResponse:
    company = await _lock_company_for_update(db=db, org_id=org_id, company_id=company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if company.archived_at is not None:
        return SuccessResponse(message=f"Company {company.name} already archived")

    archived_at = datetime.now(UTC)
    company.archived_at = archived_at
    company.archived_by_user_id = user_id

    location_rows = await db.execute(
        select(Location.id)
        .where(Location.organization_id == org_id, Location.company_id == company_id)
        .order_by(Location.id)
        .with_for_update()
    )
    location_ids = [row.id for row in location_rows]

    if location_ids:
        await db.execute(
            update(Location)
            .where(
                Location.organization_id == org_id,
                Location.company_id == company_id,
                Location.archived_at.is_(None),
            )
            .values(
                archived_at=archived_at,
                archived_by_user_id=user_id,
                archived_by_parent_id=company_id,
            )
        )

        await db.execute(
            select(Project.id)
            .where(Project.organization_id == org_id, Project.location_id.in_(location_ids))
            .order_by(Project.id)
            .with_for_update()
        )
        await db.execute(
            update(Project)
            .where(
                Project.organization_id == org_id,
                Project.location_id.in_(location_ids),
                Project.archived_at.is_(None),
            )
            .values(
                archived_at=archived_at,
                archived_by_user_id=user_id,
                archived_by_parent_id=Project.location_id,
            )
        )

    await db.commit()
    return SuccessResponse(message=f"Company {company.name} archived successfully")


async def _restore_company(
    db: AsyncDB,
    org_id: UUID,
    company_id: UUID,
) -> SuccessResponse:
    company = await _lock_company_for_update(db=db, org_id=org_id, company_id=company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if company.archived_at is None:
        return SuccessResponse(message=f"Company {company.name} already active")

    company.archived_at = None
    company.archived_by_user_id = None

    location_rows = await db.execute(
        select(Location.id)
        .where(
            Location.organization_id == org_id,
            Location.archived_by_parent_id == company_id,
        )
        .order_by(Location.id)
        .with_for_update()
    )
    location_ids = [row.id for row in location_rows]

    if location_ids:
        await db.execute(
            update(Location)
            .where(
                Location.organization_id == org_id,
                Location.archived_by_parent_id == company_id,
            )
            .values(
                archived_at=None,
                archived_by_user_id=None,
                archived_by_parent_id=None,
            )
        )

        await db.execute(
            select(Project.id)
            .where(
                Project.organization_id == org_id,
                Project.archived_by_parent_id.in_(location_ids),
            )
            .order_by(Project.id)
            .with_for_update()
        )
        await db.execute(
            update(Project)
            .where(
                Project.organization_id == org_id,
                Project.archived_by_parent_id.in_(location_ids),
            )
            .values(
                archived_at=None,
                archived_by_user_id=None,
                archived_by_parent_id=None,
            )
        )

    await db.commit()
    return SuccessResponse(message=f"Company {company.name} restored successfully")


async def _archive_location(
    db: AsyncDB,
    org_id: UUID,
    location_id: UUID,
    user_id: UUID,
) -> SuccessResponse:
    location = await _lock_location_for_update(db=db, org_id=org_id, location_id=location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    if location.archived_at is not None:
        return SuccessResponse(message=f"Location {location.name} already archived")

    archived_at = datetime.now(UTC)
    location.archived_at = archived_at
    location.archived_by_user_id = user_id
    location.archived_by_parent_id = None

    await db.execute(
        select(Project.id)
        .where(Project.organization_id == org_id, Project.location_id == location_id)
        .order_by(Project.id)
        .with_for_update()
    )
    await db.execute(
        update(Project)
        .where(
            Project.organization_id == org_id,
            Project.location_id == location_id,
            Project.archived_at.is_(None),
        )
        .values(
            archived_at=archived_at,
            archived_by_user_id=user_id,
            archived_by_parent_id=location_id,
        )
    )

    await db.commit()
    return SuccessResponse(message=f"Location {location.name} archived successfully")


async def _restore_location(
    db: AsyncDB,
    org_id: UUID,
    location_id: UUID,
) -> SuccessResponse:
    location = await _lock_location_for_update(db=db, org_id=org_id, location_id=location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    if location.archived_at is None:
        return SuccessResponse(message=f"Location {location.name} already active")

    location.archived_at = None
    location.archived_by_user_id = None
    location.archived_by_parent_id = None

    await db.execute(
        select(Project.id)
        .where(
            Project.organization_id == org_id,
            Project.archived_by_parent_id == location_id,
        )
        .order_by(Project.id)
        .with_for_update()
    )
    await db.execute(
        update(Project)
        .where(
            Project.organization_id == org_id,
            Project.archived_by_parent_id == location_id,
        )
        .values(
            archived_at=None,
            archived_by_user_id=None,
            archived_by_parent_id=None,
        )
    )

    await db.commit()
    return SuccessResponse(message=f"Location {location.name} restored successfully")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPANIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/", response_model=list[CompanySummary])
async def list_companies(
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
    archived: ArchivedFilter = "active",
):
    """List all companies."""
    query = select(Company).where(Company.organization_id == org.id)
    query = apply_archived_filter(query, Company, archived).order_by(Company.name)
    result = await db.execute(query)
    companies = result.scalars().all()
    return companies


@router.post("/", response_model=CompanyDetail, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    db: AsyncDB,
    current_user: CurrentCompanyCreator,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Create a new company."""
    company = Company(
        # BaseSchema serializes with camelCase by default; ORM expects snake_case field names.
        **company_data.model_dump(by_alias=False),
        organization_id=org.id,
        created_by_user_id=current_user.id,
    )
    db.add(company)
    await db.commit()
    loaded_company = await _load_company_with_relations(db, org.id, company.id)
    if not loaded_company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return await _build_company_detail_response(
        db=db,
        company=loaded_company,
        current_user=current_user,
        org_id=org.id,
        archived="active",
    )


# NOTE: This route MUST be before /{company_id} to avoid "locations" being parsed as UUID
@router.get("/locations", response_model=list[LocationSummary])
async def list_all_locations(
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
    company_id: UUID | None = None,
    archived: ArchivedFilter = "active",
):
    """List all locations, optionally filtered by company."""
    query = select(Location).where(Location.organization_id == org.id)

    if company_id:
        query = query.where(Location.company_id == company_id)

    query = apply_archived_filter(query, Location, archived).order_by(Location.name)
    result = await db.execute(query)
    locations = result.scalars().all()

    location_ids = [loc.id for loc in locations]
    project_counts_by_location = await _get_project_counts_by_location(
        db=db,
        org_id=org.id,
        location_ids=location_ids,
        current_user=current_user,
        archived=archived,
    )

    return [
        LocationSummary.model_validate(loc, from_attributes=True).model_copy(
            update={"project_count": project_counts_by_location.get(loc.id, 0)}
        )
        for loc in locations
    ]


@router.get("/{company_id}", response_model=CompanyDetail)
async def get_company(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
    archived: ArchivedFilter = "active",
):
    """Get company details with locations."""
    company = await _load_company_with_relations(db, org.id, company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Company {company_id} not found"
        )

    return await _build_company_detail_response(
        db=db,
        company=company,
        current_user=current_user,
        org_id=org.id,
        archived=archived,
    )


@router.put("/{company_id}", response_model=CompanyDetail)
async def update_company(
    company_id: UUID,
    company_data: CompanyUpdate,
    db: AsyncDB,
    current_user_company: ActiveCompanyEditor,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
    archived: ArchivedFilter = "active",
):
    """Update company information."""
    current_user, company = current_user_company

    # Update only provided fields
    update_data = company_data.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        setattr(company, field, value)

    await db.commit()
    loaded_company = await _load_company_with_relations(db, org.id, company.id)
    if not loaded_company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return await _build_company_detail_response(
        db=db,
        company=loaded_company,
        current_user=current_user,
        org_id=org.id,
        archived=archived,
    )


@router.post("/{company_id}/archive", response_model=SuccessResponse)
async def archive_company(
    company: CompanyAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
):
    require_permission(current_user, permissions.COMPANY_ARCHIVE)
    return await _archive_company(
        db=db,
        org_id=org.id,
        company_id=company.id,
        user_id=current_user.id,
    )


@router.post("/{company_id}/restore", response_model=SuccessResponse)
async def restore_company(
    company: CompanyAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
):
    require_permission(current_user, permissions.COMPANY_RESTORE)
    return await _restore_company(
        db=db,
        org_id=org.id,
        company_id=company.id,
    )


@router.post("/{company_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def purge_company(
    company: CompanyAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
    payload: dict[str, str] | None = None,
):
    require_permission(current_user, permissions.COMPANY_PURGE)
    confirm_name = extract_confirm_name(payload)
    if not confirm_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="confirm_name is required"
        )
    if confirm_name != company.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="confirm_name does not match"
        )

    locked_company = await _lock_company_for_update(
        db=db,
        org_id=org.id,
        company_id=company.id,
    )
    if not locked_company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    if locked_company.archived_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company must be archived before purge",
        )

    storage_paths = await _collect_company_storage_paths(
        db=db,
        org_id=org.id,
        company_id=company.id,
    )
    _validate_storage_paths_or_raise_bad_request(storage_paths)

    await db.delete(locked_company)
    await db.commit()

    try:
        await delete_storage_keys(storage_paths)
    except Exception as exc:
        logger.warning("company_purge_storage_delete_failed", error=str(exc))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{company_id}", response_model=SuccessResponse)
async def delete_company(
    db: AsyncDB,
    company: CompanyAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    """
    Archive company (compat).
    """
    require_permission(current_user, permissions.COMPANY_DELETE)
    return await _archive_company(
        db=db,
        org_id=org.id,
        company_id=company.id,
        user_id=current_user.id,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPANY CONTACTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post(
    "/{company_id}/contacts",
    response_model=CompanyContactRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_contact(
    company: ActiveCompanyInScopeDep,
    current_user: CurrentUser,
    contact_data: CompanyContactCreate,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    require_permission(
        current_user,
        permissions.COMPANY_CONTACT_CREATE,
        ownership=Ownership.OWN,
        owner_user_id=company.created_by_user_id,
    )
    contact = CompanyContact(
        **contact_data.model_dump(by_alias=False),
        organization_id=org.id,
        company_id=company.id,
    )
    db.add(contact)
    try:
        await db.flush()
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if _is_primary_company_contact_conflict(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=PRIMARY_CONTACT_CONFLICT_DETAIL,
            ) from None
        if _is_identity_check_violation(exc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one of name, email, or phone is required",
            ) from None
        raise
    await db.refresh(contact)
    return CompanyContactRead.model_validate(contact, from_attributes=True)


@router.put("/{company_id}/contacts/{contact_id}", response_model=CompanyContactRead)
async def update_company_contact(
    company: ActiveCompanyInScopeDep,
    current_user: CurrentUser,
    contact_id: UUID,
    contact_data: CompanyContactUpdate,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    require_permission(
        current_user,
        permissions.COMPANY_CONTACT_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=company.created_by_user_id,
    )
    result = await db.execute(
        select(CompanyContact).where(
            CompanyContact.id == contact_id,
            CompanyContact.company_id == company.id,
            CompanyContact.organization_id == org.id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company contact {contact_id} not found",
        )

    update_data = contact_data.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        setattr(contact, field, value)

    try:
        await db.flush()
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if _is_primary_company_contact_conflict(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=PRIMARY_CONTACT_CONFLICT_DETAIL,
            ) from None
        if _is_identity_check_violation(exc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one of name, email, or phone is required",
            ) from None
        raise

    await db.refresh(contact)
    return CompanyContactRead.model_validate(contact, from_attributes=True)


@router.delete("/{company_id}/contacts/{contact_id}", response_model=SuccessResponse)
async def delete_company_contact(
    company: ActiveCompanyInScopeDep,
    current_user: CurrentUser,
    contact_id: UUID,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    require_permission(
        current_user,
        permissions.COMPANY_CONTACT_DELETE,
        ownership=Ownership.OWN,
        owner_user_id=company.created_by_user_id,
    )
    result = await db.execute(
        select(CompanyContact).where(
            CompanyContact.id == contact_id,
            CompanyContact.company_id == company.id,
            CompanyContact.organization_id == org.id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company contact {contact_id} not found",
        )

    await db.delete(contact)
    await db.commit()
    return SuccessResponse(message=f"Contact {contact.name or contact.id} deleted successfully")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCATION CONTACTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post(
    "/locations/{location_id}/contacts",
    response_model=LocationContactRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_location_contact(
    location: ActiveLocationDep,
    contact_data: LocationContactCreate,
    db: AsyncDB,
    current_user: CurrentLocationContactsCreator,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Create a contact for a location."""
    contact = LocationContact(
        # BaseSchema serializes with camelCase by default; ORM expects snake_case field names.
        **contact_data.model_dump(by_alias=False),
        organization_id=org.id,
        location_id=location.id,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return LocationContactRead.model_validate(contact, from_attributes=True)


@router.put(
    "/locations/{location_id}/contacts/{contact_id}",
    response_model=LocationContactRead,
)
async def update_location_contact(
    location: ActiveLocationDep,
    contact_id: UUID,
    contact_data: LocationContactUpdate,
    db: AsyncDB,
    current_user: CurrentLocationContactsEditor,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Update a contact for a location."""
    result = await db.execute(
        select(LocationContact).where(
            LocationContact.id == contact_id,
            LocationContact.location_id == location.id,
            LocationContact.organization_id == org.id,
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location contact {contact_id} not found",
        )

    update_data = contact_data.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    return LocationContactRead.model_validate(contact, from_attributes=True)


@router.delete(
    "/locations/{location_id}/contacts/{contact_id}",
    response_model=SuccessResponse,
)
async def delete_location_contact(
    location: ActiveLocationDep,
    contact_id: UUID,
    db: AsyncDB,
    current_user: CurrentLocationContactsDeleter,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    """Delete a contact from a location."""
    result = await db.execute(
        select(LocationContact).where(
            LocationContact.id == contact_id,
            LocationContact.location_id == location.id,
            LocationContact.organization_id == org.id,
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location contact {contact_id} not found",
        )

    await db.delete(contact)
    await db.commit()

    return SuccessResponse(message=f"Contact {contact.name} deleted successfully")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# INCOMING MATERIALS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get(
    "/locations/{location_id}/incoming-materials",
    response_model=list[IncomingMaterialRead],
)
async def list_incoming_materials(
    location: ActiveLocationDep,
    db: AsyncDB,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
):
    """List all incoming materials for a location."""
    result = await db.execute(
        select(IncomingMaterial)
        .where(
            IncomingMaterial.location_id == location.id,
            IncomingMaterial.organization_id == org.id,
        )
        .order_by(IncomingMaterial.name)
    )
    materials = result.scalars().all()
    return [IncomingMaterialRead.model_validate(m, from_attributes=True) for m in materials]


@router.post(
    "/locations/{location_id}/incoming-materials",
    response_model=IncomingMaterialRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_incoming_material(
    location: ActiveLocationDep,
    material_data: IncomingMaterialCreate,
    db: AsyncDB,
    current_user: CurrentIncomingMaterialsCreator,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Create an incoming material for a location."""
    material = IncomingMaterial(
        **material_data.model_dump(by_alias=False),
        organization_id=org.id,
        location_id=location.id,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return IncomingMaterialRead.model_validate(material, from_attributes=True)


@router.put(
    "/locations/{location_id}/incoming-materials/{material_id}",
    response_model=IncomingMaterialRead,
)
async def update_incoming_material(
    location: ActiveLocationDep,
    material_id: UUID,
    material_data: IncomingMaterialUpdate,
    db: AsyncDB,
    current_user: CurrentIncomingMaterialsEditor,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Update an incoming material for a location."""
    result = await db.execute(
        select(IncomingMaterial).where(
            IncomingMaterial.id == material_id,
            IncomingMaterial.location_id == location.id,
            IncomingMaterial.organization_id == org.id,
        )
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incoming material {material_id} not found",
        )

    update_data = material_data.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        setattr(material, field, value)

    await db.commit()
    await db.refresh(material)
    return IncomingMaterialRead.model_validate(material, from_attributes=True)


@router.delete(
    "/locations/{location_id}/incoming-materials/{material_id}",
    response_model=SuccessResponse,
)
async def delete_incoming_material(
    location: ActiveLocationDep,
    material_id: UUID,
    db: AsyncDB,
    current_user: CurrentIncomingMaterialsDeleter,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    """Delete an incoming material from a location."""
    result = await db.execute(
        select(IncomingMaterial).where(
            IncomingMaterial.id == material_id,
            IncomingMaterial.location_id == location.id,
            IncomingMaterial.organization_id == org.id,
        )
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incoming material {material_id} not found",
        )

    await db.delete(material)
    await db.commit()

    return SuccessResponse(message=f"Incoming material {material.name} deleted successfully")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCATIONS (nested under companies)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/{company_id}/locations", response_model=list[LocationSummary])
async def list_company_locations(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
    archived: ArchivedFilter = "active",
):
    """List all locations for a company."""
    company = await db.get(Company, company_id)
    if not company or company.organization_id != org.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    return await list_all_locations(
        db=db,
        current_user=current_user,
        org=org,
        _rate_limit=_rate_limit,
        company_id=company_id,
        archived=archived,
    )


@router.post(
    "/{company_id}/locations",
    response_model=LocationSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_location(
    company_id: UUID,
    location_data: LocationCreate,
    db: AsyncDB,
    current_user_company: ActiveCompanyLocationCreator,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Create a new location for a company."""
    current_user, _company = current_user_company

    # Override company_id from URL (security)
    location_dict = location_data.model_dump(by_alias=False)
    location_dict["company_id"] = company_id

    location = Location(
        **location_dict,
        organization_id=org.id,
        created_by_user_id=current_user.id,
    )
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


@router.get("/locations/{location_id}", response_model=LocationDetail)
async def get_location(
    location_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
    archived: ArchivedFilter = "active",
):
    """Get location details with company and projects."""
    result = await db.execute(
        select(Location)
        .options(
            selectinload(Location.company),
            selectinload(Location.contacts),
            selectinload(Location.incoming_materials),
        )
        .where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    project_conditions = [
        Project.organization_id == org.id,
        Project.location_id == location.id,
    ]
    if archived == "active":
        project_conditions.append(Project.archived_at.is_(None))
    elif archived == "archived":
        project_conditions.append(Project.archived_at.isnot(None))
    if not can(current_user, permissions.PROJECT_PURGE):
        project_conditions.append(Project.user_id == current_user.id)

    projects_result = await db.execute(
        select(Project)
        .options(load_only(Project.id, Project.name, Project.status, Project.created_at))
        .where(*project_conditions)
        .order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()

    company_summary = (
        CompanySummary.model_validate(location.company, from_attributes=True)
        if location.company
        else None
    )

    location_summary = LocationSummary.model_validate(location, from_attributes=True).model_copy(
        update={"project_count": len(projects)}
    )
    contacts_summary = [
        LocationContactRead.model_validate(contact, from_attributes=True)
        for contact in (location.contacts or [])
    ]
    incoming_materials_summary = [
        IncomingMaterialRead.model_validate(material, from_attributes=True)
        for material in (location.incoming_materials or [])
    ]
    return LocationDetail(
        **location_summary.model_dump(),
        company=company_summary,
        projects=[LocationProjectSummary.model_validate(p, from_attributes=True) for p in projects],
        contacts=contacts_summary,
        incoming_materials=incoming_materials_summary,
    )


@router.put("/locations/{location_id}", response_model=LocationDetail)
async def update_location(
    location_id: UUID,
    location_data: LocationUpdate,
    db: AsyncDB,
    current_user_location: ActiveLocationEditor,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
    archived: ArchivedFilter = "active",
):
    """Update location information."""
    current_user, location = current_user_location

    update_data = location_data.model_dump(exclude_unset=True, by_alias=False)
    zip_code_in_payload = "zip_code" in update_data
    if location.zip_code is None and not zip_code_in_payload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ZIP code is required",
        )
    if zip_code_in_payload and update_data["zip_code"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ZIP code is required",
        )

    # Update only provided fields
    for field, value in update_data.items():
        setattr(location, field, value)

    await db.commit()

    result = await db.execute(
        select(Location)
        .options(selectinload(Location.company))
        .where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    project_conditions = [
        Project.organization_id == org.id,
        Project.location_id == location.id,
    ]
    if archived == "active":
        project_conditions.append(Project.archived_at.is_(None))
    elif archived == "archived":
        project_conditions.append(Project.archived_at.isnot(None))
    if not can(current_user, permissions.PROJECT_PURGE):
        project_conditions.append(Project.user_id == current_user.id)

    projects_result = await db.execute(
        select(Project)
        .options(load_only(Project.id, Project.name, Project.status, Project.created_at))
        .where(*project_conditions)
        .order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()

    company_summary = (
        CompanySummary.model_validate(location.company, from_attributes=True)
        if location.company
        else None
    )

    location_summary = LocationSummary.model_validate(location, from_attributes=True).model_copy(
        update={"project_count": len(projects)}
    )
    return LocationDetail(
        **location_summary.model_dump(),
        company=company_summary,
        projects=[
            LocationProjectSummary.model_validate(project, from_attributes=True)
            for project in projects
        ],
    )


@router.post("/locations/{location_id}/archive", response_model=SuccessResponse)
async def archive_location(
    location: LocationAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
):
    require_permission(current_user, permissions.LOCATION_ARCHIVE)
    return await _archive_location(
        db=db,
        org_id=org.id,
        location_id=location.id,
        user_id=current_user.id,
    )


@router.post("/locations/{location_id}/restore", response_model=SuccessResponse)
async def restore_location(
    location: LocationAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
):
    require_permission(current_user, permissions.LOCATION_RESTORE)
    return await _restore_location(
        db=db,
        org_id=org.id,
        location_id=location.id,
    )


@router.post("/locations/{location_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def purge_location(
    location: LocationAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
    payload: dict[str, str] | None = None,
):
    require_permission(current_user, permissions.LOCATION_PURGE)
    confirm_name = extract_confirm_name(payload)
    if not confirm_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="confirm_name is required"
        )
    if confirm_name != location.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="confirm_name does not match"
        )

    locked_location = await _lock_location_for_update(
        db=db,
        org_id=org.id,
        location_id=location.id,
    )
    if not locked_location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    if locked_location.archived_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Location must be archived before purge",
        )

    storage_paths = await _collect_location_storage_paths(
        db=db,
        org_id=org.id,
        location_id=location.id,
    )
    _validate_storage_paths_or_raise_bad_request(storage_paths)

    await db.delete(locked_location)
    await db.commit()

    try:
        await delete_storage_keys(storage_paths)
    except Exception as exc:
        logger.warning("location_purge_storage_delete_failed", error=str(exc))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/locations/{location_id}", response_model=SuccessResponse)
async def delete_location(
    db: AsyncDB,
    location: LocationAdminActionDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    """
    Archive location (compat).
    """
    require_permission(current_user, permissions.LOCATION_DELETE)
    return await _archive_location(
        db=db,
        org_id=org.id,
        location_id=location.id,
        user_id=current_user.id,
    )
