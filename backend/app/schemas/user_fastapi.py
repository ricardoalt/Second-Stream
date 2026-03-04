"""
FastAPI Users schemas for authentication.

These schemas follow FastAPI Users conventions and best practices:
- BaseUser for read operations
- BaseUserCreate for registration
- BaseUserUpdate for profile updates

Best Practices:
    - Type-safe with Pydantic v2
    - Inherits from FastAPI Users base schemas
    - Includes custom H2O Allegiant fields
    - Clear validation and documentation
"""

import uuid

from fastapi_users import schemas
from pydantic import ConfigDict, Field

from app.authz.authz import permissions_for_user
from app.authz.permissions import PERMISSIONS_VERSION
from app.models.user import User


class UserRead(schemas.BaseUser[uuid.UUID]):
    """
    Schema for reading user data.

    Used in:
        - GET /auth/me
        - POST /auth/register (response)
        - GET /users/{id}

    Inherits from BaseUser:
        - id (UUID)
        - email (EmailStr)
        - is_active (bool)
        - is_superuser (bool)
        - is_verified (bool)
    """

    # Role for business logic
    role: str = Field(default="field_agent", description="User role")

    organization_id: uuid.UUID | None = Field(
        default=None,
        description="Organization ID for tenant users (null for platform admins)",
    )

    permissions: list[str] = Field(
        default_factory=list,
        description="Effective org-scoped permissions for UX gating",
    )
    permissions_version: str = Field(
        default=PERMISSIONS_VERSION,
        description="Version string for FE permission cache invalidation",
    )

    # Custom profile fields
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    company_name: str | None = Field(None, description="Company or organization name")
    location: str | None = Field(None, description="User location")
    sector: str | None = Field(None, description="Industry sector")
    subsector: str | None = Field(None, description="Industry subsector")

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_user(
        cls,
        user: User,
        *,
        organization_id: uuid.UUID | None,
        permissions: list[str] | None = None,
    ) -> "UserRead":
        return cls(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            is_verified=user.is_verified,
            role=user.role,
            organization_id=organization_id,
            first_name=user.first_name,
            last_name=user.last_name,
            company_name=user.company_name,
            location=user.location,
            sector=user.sector,
            subsector=user.subsector,
            permissions=permissions
            if permissions is not None
            else list(permissions_for_user(user)),
            permissions_version=PERMISSIONS_VERSION,
        )


class UserCreate(schemas.BaseUserCreate):
    """
    Schema for creating a new user (registration).

    Used in:
        - POST /auth/register

    Inherits from BaseUserCreate:
        - email (EmailStr)
        - password (str)
        - is_active (bool, optional)
        - is_superuser (bool, optional)
        - is_verified (bool, optional)
    """

    # Required custom fields
    first_name: str = Field(..., min_length=1, max_length=100, description="User's first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="User's last name")

    # Optional custom fields
    company_name: str | None = Field(
        None, max_length=255, description="Company or organization name"
    )
    location: str | None = Field(None, max_length=255, description="User location")
    sector: str | None = Field(
        None,
        max_length=100,
        description="Industry sector (Municipal, Industrial, Commercial, Residential)",
    )
    subsector: str | None = Field(None, max_length=100, description="Industry subsector")


class UserUpdate(schemas.BaseUserUpdate):
    """
    Schema for updating user profile.

    Used in:
        - PATCH /users/me
        - PATCH /users/{id}

    Inherits from BaseUserUpdate:
        - password (str, optional)
        - email (EmailStr, optional)
        - is_active (bool, optional)
        - is_superuser (bool, optional)
        - is_verified (bool, optional)

    Best Practice: All fields optional for partial updates
    """

    first_name: str | None = Field(
        None, min_length=1, max_length=100, description="User's first name"
    )
    last_name: str | None = Field(
        None, min_length=1, max_length=100, description="User's last name"
    )
    company_name: str | None = Field(
        None, max_length=255, description="Company or organization name"
    )
    location: str | None = Field(None, max_length=255, description="User location")
    sector: str | None = Field(None, max_length=100, description="Industry sector")
    subsector: str | None = Field(None, max_length=100, description="Industry subsector")
