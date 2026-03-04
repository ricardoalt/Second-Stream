"""Admin endpoints for managing users (list, create, update)."""

from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi_users.exceptions import UserAlreadyExists
from sqlalchemy import select

from app.api.dependencies import AsyncDB, CurrentSuperUser, CurrentUser
from app.authz import permissions
from app.authz.authz import require_permission
from app.core.user_manager import UserManager, get_user_manager
from app.models.user import User
from app.schemas.admin_user_transfer import (
    TransferUserOrganizationRequest,
    TransferUserOrganizationResponse,
)
from app.schemas.user_fastapi import UserCreate, UserRead, UserUpdate
from app.services.admin_user_transfer_service import (
    TransferOrganizationError,
    transfer_user_organization,
)

router = APIRouter()
logger = structlog.get_logger(__name__)

# Import rate limiter
from typing import Annotated

from app.main import limiter


@router.get("", response_model=list[UserRead], summary="List platform admins")
@limiter.limit("60/minute")
async def list_platform_admins(
    request: Request,
    current_user: CurrentUser,
    db: AsyncDB,
):
    """Return platform admins (superusers without organization) ordered by most recent."""
    require_permission(current_user, permissions.ADMIN_USER_READ)
    result = await db.execute(
        select(User)
        .where(User.is_superuser.is_(True))
        .where(User.organization_id.is_(None))
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


class AdminCreateUserRequest(UserCreate):
    """Extend UserCreate for admin user creation."""

    is_superuser: bool = True
    role: str = "admin"  # Platform admin role


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_user(
    request: Request,
    payload: AdminCreateUserRequest,
    current_admin: CurrentSuperUser,
    user_manager: Annotated[UserManager, Depends(get_user_manager)],
):
    """Create a user with the provided credentials (admin only)."""
    require_permission(current_admin, permissions.ADMIN_USER_CREATE)
    if payload.is_superuser is not True or payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform admins must be created with role=admin and is_superuser=true",
        )
    try:
        return await user_manager.create(payload)
    except UserAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "USER_ALREADY_EXISTS",
                "message": "A user with this email already exists in this organization.",
                "details": {"email": payload.email},
            },
        ) from exc


class AdminUpdateUserRequest(UserUpdate):
    """Allow partial updates including role changes."""

    is_superuser: bool | None = None
    is_active: bool | None = None
    password: str | None = None
    role: str | None = None


@router.patch("/{user_id}", response_model=UserRead)
@limiter.limit("20/minute")
async def update_user(
    request: Request,
    user_id: UUID,
    updates: AdminUpdateUserRequest,
    current_admin: CurrentSuperUser,
    db: AsyncDB,
    user_manager: Annotated[UserManager, Depends(get_user_manager)],
):
    """Update user fields (role, status, password)."""
    require_permission(current_admin, permissions.ADMIN_USER_UPDATE)
    user = await user_manager.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use organization provisioning endpoint for tenant users",
        )

    update_data = updates.model_dump(exclude_unset=True, by_alias=False)
    requested_role = update_data.get("role")
    requested_is_superuser = update_data.get("is_superuser")
    will_be_active = update_data.get("is_active", user.is_active)

    if requested_is_superuser is False or (
        requested_role is not None and requested_role != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform admins cannot be demoted via admin endpoint",
        )

    will_be_superuser = user.is_superuser
    if requested_role is not None:
        will_be_superuser = requested_role == "admin"
    elif requested_is_superuser is not None:
        will_be_superuser = requested_is_superuser is True
    if requested_is_superuser is False:
        will_be_superuser = False

    # Self-protection: admins cannot demote or deactivate themselves
    if user.id == current_admin.id:
        if requested_is_superuser is False or (
            requested_role is not None and requested_role != "admin"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot remove their own admin role",
            )
        if will_be_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot deactivate their own account",
            )

    # Prevent leaving the system without at least one active admin
    removing_admin_role = user.is_superuser and will_be_superuser is False
    deactivating_admin = user.is_superuser and user.is_active and will_be_active is False

    if removing_admin_role or deactivating_admin:
        result = await db.execute(
            select(User.id)
            .where(User.is_superuser.is_(True))
            .where(User.id != user.id)
            .where(User.is_active.is_(True))
            .limit(1)
        )
        other_admin_exists = result.first() is not None
        if not other_admin_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one other active admin is required",
            )

    # FastAPI Users expects a UserUpdate Pydantic model as first argument
    # and the existing User instance as second argument
    return await user_manager.update(updates, user)


@router.post(
    "/{user_id}/transfer-organization",
    response_model=TransferUserOrganizationResponse,
)
@limiter.limit("20/minute")
async def transfer_user_to_organization(
    request: Request,
    user_id: UUID,
    payload: TransferUserOrganizationRequest,
    current_user: CurrentUser,
    db: AsyncDB,
):
    request_id = request.headers.get("x-request-id")
    require_permission(current_user, permissions.ADMIN_USER_TRANSFER)

    try:
        transfer_result = await transfer_user_organization(
            db=db,
            user_id=user_id,
            payload=payload,
        )
    except TransferOrganizationError as exc:
        logger.warning(
            "admin_user_transfer_attempt",
            actor_user_id=str(current_user.id),
            target_user_id=str(user_id),
            to_organization_id=str(payload.target_organization_id),
            reason=payload.reason,
            result="error",
            error_code=exc.code,
            error_details=exc.details,
            request_id=request_id,
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        ) from exc

    logger.info(
        "admin_user_transfer_attempt",
        actor_user_id=str(current_user.id),
        target_user_id=str(user_id),
        from_organization_id=str(transfer_result.from_organization_id),
        to_organization_id=str(transfer_result.to_organization_id),
        reason=payload.reason,
        result="success",
        reassigned_projects_count=transfer_result.reassigned_projects_count,
        request_id=request_id,
    )
    return transfer_result
