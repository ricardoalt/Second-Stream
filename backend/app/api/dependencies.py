"""
API dependencies for authentication and authorization.

This module now uses FastAPI Users for authentication.
The custom get_current_user is replaced by FastAPI Users dependencies.

Best Practices:
    - Use FastAPI Users dependencies for authentication
    - Type-safe with Annotated
    - Clean and minimal
"""

from datetime import datetime
from typing import Annotated, Literal, Protocol, TypeVar

import structlog
from fastapi import Depends, Header, HTTPException
from sqlalchemy import select

from app.authz import permissions
from app.authz.authz import (
    Ownership,
    has_any_scope_access,
    raise_bad_request,
    raise_org_access_denied,
    raise_org_header_malformed,
    raise_resource_not_found,
    require_permission,
)
from app.core.fastapi_users_instance import (
    current_active_user,
    current_active_user_optional,
    current_superuser,
    current_verified_user,
)
from app.models.company import Company
from app.models.location import Location
from app.models.organization import Organization
from app.models.user import User

logger = structlog.get_logger(__name__)

# ==============================================================================
# FastAPI Users Dependencies
# ==============================================================================
# These replace the custom JWT authentication logic with FastAPI Users
# ==============================================================================

# Type alias for current authenticated user (most common)
# Use in routes that require authentication
CurrentUser = Annotated[User, Depends(current_active_user)]

# Type alias for admin/superuser only routes
# Use in routes that require admin privileges
CurrentSuperUser = Annotated[User, Depends(current_superuser)]

# Type alias for verified users only
# Use in routes that require email verification
CurrentVerifiedUser = Annotated[User, Depends(current_verified_user)]

# Type alias for optional authentication
# Returns None if not authenticated, otherwise returns User

OptionalUser = Annotated[User | None, Depends(current_active_user_optional)]

# ==============================================================================
# Database Dependencies
# ==============================================================================
# Best Practice: Use Annotated for cleaner endpoint signatures
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db

# Type alias for async database session
AsyncDB = Annotated[AsyncSession, Depends(get_async_db)]

# ==============================================================================
# Pagination & Query Parameters
# ==============================================================================
# Standard pagination and search parameters with validation
# ==============================================================================

from uuid import UUID

from fastapi import Query

# Pagination
PageNumber = Annotated[
    int, Query(ge=1, le=1000, description="Page number (1-indexed)", examples=[1])
]

PageSize = Annotated[
    int,
    Query(
        ge=1,
        le=100,
        alias="size",  # Frontend expects 'size' parameter
        description="Items per page (max 100 for performance)",
        examples=[10, 20, 50],
    ),
]

# Search & Filters
SearchQuery = Annotated[
    str | None,
    Query(
        max_length=100,
        description="Search term for name or client (ILIKE search)",
        examples=["Water Treatment", "Municipal"],
    ),
]

StatusFilter = Annotated[
    str | None,
    Query(
        description="Filter by project status", examples=["Active", "In Preparation", "Completed"]
    ),
]

SectorFilter = Annotated[
    str | None,
    Query(description="Filter by sector", examples=["Municipal", "Industrial", "Commercial"]),
]

ArchivedFilter = Annotated[
    Literal["active", "archived", "all"],
    Query(
        description="Filter by archived status",
        examples=["active", "archived", "all"],
    ),
]

# ==============================================================================
# Project Access Dependency
# ==============================================================================
# Centralizes project loading + access check (replaces 22+ repeated patterns)
# ==============================================================================

from fastapi import Path

from app.models.project import Project

# ==============================================================================
# Organization Context Dependency (Multi-tenant)
# ==============================================================================


async def get_organization_context(
    current_user: User = Depends(current_active_user),
    x_organization_id: str | None = Header(None, alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_async_db),
) -> Organization:
    """
    Resolve organization context for the request.

    - Regular users: use their organization_id (ignore header)
    - Super admins: must provide X-Organization-Id header
    """
    if not current_user.is_superuser:
        if not current_user.organization_id:
            raise HTTPException(status_code=403, detail="User not assigned to any organization")
        org = await db.get(Organization, current_user.organization_id)
        if not org or not org.is_active:
            raise HTTPException(status_code=403, detail="User's organization is inactive")
        return org

    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=500,
            detail="Invalid admin state: superuser has organization_id",
        )

    if x_organization_id is None:
        raise_bad_request("Super admin must select organization via X-Organization-Id header")
    org_header = x_organization_id
    assert org_header is not None

    try:
        org_id = UUID(org_header)
    except ValueError:
        raise_org_header_malformed(value=org_header)

    org = await db.get(Organization, org_id)
    if org is None or not org.is_active:
        raise_org_access_denied(org_id=str(org_id))
    assert org is not None

    return org


OrganizationContext = Annotated[Organization, Depends(get_organization_context)]


async def get_current_user_organization(
    current_user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> Organization:
    """
    Resolve organization context for non-superusers only.

    This mirrors the non-superuser branch of get_organization_context and
    explicitly blocks superusers to keep error semantics clear.
    """
    if current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superadmins cannot submit feedback")
    if not current_user.organization_id:
        raise HTTPException(status_code=403, detail="User not assigned to any organization")
    org = await db.get(Organization, current_user.organization_id)
    if not org or not org.is_active:
        raise HTTPException(status_code=403, detail="User's organization is inactive")
    return org


CurrentUserOrganization = Annotated[Organization, Depends(get_current_user_organization)]


def apply_organization_filter(query, model, org: Organization):
    """Filter query by organization_id."""
    return query.where(model.organization_id == org.id)


class Archivable(Protocol):
    archived_at: datetime | None


ArchivableT = TypeVar("ArchivableT", bound=Archivable)


def require_not_archived(entity: ArchivableT) -> ArchivableT:
    if entity.archived_at is not None:
        raise HTTPException(status_code=409, detail=f"{type(entity).__name__} is archived")
    return entity


async def _load_company_in_scope_or_raise(
    *,
    db: AsyncSession,
    company_id: UUID,
    org: Organization,
) -> Company:
    result = await db.execute(
        select(Company).where(
            Company.id == company_id,
            Company.organization_id == org.id,
        )
    )
    company = result.scalar_one_or_none()
    if company is not None:
        return company
    cross_tenant_probe = await db.get(Company, company_id)
    if cross_tenant_probe is not None:
        raise_org_access_denied(org_id=str(org.id))
    raise_resource_not_found("Company not found", details={"company_id": str(company_id)})


async def _load_location_in_scope_or_raise(
    *,
    db: AsyncSession,
    location_id: UUID,
    org: Organization,
) -> Location:
    result = await db.execute(
        select(Location).where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()
    if location is not None:
        return location
    cross_tenant_probe = await db.get(Location, location_id)
    if cross_tenant_probe is not None:
        raise_org_access_denied(org_id=str(org.id))
    raise_resource_not_found("Location not found", details={"location_id": str(location_id)})


async def _load_project_in_scope_or_raise(
    *,
    db: AsyncSession,
    project_id: UUID,
    org: Organization,
) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == org.id,
        )
    )
    project = result.scalar_one_or_none()
    if project is not None:
        return project
    cross_tenant_probe = await db.get(Project, project_id)
    if cross_tenant_probe is not None:
        raise_org_access_denied(org_id=str(org.id))
    raise_resource_not_found("Project not found", details={"project_id": str(project_id)})


def apply_archived_filter(query, model, archived: Literal["active", "archived", "all"]):
    if archived == "active":
        return query.where(model.archived_at.is_(None))
    if archived == "archived":
        return query.where(model.archived_at.isnot(None))
    return query


async def get_super_admin_only(
    current_user: User = Depends(current_active_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super admin only")
    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=500, detail="Invalid admin state: superuser has organization_id"
        )
    return current_user


SuperAdminOnly = Annotated[User, Depends(get_super_admin_only)]


def require_permission_dependency(permission: str, *, ownership: Ownership = Ownership.ANY):
    async def _dependency(
        current_user: User = Depends(current_active_user),
        _org: Organization = Depends(get_organization_context),
    ) -> User:
        require_permission(current_user, permission, ownership=ownership)
        return current_user

    return _dependency


CurrentProjectCreator = Annotated[
    User, Depends(require_permission_dependency(permissions.PROJECT_CREATE))
]

CurrentProjectDeleter = Annotated[
    User, Depends(require_permission_dependency(permissions.PROJECT_DELETE))
]

CurrentCompanyCreator = Annotated[
    User, Depends(require_permission_dependency(permissions.COMPANY_CREATE))
]


async def get_current_company_editor(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    company = await _load_company_in_scope_or_raise(
        db=db,
        company_id=company_id,
        org=org,
    )

    require_permission(
        current_user,
        permissions.COMPANY_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=company.created_by_user_id,
    )

    return current_user, company


CurrentCompanyEditor = Annotated[tuple[User, Company], Depends(get_current_company_editor)]


async def get_active_company_editor(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    current_user, company = await get_current_company_editor(
        company_id=company_id,
        current_user=current_user,
        org=org,
        db=db,
    )
    return current_user, require_not_archived(company)


ActiveCompanyEditor = Annotated[tuple[User, Company], Depends(get_active_company_editor)]


async def get_active_company_in_scope(
    company_id: UUID,
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Company:
    company = await _load_company_in_scope_or_raise(
        db=db,
        company_id=company_id,
        org=org,
    )
    return require_not_archived(company)


ActiveCompanyInScopeDep = Annotated[Company, Depends(get_active_company_in_scope)]


CurrentCompanyDeleter = Annotated[
    User, Depends(require_permission_dependency(permissions.COMPANY_DELETE))
]


CurrentLocationCreator = Annotated[
    User, Depends(require_permission_dependency(permissions.LOCATION_CREATE))
]


async def get_current_company_location_creator(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    company = await _load_company_in_scope_or_raise(
        db=db,
        company_id=company_id,
        org=org,
    )

    require_permission(current_user, permissions.LOCATION_CREATE)

    return current_user, company


CurrentCompanyLocationCreator = Annotated[
    tuple[User, Company], Depends(get_current_company_location_creator)
]


async def get_active_company_location_creator(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    current_user, company = await get_current_company_location_creator(
        company_id=company_id,
        current_user=current_user,
        org=org,
        db=db,
    )
    return current_user, require_not_archived(company)


ActiveCompanyLocationCreator = Annotated[
    tuple[User, Company], Depends(get_active_company_location_creator)
]


async def get_current_location_editor(
    location_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Location]:
    location = await _load_location_in_scope_or_raise(
        db=db,
        location_id=location_id,
        org=org,
    )

    require_permission(
        current_user,
        permissions.LOCATION_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=location.created_by_user_id,
    )

    return current_user, location


CurrentLocationEditor = Annotated[tuple[User, Location], Depends(get_current_location_editor)]


async def get_active_location_editor(
    location_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Location]:
    current_user, location = await get_current_location_editor(
        location_id=location_id,
        current_user=current_user,
        org=org,
        db=db,
    )
    return current_user, require_not_archived(location)


ActiveLocationEditor = Annotated[tuple[User, Location], Depends(get_active_location_editor)]


CurrentLocationDeleter = Annotated[
    User, Depends(require_permission_dependency(permissions.LOCATION_DELETE))
]


CurrentLocationContactsCreator = Annotated[
    User, Depends(require_permission_dependency(permissions.LOCATION_CONTACT_CREATE))
]


CurrentLocationContactsEditor = Annotated[
    User, Depends(require_permission_dependency(permissions.LOCATION_CONTACT_UPDATE))
]


CurrentLocationContactsDeleter = Annotated[
    User, Depends(require_permission_dependency(permissions.LOCATION_CONTACT_DELETE))
]


CurrentIncomingMaterialsCreator = Annotated[
    User, Depends(require_permission_dependency(permissions.INCOMING_MATERIAL_CREATE))
]


CurrentIncomingMaterialsEditor = Annotated[
    User, Depends(require_permission_dependency(permissions.INCOMING_MATERIAL_UPDATE))
]


CurrentIncomingMaterialsDeleter = Annotated[
    User, Depends(require_permission_dependency(permissions.INCOMING_MATERIAL_DELETE))
]


CurrentBulkImportUser = Annotated[
    User, Depends(require_permission_dependency(permissions.BULK_IMPORT_MANAGE))
]


async def get_active_location(
    location_id: UUID,
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Location:
    location = await _load_location_in_scope_or_raise(
        db=db,
        location_id=location_id,
        org=org,
    )

    return require_not_archived(location)


ActiveLocationDep = Annotated[Location, Depends(get_active_location)]


async def get_company_admin_action(
    company_id: UUID,
    _current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Company:
    return await _load_company_in_scope_or_raise(
        db=db,
        company_id=company_id,
        org=org,
    )


CompanyAdminActionDep = Annotated[Company, Depends(get_company_admin_action)]


async def get_location_admin_action(
    location_id: UUID,
    _current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Location:
    return await _load_location_in_scope_or_raise(
        db=db,
        location_id=location_id,
        org=org,
    )


LocationAdminActionDep = Annotated[Location, Depends(get_location_admin_action)]


async def get_project_archive_action(
    project_id: UUID = Path(..., description="Project unique identifier"),
    _current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    project = await _load_project_in_scope_or_raise(
        db=db,
        project_id=project_id,
        org=org,
    )
    return project


ProjectArchiveActionDep = Annotated[Project, Depends(get_project_archive_action)]


async def get_project_purge_action(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    require_permission(current_user, permissions.PROJECT_PURGE)
    return await _load_project_in_scope_or_raise(
        db=db,
        project_id=project_id,
        org=org,
    )


ProjectPurgeActionDep = Annotated[Project, Depends(get_project_purge_action)]


async def get_accessible_project(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    """
    Load a project ensuring the user has access.

    Read access rules:
    - Superusers + org admins can access all org projects
    - Other users can access their own projects only
    - Returns 404 for no-access to avoid leaking existence on read paths
    """
    project = await _load_project_with_access(
        project_id=project_id,
        current_user=current_user,
        org=org,
        db=db,
    )
    if project is None:
        raise_resource_not_found("Project not found", details={"project_id": str(project_id)})
    assert project is not None

    return project


async def _load_project_in_scope(
    project_id: UUID,
    org: Organization,
    db: AsyncSession,
) -> Project | None:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == org.id,
        )
    )
    return result.scalar_one_or_none()


async def _load_project_with_access(
    project_id: UUID,
    current_user: User,
    org: Organization,
    db: AsyncSession,
) -> Project | None:
    conditions = [
        Project.id == project_id,
        Project.organization_id == org.id,
    ]
    if not has_any_scope_access(current_user, permissions.PROJECT_READ):
        conditions.append(Project.user_id == current_user.id)
    result = await db.execute(select(Project).where(*conditions))
    return result.scalar_one_or_none()


# Type alias for project with access check
# Use in routes that need a validated project from path parameter
ProjectDep = Annotated[Project, Depends(get_accessible_project)]


async def get_active_project(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    project = await _load_project_with_access(
        project_id=project_id,
        current_user=current_user,
        org=org,
        db=db,
    )

    if project is None:
        raise_resource_not_found("Project not found", details={"project_id": str(project_id)})
    assert project is not None

    return require_not_archived(project)


ActiveProjectDep = Annotated[Project, Depends(get_active_project)]


async def get_active_project_data_editor(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    project = await _load_project_in_scope_or_raise(
        project_id=project_id,
        org=org,
        db=db,
    )
    require_permission(
        current_user,
        permissions.PROJECT_DATA_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    return require_not_archived(project)


ActiveProjectDataEditorDep = Annotated[Project, Depends(get_active_project_data_editor)]

# ==============================================================================
# Usage Examples
# ==============================================================================
#
# @router.get("/protected")
# async def protected_route(user: CurrentUser):
#     return {"user_id": user.id}
#
# @router.get("/admin")
# async def admin_route(user: CurrentSuperUser):
#     return {"admin": user.email}
#
# @router.get("/verified-only")
# async def verified_route(user: CurrentVerifiedUser):
#     return {"verified": user.email}
#
# @router.get("/optional-auth")
# async def optional_route(user: OptionalUser):
#     if user:
#         return {"authenticated": True}
#     return {"authenticated": False}
# ==============================================================================


# ==============================================================================
# Rate Limiting Dependency (User-Based)
# ==============================================================================
# Uses Redis INCR/EXPIRE pattern (same as auth middleware in main.py)
# Each authenticated user gets their own rate limit bucket
# ==============================================================================

from collections.abc import Callable

from fastapi import Request

# Valid period suffixes and their TTL in seconds
_PERIOD_SECONDS = {
    "minute": 60,
    "hour": 3600,
}


def rate_limit_user(limit: str = "60/minute") -> Callable:
    """
    User-based rate limiting dependency using Redis.

    Args:
        limit: Rate limit string like "60/minute" or "100/hour"

    Usage:
        @router.get("/projects")
        async def list_projects(
            user: CurrentUser,
            _rate_check: None = Depends(rate_limit_user("60/minute"))
        ):
            ...

    Key: rate_limit:<route>:user:<user_id>

    Benefits over IP-based:
        - Each user gets their own quota
        - No shared pool behind load balancer
        - Works correctly in ECS/ALB environments
    """
    # Fail-fast: validate limit format
    try:
        count_str, period = limit.split("/")
        max_requests = int(count_str)
        ttl_seconds = _PERIOD_SECONDS[period]
    except (ValueError, KeyError) as e:
        raise ValueError(
            f"Invalid rate limit format '{limit}'. "
            f"Expected format: '<count>/<period>' where period is 'minute' or 'hour'. "
            f"Example: '60/minute'"
        ) from e

    async def _rate_limit_check(
        request: Request,
        current_user: User = Depends(current_active_user),
    ) -> None:
        from app.services.cache_service import cache_service

        # Use route template (e.g., /projects/{project_id}) not actual URL path
        # This ensures /projects/abc and /projects/xyz share the same bucket
        route = request.scope.get("route")
        route_template = route.path if route else request.url.path
        cache_key = f"rate_limit:{route_template}:user:{current_user.id}"

        if cache_service._redis:
            try:
                current_count = await cache_service._redis.incr(cache_key)
                current_count_value = int(current_count)

                # Set TTL on first request
                if current_count_value == 1:
                    await cache_service._redis.expire(cache_key, ttl_seconds)

                if current_count_value > max_requests:
                    logger.warning(
                        "User rate limit exceeded",
                        user_id=str(current_user.id),
                        path=route_template,
                        count=current_count_value,
                        limit=max_requests,
                    )
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "message": "Too many requests. Please try again later.",
                            "code": "RATE_LIMITED",
                        },
                        headers={"Retry-After": str(ttl_seconds)},
                    )
            except HTTPException:
                raise  # Re-raise rate limit error
            except Exception as e:
                # Fail open: don't block if Redis fails
                logger.warning(f"Rate limit check failed, allowing request: {e}")
        else:
            # No Redis: fail open (allow request)
            pass

    return _rate_limit_check


# Type aliases for rate-limited dependencies (DRY: reuse in endpoint signatures)
# Reads: 300/min, Writes: 30/min, Expensive: 10/min
RateLimitUser300 = Annotated[None, Depends(rate_limit_user("300/minute"))]
RateLimitUser60 = Annotated[None, Depends(rate_limit_user("60/minute"))]
RateLimitUser30 = Annotated[None, Depends(rate_limit_user("30/minute"))]
RateLimitUser10 = Annotated[None, Depends(rate_limit_user("10/minute"))]
