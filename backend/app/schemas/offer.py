"""Schemas for Offer v1 persistence and API contracts."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import BaseSchema
from app.schemas.dashboard import ProposalFollowUpState


class OfferInsightsFreshnessMetadata(BaseModel):
    """Persistence metadata for insight freshness."""

    generated_at: datetime
    source_updated_at: datetime | None = None


class OfferInsightsData(BaseModel):
    """Offer insights persisted under project_data.offer_v1."""

    summary: str = Field(min_length=1, max_length=3000)
    key_points: list[str] = Field(default_factory=list, max_length=12)
    risks: list[str] = Field(default_factory=list, max_length=12)
    recommendations: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("summary must not be empty")
        return trimmed


class OfferDocumentMetadata(BaseModel):
    """Persistence metadata for the single active offer document."""

    file_id: UUID
    filename: str
    mime_type: str | None = None
    file_size: int | None = Field(default=None, ge=0)
    uploaded_at: datetime


class OfferV1Data(BaseModel):
    """Persistence envelope stored at project_data.offer_v1."""

    insights: OfferInsightsData | None = None
    freshness: OfferInsightsFreshnessMetadata | None = None
    offer_document: OfferDocumentMetadata | None = None


class OfferInsightsFreshnessDTO(BaseSchema):
    """API metadata for insight freshness state."""

    generated_at: datetime | None = None
    source_updated_at: datetime | None = None
    is_stale: bool = False


class OfferInsightsDTO(BaseSchema):
    """Offer insights payload returned by Offer detail APIs."""

    summary: str
    key_points: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    freshness: OfferInsightsFreshnessDTO


class OfferDocumentMetadataDTO(BaseSchema):
    """Offer document metadata returned by Offer detail APIs."""

    file_id: UUID
    filename: str
    mime_type: str | None = None
    file_size: int | None = Field(default=None, ge=0)
    uploaded_at: datetime


class OfferStreamSnapshotDTO(BaseSchema):
    """Workspace stream snapshot surfaced in Offer detail."""

    material_type: str | None = None
    material_name: str | None = None
    composition: str | None = None
    volume: str | None = None
    frequency: str | None = None


class OfferContextFieldDTO(BaseSchema):
    label: str
    value: str | None = None


class OfferContextCardDTO(BaseSchema):
    title: Literal["Stream snapshot", "Offer context"]
    description: str | None = None
    fields: list[OfferContextFieldDTO] = Field(default_factory=list)


class OfferDetailDTO(BaseSchema):
    """Project-scoped Offer detail response contract (v1 foundation)."""

    offer_id: UUID | None = None
    project_id: UUID | None = None
    display_title: str | None = None
    source_type: Literal["stream", "manual"] = "stream"
    context_card: OfferContextCardDTO | None = None
    stream_snapshot: OfferStreamSnapshotDTO
    follow_up_state: ProposalFollowUpState | None = None
    insights: OfferInsightsDTO | None = None
    offer_document: OfferDocumentMetadataDTO | None = None


class OfferFollowUpStateResponseDTO(BaseSchema):
    offer_id: UUID
    project_id: UUID | None = None
    follow_up_state: ProposalFollowUpState
    updated_at: datetime
