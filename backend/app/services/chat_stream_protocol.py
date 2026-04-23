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
