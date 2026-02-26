"""
Pydantic schemas for Location model.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import TYPE_CHECKING, Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema
from app.schemas.incoming_material import IncomingMaterialRead
from app.schemas.location_contact import LocationContactRead

if TYPE_CHECKING:
    from app.schemas.company import CompanySummary


class LocationProjectSummary(BaseSchema):
    """Minimal project summary for location detail views."""

    id: UUID
    name: str
    status: str
    created_at: datetime


class LocationBase(BaseSchema):
    """Base location schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    address: str | None = Field(None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = Field(None, max_length=1000)
    address_type: Literal["headquarters", "pickup", "delivery", "billing"] = "headquarters"
    zip_code: str | None = Field(default=None, max_length=10)

    @field_validator("zip_code")
    @classmethod
    def validate_zip_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if not re.fullmatch(r"\d{5}(-\d{4})?", trimmed):
            raise ValueError("Invalid ZIP format")
        return trimmed


class LocationCreate(LocationBase):
    """Schema for creating a new location."""

    company_id: UUID

    @field_validator("zip_code")
    @classmethod
    def require_zip_code(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("ZIP code is required")
        return value


class LocationUpdate(BaseSchema):
    """Schema for updating a location (all fields optional)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    city: str | None = Field(None, min_length=1, max_length=100)
    state: str | None = Field(None, min_length=1, max_length=100)
    address: str | None = Field(None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = Field(None, max_length=1000)
    address_type: Literal["headquarters", "pickup", "delivery", "billing"] | None = None
    zip_code: str | None = Field(default=None, max_length=10)

    @field_validator("zip_code")
    @classmethod
    def validate_zip_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Invalid ZIP format")
        if not re.fullmatch(r"\d{5}(-\d{4})?", trimmed):
            raise ValueError("Invalid ZIP format")
        return trimmed


class LocationSummary(LocationBase):
    """Location summary (list view)."""

    # Inherits from_attributes=True from BaseSchema

    id: UUID
    company_id: UUID
    full_address: str
    project_count: int = 0
    created_at: datetime
    updated_at: datetime
    created_by_user_id: UUID | None = None
    archived_at: datetime | None = None
    archived_by_user_id: UUID | None = None
    archived_by_parent_id: UUID | None = None


class LocationDetail(LocationSummary):
    """Location detail with company info and projects."""

    company: CompanySummary | None = None
    projects: list[LocationProjectSummary] = Field(default_factory=list)
    contacts: list[LocationContactRead] = Field(default_factory=list)
    incoming_materials: list[IncomingMaterialRead] = Field(default_factory=list)
