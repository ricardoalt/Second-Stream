"""Typed normalized-data contracts for bulk import v1."""

from pydantic import BaseModel, ConfigDict, Field


class NormalizedLocationDataV1(BaseModel):
    """Normalized location payload persisted in import_items.normalized_data."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=500)


class NormalizedProjectDataV1(BaseModel):
    """Normalized project payload persisted in import_items.normalized_data."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    project_type: str = Field(default="Assessment", min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=4000)
    sector: str | None = Field(default=None, max_length=100)
    subsector: str | None = Field(default=None, max_length=100)
    estimated_volume: str | None = Field(default=None, max_length=255)
    volume: str | None = Field(default=None, max_length=255)
    frequency: str | None = Field(default=None, max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    location_name: str | None = Field(default=None, max_length=255)
    location_city: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=100)
    location_address: str | None = Field(default=None, max_length=500)
