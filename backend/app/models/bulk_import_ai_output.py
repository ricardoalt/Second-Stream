"""Structured AI output contract for bulk import extraction."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BulkImportAILocationOutput(BaseModel):
    """Single location extracted by AI."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    confidence: int = Field(ge=0, le=100)
    evidence: list[str] = Field(min_length=1, max_length=10)


class BulkImportAIWasteStreamOutput(BaseModel):
    """Single waste stream extracted by AI."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    location_ref: str | None = Field(default=None, max_length=255)
    suggested_client_name: str | None = Field(default=None, max_length=255)
    suggested_client_confidence: int | None = Field(default=None, ge=0, le=100)
    suggested_client_evidence: list[str] | None = Field(default=None, min_length=1, max_length=10)
    suggested_location_name: str | None = Field(default=None, max_length=255)
    suggested_location_city: str | None = Field(default=None, max_length=100)
    suggested_location_state: str | None = Field(default=None, max_length=100)
    suggested_location_address: str | None = Field(default=None, max_length=500)
    suggested_location_confidence: int | None = Field(default=None, ge=0, le=100)
    suggested_location_evidence: list[str] | None = Field(default=None, min_length=1, max_length=10)
    description: str | None = Field(default=None, max_length=4000)
    volume: str | None = Field(default=None, max_length=255)
    frequency: str | None = Field(default=None, max_length=255)
    units: str | None = Field(default=None, max_length=255)
    volume_summary: str | None = Field(default=None, max_length=255)
    metadata: dict[str, Any] | None = None
    confidence: int = Field(ge=0, le=100)
    evidence: list[str] = Field(min_length=1, max_length=10)


class BulkImportAIOutput(BaseModel):
    """Top-level AI output for bulk import extraction."""

    model_config = ConfigDict(extra="forbid")

    locations: list[BulkImportAILocationOutput] = Field(default_factory=list)
    waste_streams: list[BulkImportAIWasteStreamOutput] = Field(default_factory=list)
