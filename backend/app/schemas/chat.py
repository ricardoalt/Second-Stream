"""Chat API schemas for v1 thread/message contracts."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class StreamFormat(StrEnum):
    """Protocol format for chat stream responses.

    - ``official``: AI SDK UI/Data Stream Protocol (canonical, product target)
    """

    OFFICIAL = "official"


class ArtifactType(StrEnum):
    """Controlled artifact types for AI-generated PDF attachments.

    Null means a generic attachment (not an AI artifact).
    """

    IDEATION_BRIEF = "generateIdeationBrief"
    ANALYTICAL_READ = "generateAnalyticalRead"
    PLAYBOOK = "generatePlaybook"


class ChatThreadCreateRequest(BaseSchema):
    title: str | None = Field(default=None, max_length=255)


class ChatThreadUpdateRequest(BaseSchema):
    title: str = Field(min_length=1, max_length=80)


class ChatThreadSummaryResponse(BaseSchema):
    id: UUID
    title: str | None
    last_message_preview: str | None
    last_message_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ChatThreadListResponse(BaseSchema):
    items: list[ChatThreadSummaryResponse]


class ChatAttachmentResponse(BaseSchema):
    id: UUID
    message_id: UUID | None
    original_filename: str
    content_type: str | None
    size_bytes: int
    created_at: datetime
    artifact_type: ArtifactType | None = None


class ChatMessageResponse(BaseSchema):
    id: UUID
    role: str
    content_text: str
    status: str | None
    created_at: datetime
    attachments: list[ChatAttachmentResponse]


class ChatThreadDetailResponse(BaseSchema):
    id: UUID
    title: str | None
    last_message_preview: str | None
    last_message_at: datetime | None
    messages: list[ChatMessageResponse]


class ChatStreamRequest(BaseSchema):
    content_text: str | None = Field(default=None, min_length=1)
    existing_attachment_ids: list[UUID] = Field(default_factory=list)
    messages: list[dict] = Field(
        default_factory=list,
        description="Optional AI SDK UI messages payload (v6 transport compatibility).",
    )
    stream_format: StreamFormat = Field(
        default=StreamFormat.OFFICIAL,
        description="Protocol format for the SSE stream. 'official' = AI SDK UI/Data Stream Protocol (default).",
    )
