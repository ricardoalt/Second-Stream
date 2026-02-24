"""Schemas for voice interview API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema

VoiceInterviewStatus = Literal[
    "uploaded",
    "queued",
    "transcribing",
    "extracting",
    "review_ready",
    "partial_finalized",
    "finalized",
    "failed",
]


class VoiceInterviewCreateResponse(BaseSchema):
    voice_interview_id: UUID
    bulk_import_run_id: UUID
    status: VoiceInterviewStatus


class VoiceInterviewStatusResponse(BaseSchema):
    id: UUID
    bulk_import_run_id: UUID
    status: VoiceInterviewStatus
    error_code: str | None = None
    failed_stage: Literal["transcribing", "extracting"] | None = None
    processing_attempts: int
    audio_retention_expires_at: datetime
    transcript_retention_expires_at: datetime


class VoiceInterviewRetryResponse(BaseSchema):
    id: UUID
    status: VoiceInterviewStatus
    processing_attempts: int
    failed_stage: Literal["transcribing", "extracting"] | None = None


class VoiceInterviewAudioUrlResponse(BaseSchema):
    audio_url: str
    expires_in_seconds: int


class VoiceInterviewTranscriptSegment(BaseSchema):
    text: str
    start_sec: float
    end_sec: float
    speaker_label: str | None = None


class VoiceInterviewTranscriptResponse(BaseSchema):
    transcript_text: str
    segments: list[VoiceInterviewTranscriptSegment] = Field(default_factory=list)
