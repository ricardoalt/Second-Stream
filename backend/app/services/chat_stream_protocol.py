"""Protocol adapter boundary for the official AI SDK UI/Data Stream Protocol.

Translates internal runtime stream events to either:
- Official AI SDK UI/Data Stream Protocol (v1) — canonical product contract
- Legacy SSE format — temporary backward compatibility only

See: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol
"""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from typing import Any

import structlog

from app.services.s3_service import download_file_content

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Protocol constants
# ---------------------------------------------------------------------------

PROTOCOL_HEADER = "x-vercel-ai-ui-message-stream"
PROTOCOL_VERSION = "v1"

OFFICIAL_STREAM_FORMAT = "official"
LEGACY_STREAM_FORMAT = "legacy"


# ---------------------------------------------------------------------------
# Agent-consumable attachment input (Phase 1 minimal — no binary content yet)
# ---------------------------------------------------------------------------


@dataclass(slots=True, frozen=True)
class ChatAgentAttachmentInput:
    """Agent-consumable attachment input resolved from persisted ChatAttachment rows.

    This is the contract between persistence (ChatAttachment model) and the
    chat agent runtime.  Later phases will populate ``document_url`` and
    ``binary_content`` when storage resolution is wired.
    """

    attachment_id: str
    media_type: str
    filename: str
    document_url: str | None = None
    binary_content: bytes | None = None
    uploaded_file_ref: str | None = None
    extracted_text: str | None = None


# ---------------------------------------------------------------------------
# SSE encoding helpers
# ---------------------------------------------------------------------------


def encode_official_sse(event_type: str, data: dict[str, Any]) -> str:
    """Encode an event following the official AI SDK UI/Data Stream Protocol.

    Format: ``data: {json}\\n\\n``
    Each payload MUST include a ``type`` field as the protocol discriminator.
    """
    payload = {"type": event_type, **data}
    return f"data: {json.dumps(payload)}\n\n"


def encode_legacy_sse(event_type: str, data: dict[str, Any]) -> str:
    """Encode an event in the legacy SSE format (temporary compatibility).

    Format: ``event: {type}\\ndata: {json}\\n\\n``
    The ``type`` field is NOT duplicated inside the data payload.
    """
    filtered_data = {k: v for k, v in data.items() if k != "event"}
    return f"event: {event_type}\ndata: {json.dumps(filtered_data)}\n\n"


# ---------------------------------------------------------------------------
# Stream adapters
# ---------------------------------------------------------------------------


async def adapt_stream_to_official_protocol(
    internal_stream: AsyncGenerator[dict, None],
) -> AsyncGenerator[str, None]:
    """Adapt internal stream events to the official AI SDK UI/Data Stream Protocol.

    Maps internal events to protocol events:
    - ``start``  → ``{"type":"start","messageId":"..."}``
    - ``delta``   → ``text-start`` / ``text-delta`` / ``text-end`` envelope
    - ``completed`` → ``{"type":"finish"}``
    - ``error``  → ``{"type":"error","errorText":"..."}``
    - ``data-new-thread-created`` → ``{"type":"data-new-thread-created","data":{...}}``
    - ``data-conversation-title`` → ``{"type":"data-conversation-title","data":{...}}``

    Stream terminates with ``data: [DONE]\\n\\n``.
    Does NOT emit synthetic reasoning events — only real text deltas.
    """
    text_block_id: str | None = None

    async for event in internal_stream:
        event_type = event.get("event")

        if event_type == "start":
            message_id = event.get("run_id", str(uuid.uuid4()))
            yield encode_official_sse("start", {"messageId": message_id})

        elif event_type == "delta":
            # Start a text block on the first delta
            if text_block_id is None:
                text_block_id = f"text-{uuid.uuid4().hex[:12]}"
                yield encode_official_sse("text-start", {"id": text_block_id})

            delta_text = event.get("delta", "")
            yield encode_official_sse("text-delta", {"id": text_block_id, "delta": delta_text})

        elif event_type == "completed":
            # Close any open text block
            if text_block_id is not None:
                yield encode_official_sse("text-end", {"id": text_block_id})
                text_block_id = None

            yield encode_official_sse("finish", {})

        elif event_type == "error":
            error_text = event.get("code", "UNKNOWN_ERROR")
            yield encode_official_sse("error", {"errorText": error_text})

        elif event_type == "data-new-thread-created":
            yield encode_official_sse(
                "data-new-thread-created",
                {
                    "data": {
                        "threadId": event.get("thread_id", ""),
                        "title": event.get("title"),
                        "createdAt": event.get("created_at", ""),
                        "updatedAt": event.get("updated_at", ""),
                    },
                },
            )

        elif event_type == "data-conversation-title":
            yield encode_official_sse(
                "data-conversation-title",
                {
                    "data": {
                        "threadId": event.get("thread_id", ""),
                        "title": event.get("title", ""),
                    },
                },
            )

        elif event_type == "tool-input-start":
            yield encode_official_sse(
                "tool-input-start",
                {
                    "toolCallId": event["toolCallId"],
                    "toolName": event["toolName"],
                },
            )

        elif event_type == "tool-input-delta":
            yield encode_official_sse(
                "tool-input-delta",
                {
                    "toolCallId": event["toolCallId"],
                    "inputTextDelta": event["inputTextDelta"],
                },
            )

        elif event_type == "tool-input-available":
            yield encode_official_sse(
                "tool-input-available",
                {
                    "toolCallId": event["toolCallId"],
                    "toolName": event["toolName"],
                    "input": event["input"],
                },
            )

        elif event_type == "tool-output-available":
            # No toolName — client has it from tool-input-start frame
            yield encode_official_sse(
                "tool-output-available",
                {
                    "toolCallId": event["toolCallId"],
                    "output": event["output"],
                },
            )

        elif event_type == "tool-output-error":
            yield encode_official_sse(
                "tool-output-error",
                {
                    "toolCallId": event["toolCallId"],
                    "errorText": event["errorText"],
                },
            )

    # Stream termination marker per the official protocol
    yield "data: [DONE]\n\n"


async def adapt_stream_to_legacy_protocol(
    internal_stream: AsyncGenerator[dict, None],
) -> AsyncGenerator[str, None]:
    """Pass through internal events in the legacy SSE format.

    Temporary compatibility adapter — will be removed once frontend
    migration to the official protocol is complete.
    """
    async for event in internal_stream:
        event_type = str(event.get("event", ""))
        yield encode_legacy_sse(event_type, event)


# ---------------------------------------------------------------------------
# Attachment resolution
# ---------------------------------------------------------------------------


def resolve_attachments_to_agent_input(
    attachments: list,
) -> list[ChatAgentAttachmentInput]:
    """Resolve persisted ChatAttachment ORM rows to agent-consumable input.

    Accepts a list of ``ChatAttachment`` model instances (or any object
    with ``id``, ``content_type``, ``original_filename``, ``storage_key``,
    and ``extracted_text`` attributes) and returns a list of
    ``ChatAgentAttachmentInput`` ready for the agent runtime.

    Phase 1: populates ``uploaded_file_ref`` from ``storage_key`` and
    ``extracted_text`` when available. ``document_url`` and
    ``binary_content`` remain ``None`` until storage resolution is wired.
    """
    return [
        ChatAgentAttachmentInput(
            attachment_id=str(att.id),
            media_type=att.content_type or "",
            filename=att.original_filename,
            uploaded_file_ref=att.storage_key,
            extracted_text=att.extracted_text,
        )
        for att in attachments
    ]


def _normalize_media_type(media_type: str | None) -> str:
    if media_type is None:
        return ""
    return media_type.split(";", 1)[0].strip().lower()


def _decode_text_attachment(content: bytes) -> str | None:
    decoded = content.decode("utf-8", errors="replace").strip()
    return decoded or None


async def resolve_attachments_to_agent_input_for_model(
    attachments: list,
) -> list[ChatAgentAttachmentInput]:
    """Resolve persisted attachments into Bedrock/Pydantic-ready inputs.

    Strategy:
    - `text/*`: use extracted text when available; otherwise decode downloaded bytes.
    - `application/pdf` and `image/*`: download bytes and expose `binary_content`
      as the primary path (most reliable Bedrock/Pydantic input).
    - Other media types: keep metadata only.

    Note:
    - We intentionally do not default to `document_url=s3://...` because runtime
      analysis reliability depends on provider-side S3 access configuration.
      For P0 correctness, direct bytes in request is the default.
    """

    resolved: list[ChatAgentAttachmentInput] = []

    for attachment in attachments:
        media_type = _normalize_media_type(getattr(attachment, "content_type", None))
        storage_key = getattr(attachment, "storage_key", None)
        extracted_text = getattr(attachment, "extracted_text", None)
        base = ChatAgentAttachmentInput(
            attachment_id=str(attachment.id),
            media_type=media_type,
            filename=attachment.original_filename,
            uploaded_file_ref=storage_key,
            extracted_text=extracted_text,
        )

        is_text = media_type.startswith("text/")
        is_binary_doc = media_type == "application/pdf" or media_type.startswith("image/")

        if is_text:
            if base.extracted_text:
                resolved.append(base)
                continue

            if storage_key:
                try:
                    text_content = _decode_text_attachment(await download_file_content(storage_key))
                except Exception:
                    logger.warning(
                        "chat_attachment_text_download_failed",
                        attachment_id=str(attachment.id),
                        storage_key=storage_key,
                    )
                    text_content = None

                if text_content:
                    resolved.append(
                        ChatAgentAttachmentInput(
                            attachment_id=base.attachment_id,
                            media_type=base.media_type,
                            filename=base.filename,
                            uploaded_file_ref=base.uploaded_file_ref,
                            extracted_text=text_content,
                        )
                    )
                    continue

            resolved.append(base)
            continue

        if is_binary_doc:
            if storage_key:
                try:
                    binary_content = await download_file_content(storage_key)
                except Exception:
                    logger.warning(
                        "chat_attachment_binary_download_failed",
                        attachment_id=str(attachment.id),
                        storage_key=storage_key,
                    )
                    binary_content = None

                if binary_content:
                    resolved.append(
                        ChatAgentAttachmentInput(
                            attachment_id=base.attachment_id,
                            media_type=base.media_type,
                            filename=base.filename,
                            binary_content=binary_content,
                            uploaded_file_ref=base.uploaded_file_ref,
                            extracted_text=base.extracted_text,
                        )
                    )
                    continue

            resolved.append(base)

    return resolved


def extract_latest_user_text_with_vercel_adapter(messages: list[dict[str, Any]]) -> str | None:
    """Extract latest user text from AI SDK `messages` payload using VercelAIAdapter.

    This keeps backend parsing aligned with the official AI SDK message schema
    while allowing the current thin transport contract (`contentText`) to remain.
    """

    if not messages:
        return None

    def _extract_from_raw_ui_messages(raw_messages: list[dict[str, Any]]) -> str | None:
        for raw_message in reversed(raw_messages):
            if raw_message.get("role") != "user":
                continue

            parts = raw_message.get("parts")
            if not isinstance(parts, list):
                continue

            text_segments: list[str] = []
            for part in parts:
                if not isinstance(part, dict):
                    continue
                if part.get("type") != "text":
                    continue

                text_value = part.get("text")
                if isinstance(text_value, str) and text_value.strip():
                    text_segments.append(text_value)

            if not text_segments:
                continue

            normalized = "\n".join(segment.strip() for segment in text_segments if segment.strip()).strip()
            if normalized:
                return normalized

        return None

    try:
        from pydantic import TypeAdapter
        from pydantic_ai.messages import ModelRequest, UserPromptPart
        from pydantic_ai.ui.vercel_ai import VercelAIAdapter
        from pydantic_ai.ui.vercel_ai.request_types import UIMessage

        ui_messages = TypeAdapter(list[UIMessage]).validate_python(messages)
        model_messages = VercelAIAdapter.load_messages(ui_messages)
    except Exception:
        return _extract_from_raw_ui_messages(messages)

    for model_message in reversed(model_messages):
        if not isinstance(model_message, ModelRequest):
            continue

        for part in reversed(model_message.parts):
            if not isinstance(part, UserPromptPart):
                continue

            content = part.content
            if isinstance(content, str):
                normalized = content.strip()
                return normalized or None

            text_segments = [segment for segment in content if isinstance(segment, str)]
            if not text_segments:
                continue

            normalized = "\n".join(segment for segment in text_segments if segment.strip()).strip()
            if normalized:
                return normalized

    return _extract_from_raw_ui_messages(messages)
