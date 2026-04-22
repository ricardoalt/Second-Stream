"""Chat API schemas for v1 thread/message contracts."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class StreamFormat(StrEnum):
    """Protocol format for chat stream responses.

    - ``official``: AI SDK UI/Data Stream Protocol (canonical, product target)
    - ``legacy``: Temporary backward-compat SSE format (will be removed)
    """

    OFFICIAL = "official"
    LEGACY = "legacy"


class ChatThreadCreateRequest(BaseSchema):
    title: str | None = Field(default=None, max_length=255)


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
    content_text: str = Field(..., min_length=1)
    existing_attachment_ids: list[UUID] = Field(default_factory=list)
    stream_format: StreamFormat = Field(
        default=StreamFormat.OFFICIAL,
        description="Protocol format for the SSE stream. 'official' = AI SDK UI/Data Stream Protocol (default), 'legacy' = temporary backward-compat format.",
    )
