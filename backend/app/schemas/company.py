"""
Pydantic schemas for Company model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema
from app.schemas.company_contact import CompanyContactRead
from app.schemas.location import LocationSummary


class CompanyBase(BaseSchema):
    """Base company schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    industry: str = Field(..., min_length=1, max_length=100)
    sector: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Sector: commercial, industrial, residential, municipal, other",
    )
    subsector: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Specific subsector within sector (e.g., food_processing, hotel)",
    )
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)
    customer_type: Literal["buyer", "generator", "both"] = "both"
    account_status: Literal["active", "prospect"] = "active"


class CompanyCreate(CompanyBase):
    """Schema for creating a new company."""

    pass


class CompanyUpdate(BaseSchema):
    """Schema for updating a company (all fields optional)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    industry: str | None = Field(None, min_length=1, max_length=100)
    sector: str | None = Field(None, min_length=1, max_length=50)
    subsector: str | None = Field(None, min_length=1, max_length=100)
    notes: str | None = None
    tags: list[str] | None = None
    customer_type: Literal["buyer", "generator", "both"] | None = None
    account_status: Literal["active", "prospect"] | None = None


class CompanySummary(CompanyBase):
    """Company summary (list view)."""

    # Inherits from_attributes=True from BaseSchema

    id: UUID
    location_count: int = 0
    created_at: datetime
    updated_at: datetime
    created_by_user_id: UUID | None = None
    archived_at: datetime | None = None
    archived_by_user_id: UUID | None = None


class CompanyDetail(CompanySummary):
    """Company detail with locations."""

    locations: list[LocationSummary] = Field(default_factory=list)
    contacts: list[CompanyContactRead] = Field(default_factory=list)
