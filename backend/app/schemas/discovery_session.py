"""Schemas for discovery session APIs."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema

DiscoverySessionStatus = Literal[
    "draft",
    "uploading",
    "processing",
    "review_ready",
    "partial_failure",
    "failed",
]
DiscoverySourceType = Literal["file", "audio", "text"]
DiscoverySourceStatus = Literal["uploaded", "processing", "review_ready", "failed"]


class DiscoverySessionCreateRequest(BaseSchema):
    company_id: UUID


class DiscoverySessionAddTextRequest(BaseSchema):
    text: str = Field(min_length=1)


class DiscoverySourceResponse(BaseSchema):
    id: UUID
    source_type: DiscoverySourceType
    status: DiscoverySourceStatus
    source_filename: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None
    text_length: int | None = None
    text_preview: str | None = None
    import_run_id: UUID | None = None
    voice_interview_id: UUID | None = None
    processing_error: str | None = None
    created_at: datetime
    updated_at: datetime


class DiscoverySessionSummaryResponse(BaseSchema):
    total_sources: int
    file_sources: int
    audio_sources: int
    text_sources: int
    locations_found: int
    waste_streams_found: int
    drafts_needing_confirmation: int
    failed_sources: int


class DiscoverySessionResponse(BaseSchema):
    id: UUID
    company_id: UUID
    status: DiscoverySessionStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    processing_error: str | None = None
    sources: list[DiscoverySourceResponse]
    summary: DiscoverySessionSummaryResponse
    created_at: datetime
    updated_at: datetime
