"""Single backend authz enforcement path for MVP."""

from __future__ import annotations

from enum import StrEnum
from typing import Any, NoReturn
from uuid import UUID

import structlog
from fastapi import HTTPException, status

from app.authz import permissions
from app.authz.role_permissions import ROLE_PERMISSIONS
from app.models.user import User, UserRole

logger = structlog.get_logger(__name__)


class Ownership(StrEnum):
    ANY = "any"
    OWN = "own"


def error_detail(
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": code, "message": message}
    if details:
        payload["details"] = details
    return payload


def raise_auth_required() -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=error_detail("AUTH_REQUIRED", "Authentication required"),
    )


def raise_bad_request(message: str, *, details: dict[str, Any] | None = None) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=error_detail("BAD_REQUEST", message, details),
    )


def raise_org_header_malformed(*, value: str) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=error_detail(
            "ORG_HEADER_MALFORMED",
            "Malformed X-Organization-Id header",
            {"header": "X-Organization-Id", "value": value},
        ),
    )


def raise_forbidden(
    message: str = "Insufficient permission",
    *,
    details: dict[str, Any] | None = None,
) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=error_detail("FORBIDDEN", message, details),
    )


def raise_org_access_denied(*, org_id: str | None = None) -> NoReturn:
    details = {"organization_id": org_id} if org_id else None
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=error_detail("ORG_ACCESS_DENIED", "No access to organization scope", details),
    )


def raise_resource_not_found(
    message: str = "Resource not found",
    *,
    details: dict[str, Any] | None = None,
) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=error_detail("RESOURCE_NOT_FOUND", message, details),
    )


def effective_role(user: User) -> UserRole:
    if user.is_superuser:
        return UserRole.ADMIN

    raw_role = user.role
    role = raw_role if isinstance(raw_role, UserRole) else UserRole(raw_role)
    return role


def has_any_scope_access(user: User, permission: str) -> bool:
    if permission not in permissions.ALL_PERMISSIONS:
        return False
    granted_permissions = ROLE_PERMISSIONS.get(effective_role(user), frozenset())
    if permission not in granted_permissions:
        return False
    return user.is_superuser or effective_role(user) == UserRole.ORG_ADMIN


def _is_invalid_admin_state(user: User) -> bool:
    raw_role = user.role
    role = raw_role if isinstance(raw_role, UserRole) else UserRole(raw_role)
    return role == UserRole.ADMIN and not user.is_superuser


def permissions_for_user(user: User) -> tuple[str, ...]:
    if user.is_superuser:
        return permissions.ALL_PERMISSIONS
    return tuple(sorted(ROLE_PERMISSIONS.get(effective_role(user), frozenset())))


def can(
    user: User,
    permission: str,
    *,
    ownership: Ownership = Ownership.ANY,
    owner_user_id: UUID | None = None,
) -> bool:
    if _is_invalid_admin_state(user):
        logger.warning(
            "Authorization decision",
            authz_event="authz_invalid_admin_state_denied",
            user_id=str(user.id),
            organization_id=str(user.organization_id) if user.organization_id else None,
            role=UserRole.ADMIN.value,
            is_superuser=False,
            permission=permission,
            ownership=ownership.value,
            owner_user_id=str(owner_user_id) if owner_user_id else None,
        )
        return False

    if permission not in permissions.ALL_PERMISSIONS:
        return False

    granted_permissions = ROLE_PERMISSIONS.get(effective_role(user), frozenset())
    if permission not in granted_permissions:
        return False

    if ownership == Ownership.ANY:
        return True

    if user.is_superuser or effective_role(user) == UserRole.ORG_ADMIN:
        return True

    return owner_user_id is not None and owner_user_id == user.id


def require_permission(
    user: User,
    permission: str,
    *,
    ownership: Ownership = Ownership.ANY,
    owner_user_id: UUID | None = None,
) -> None:
    if _is_invalid_admin_state(user):
        logger.warning(
            "Authorization decision",
            authz_event="authz_invalid_admin_state_denied",
            user_id=str(user.id),
            organization_id=str(user.organization_id) if user.organization_id else None,
            role=UserRole.ADMIN.value,
            is_superuser=False,
            permission=permission,
            ownership=ownership.value,
            owner_user_id=str(owner_user_id) if owner_user_id else None,
        )
        raise_forbidden(
            message="Invalid admin user state",
            details={
                "reason": "admin_role_requires_superuser",
                "permission": permission,
                "ownership": ownership.value,
            },
        )

    allowed = can(
        user,
        permission,
        ownership=ownership,
        owner_user_id=owner_user_id,
    )
    log_fields = {
        "authz_event": "authz_permission_granted" if allowed else "authz_permission_denied",
        "user_id": str(user.id),
        "organization_id": str(user.organization_id) if user.organization_id else None,
        "effective_role": effective_role(user).value,
        "permission": permission,
        "ownership": ownership.value,
        "owner_user_id": str(owner_user_id) if owner_user_id else None,
    }
    if allowed:
        logger.debug("Authorization decision", **log_fields)
        return
    logger.warning("Authorization decision", **log_fields)
    raise_forbidden(
        details={
            "permission": permission,
            "ownership": ownership.value,
        }
    )
