"""Tests for the AI SDK UI/Data Stream Protocol adapter boundary.

Phase 1 TDD: protocol event ordering, terminal states, attachment resolution,
and legacy/official encoding contracts.
"""

import json
import uuid

import pytest

from app.services.chat_stream_protocol import (
    LEGACY_STREAM_FORMAT,
    OFFICIAL_STREAM_FORMAT,
    PROTOCOL_HEADER,
    PROTOCOL_VERSION,
    ChatAgentAttachmentInput,
    adapt_stream_to_legacy_protocol,
    adapt_stream_to_official_protocol,
    encode_legacy_sse,
    encode_official_sse,
    extract_latest_user_text_with_vercel_adapter,
    resolve_attachments_to_agent_input,
    resolve_attachments_to_agent_input_for_model,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _collect(async_gen):
    """Collect all items from an async generator into a list."""
    return [item async for item in async_gen]


async def _stream_events_gen(events):
    """Yield a sequence of internal stream events as an async generator."""
    for event in events:
        yield event


def _parse_official_output(output: list[str]) -> list[dict]:
    """Parse official AI SDK UI/Data Stream Protocol output into event dicts."""
    parsed = []
    for line in output:
        line = line.strip()
        if line == "data: [DONE]":
            parsed.append({"type": "DONE"})
            continue
        if line.startswith("data: "):
            parsed.append(json.loads(line.removeprefix("data: ")))
    return parsed


# ---------------------------------------------------------------------------
# 1. Official protocol SSE encoding — unit tests
# ---------------------------------------------------------------------------


class TestEncodeOfficialSSE:
    """Unit tests for the official AI SDK UI/Data Stream Protocol SSE encoder."""

    def test_start_event_format(self):
        """Official protocol: start event must be data: {json}\\n\\n with type field."""
        result = encode_official_sse("start", {"messageId": "msg-123"})
        assert result.startswith("data: ")
        payload = json.loads(result[len("data: "):].rstrip("\n"))
        assert payload["type"] == "start"
        assert payload["messageId"] == "msg-123"

    def test_text_delta_event_includes_id_and_delta(self):
        """Official protocol: text-delta must carry id and delta fields."""
        result = encode_official_sse("text-delta", {"id": "text-abc", "delta": "Hello"})
        payload = json.loads(result[len("data: "):].rstrip("\n"))
        assert payload["type"] == "text-delta"
        assert payload["id"] == "text-abc"
        assert payload["delta"] == "Hello"

    def test_finish_event_format(self):
        """Official protocol: finish event is a simple type-only event."""
        result = encode_official_sse("finish", {})
        payload = json.loads(result[len("data: "):].rstrip("\n"))
        assert payload["type"] == "finish"


class TestEncodeLegacySSE:
    """Unit tests for the legacy SSE encoder (temporary compatibility)."""

    def test_legacy_format_uses_event_and_data_lines(self):
        """Legacy SSE uses 'event: type\\ndata: json' format."""
        result = encode_legacy_sse("start", {"run_id": "run-1"})
        lines = result.strip().split("\n")
        assert lines[0] == "event: start"
        data = json.loads(lines[1].removeprefix("data: "))
        assert data["run_id"] == "run-1"

    def test_legacy_delta_event(self):
        """Legacy SSE delta must carry delta text in data."""
        result = encode_legacy_sse("delta", {"delta": "chunk text"})
        lines = result.strip().split("\n")
        assert lines[0] == "event: delta"
        data = json.loads(lines[1].removeprefix("data: "))
        assert data["delta"] == "chunk text"


# ---------------------------------------------------------------------------
# 2. Protocol stream adapter — official protocol
# ---------------------------------------------------------------------------


class TestOfficialProtocolStreamAdapter:
    """Integration tests for adapt_stream_to_official_protocol."""

    @pytest.mark.asyncio
    async def test_full_successful_stream_ordering(self):
        """Official protocol: start → text-start → text-delta → text-end → finish → [DONE]."""
        run_id = "run-order-test"
        internal_events = [
            {"event": "start", "run_id": run_id},
            {"event": "delta", "delta": "Hello"},
            {"event": "delta", "delta": " world"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        types = [p["type"] for p in parsed]
        assert types[0] == "start"
        assert parsed[0]["messageId"] == run_id

        # text-start, text-delta, text-delta, text-end envelope
        assert types[1] == "text-start"
        assert types[2] == "text-delta"
        assert parsed[2]["delta"] == "Hello"
        assert types[3] == "text-delta"
        assert parsed[3]["delta"] == " world"
        assert types[4] == "text-end"

        # finish and DONE terminator
        assert types[5] == "finish"
        assert types[6] == "DONE"

    @pytest.mark.asyncio
    async def test_text_block_id_consistency(self):
        """Official protocol: all text-delta/text-end events share the same id from text-start."""
        internal_events = [
            {"event": "start", "run_id": "run-id-test"},
            {"event": "delta", "delta": "A"},
            {"event": "delta", "delta": "B"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        text_start = parsed[1]
        assert text_start["type"] == "text-start"
        text_id = text_start["id"]

        # All text-delta and text-end events must reference same text block id
        for event in parsed[2:]:
            if event["type"] in ("text-delta", "text-end"):
                assert event["id"] == text_id

    @pytest.mark.asyncio
    async def test_error_stream_produces_error_and_done_only(self):
        """Official protocol: error stream emits start, error, then [DONE] — no finish."""
        internal_events = [
            {"event": "start", "run_id": "run-error-test"},
            {"event": "error", "code": "CHAT_STREAM_FAILED"},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        types = [p["type"] for p in parsed]
        assert types == ["start", "error", "DONE"]

        error_event = parsed[1]
        assert error_event["errorText"] == "CHAT_STREAM_FAILED"

    @pytest.mark.asyncio
    async def test_done_terminator_always_present(self):
        """Official protocol: stream always ends with data: [DONE]."""
        internal_events = [
            {"event": "start", "run_id": "run-done-test"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)

        assert output[-1].strip() == "data: [DONE]"

    @pytest.mark.asyncio
    async def test_empty_deltas_still_produce_valid_structure(self):
        """Official protocol: even with no delta events, stream still has valid structure."""
        internal_events = [
            {"event": "start", "run_id": "run-empty"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)

        parsed = []
        for line in output:
            line = line.strip()
            if line == "data: [DONE]":
                parsed.append({"type": "DONE"})
                continue
            if line.startswith("data: "):
                parsed.append(json.loads(line.removeprefix("data: ")))

        types = [p["type"] for p in parsed]
        # No text block if no deltas — just start, finish, DONE
        assert types == ["start", "finish", "DONE"]

    @pytest.mark.asyncio
    async def test_single_delta_produces_complete_text_envelope(self):
        """Official protocol: single delta still gets text-start/text-delta/text-end."""
        internal_events = [
            {"event": "start", "run_id": "run-single"},
            {"event": "delta", "delta": "Only chunk"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)

        parsed = _parse_official_output(output)
        types = [p["type"] for p in parsed]

        # Order: start, text-start, text-delta, text-end, finish, DONE
        assert types == ["start", "text-start", "text-delta", "text-end", "finish", "DONE"]
        assert parsed[2]["delta"] == "Only chunk"

    @pytest.mark.asyncio
    async def test_completed_without_start_yields_finish_and_done(self):
        """Official protocol: if internal stream only emits completed, still terminates correctly."""
        internal_events = [
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)

        parsed = _parse_official_output(output)
        types = [p["type"] for p in parsed]
        assert "finish" in types
        assert "DONE" in types

    @pytest.mark.asyncio
    async def test_data_conversation_title_event_maps_to_official_data_part(self):
        """Official protocol: data-conversation-title must be emitted as a data part."""
        internal_events = [
            {
                "event": "data-conversation-title",
                "thread_id": "thread-42",
                "title": "Propuesta de clarificación",
            }
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        assert parsed[0] == {
            "type": "data-conversation-title",
            "data": {
                "threadId": "thread-42",
                "title": "Propuesta de clarificación",
            },
        }
        assert parsed[1]["type"] == "DONE"

    @pytest.mark.asyncio
    async def test_data_new_thread_created_event_maps_to_official_data_part(self):
        """Official protocol: data-new-thread-created keeps thread metadata contract."""
        internal_events = [
            {
                "event": "data-new-thread-created",
                "thread_id": "thread-99",
                "title": "New chat",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        assert parsed[0] == {
            "type": "data-new-thread-created",
            "data": {
                "threadId": "thread-99",
                "title": "New chat",
                "createdAt": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z",
            },
        }


# ---------------------------------------------------------------------------
# 3. Protocol stream adapter — legacy protocol
# ---------------------------------------------------------------------------


class TestLegacyProtocolStreamAdapter:
    """Integration tests for adapt_stream_to_legacy_protocol."""

    @pytest.mark.asyncio
    async def test_legacy_passthrough_preserves_event_format(self):
        """Legacy adapter must pass through internal events without transformation."""
        run_id = "run-legacy-test"
        internal_events = [
            {"event": "start", "run_id": run_id},
            {"event": "delta", "delta": "Chunk"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_legacy_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)

        event_names = []
        for frame in output:
            lines = frame.strip().split("\n")
            event_names.append(lines[0].removeprefix("event: "))

        assert event_names == ["start", "delta", "completed"]

    @pytest.mark.asyncio
    async def test_legacy_error_passthrough(self):
        """Legacy adapter must pass through error events."""
        internal_events = [
            {"event": "start", "run_id": "run-legacy-error"},
            {"event": "error", "code": "CHAT_STREAM_FAILED"},
        ]
        stream = adapt_stream_to_legacy_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)

        # Second frame should be the error
        error_frame = output[1]
        data = json.loads(error_frame.strip().split("\n")[1].removeprefix("data: "))
        assert data["code"] == "CHAT_STREAM_FAILED"


# ---------------------------------------------------------------------------
# 4. Protocol constants and header contract
# ---------------------------------------------------------------------------


class TestProtocolConstants:
    """Tests for protocol header and version constants."""

    def test_protocol_header_name(self):
        """Protocol header must match the official AI SDK spec."""
        assert PROTOCOL_HEADER == "x-vercel-ai-ui-message-stream"

    def test_protocol_version_value(self):
        """Protocol version must be v1 as per official spec."""
        assert PROTOCOL_VERSION == "v1"

    def test_format_constants_are_distinct(self):
        """Official and legacy format identifiers must be distinct strings."""
        assert OFFICIAL_STREAM_FORMAT != LEGACY_STREAM_FORMAT
        assert OFFICIAL_STREAM_FORMAT == "official"
        assert LEGACY_STREAM_FORMAT == "legacy"


# ---------------------------------------------------------------------------
# 5. ChatAgentAttachmentInput — agent-consumable attachment contract
# ---------------------------------------------------------------------------


class TestChatAgentAttachmentInput:
    """Tests for the ChatAgentAttachmentInput data contract."""

    def test_attachment_input_holds_required_fields(self):
        """ChatAgentAttachmentInput must carry id, media type, and filename."""
        attachment = ChatAgentAttachmentInput(
            attachment_id="att-001",
            media_type="application/pdf",
            filename="report.pdf",
        )
        assert attachment.attachment_id == "att-001"
        assert attachment.media_type == "application/pdf"
        assert attachment.filename == "report.pdf"

    def test_attachment_input_optional_fields_default_to_none(self):
        """Optional fields (document_url, binary_content, uploaded_file_ref, extracted_text) default to None."""
        attachment = ChatAgentAttachmentInput(
            attachment_id="att-002",
            media_type="text/plain",
            filename="notes.txt",
        )
        assert attachment.document_url is None
        assert attachment.binary_content is None
        assert attachment.uploaded_file_ref is None
        assert attachment.extracted_text is None

    def test_attachment_input_with_full_fields(self):
        """ChatAgentAttachmentInput can carry all resolvable fields for agent input."""
        attachment = ChatAgentAttachmentInput(
            attachment_id="att-003",
            media_type="text/plain",
            filename="notes.txt",
            document_url="https://storage.example.com/notes.txt",
            uploaded_file_ref="storage-key-123",
            extracted_text="Extracted text content here",
        )
        assert attachment.document_url == "https://storage.example.com/notes.txt"
        assert attachment.uploaded_file_ref == "storage-key-123"
        assert attachment.extracted_text == "Extracted text content here"


# ---------------------------------------------------------------------------
# 6. Attachment resolution to agent-consumable input
# ---------------------------------------------------------------------------


class TestResolveAttachmentsToAgentInput:
    """Tests for resolving persisted ChatAttachment rows to agent-consumable input."""

    def test_resolve_empty_list_returns_empty(self):
        """Resolving an empty attachment list returns an empty list."""
        result = resolve_attachments_to_agent_input([])
        assert result == []

    def test_resolve_single_attachment_with_extracted_text(self):
        """Attachment with extracted_text populates the agent-input extracted_text field."""
        from app.models.chat_attachment import ChatAttachment

        attachment = ChatAttachment(
            organization_id=uuid.uuid4(),
            uploaded_by_user_id=uuid.uuid4(),
            storage_key="chat/org/user/report.pdf",
            original_filename="report.pdf",
            content_type="application/pdf",
            size_bytes=1024,
            extracted_text="PDF content here",
        )
        attachment.id = uuid.uuid4()

        result = resolve_attachments_to_agent_input([attachment])
        assert len(result) == 1
        assert result[0].attachment_id == str(attachment.id)
        assert result[0].media_type == "application/pdf"
        assert result[0].filename == "report.pdf"
        assert result[0].uploaded_file_ref == "chat/org/user/report.pdf"
        assert result[0].extracted_text == "PDF content here"

    def test_resolve_attachment_without_extracted_text(self):
        """Attachment without extracted_text leaves that field as None."""
        from app.models.chat_attachment import ChatAttachment

        attachment = ChatAttachment(
            organization_id=uuid.uuid4(),
            uploaded_by_user_id=uuid.uuid4(),
            storage_key="chat/org/user/image.png",
            original_filename="image.png",
            content_type="image/png",
            size_bytes=2048,
            extracted_text=None,
        )
        attachment.id = uuid.uuid4()

        result = resolve_attachments_to_agent_input([attachment])
        assert len(result) == 1
        assert result[0].extracted_text is None
        assert result[0].media_type == "image/png"
        assert result[0].filename == "image.png"

    def test_resolve_multiple_attachments_preserves_order(self):
        """Multiple attachments resolve in their original order."""
        from app.models.chat_attachment import ChatAttachment

        attachments = []
        for idx, (name, mime) in enumerate(
            [("doc.txt", "text/plain"), ("img.png", "image/png")]
        ):
            att = ChatAttachment(
                organization_id=uuid.uuid4(),
                uploaded_by_user_id=uuid.uuid4(),
                storage_key=f"chat/org/user/{name}",
                original_filename=name,
                content_type=mime,
                size_bytes=100 * (idx + 1),
                extracted_text=f"content-{idx}" if idx == 0 else None,
            )
            att.id = uuid.uuid4()
            attachments.append(att)

        result = resolve_attachments_to_agent_input(attachments)
        assert len(result) == 2
        assert result[0].filename == "doc.txt"
        assert result[0].extracted_text == "content-0"
        assert result[1].filename == "img.png"
        assert result[1].extracted_text is None

    def test_resolve_attachment_with_null_content_type_yields_empty_media_type(self):
        """Attachments with NULL content_type resolve media_type to empty string."""
        from app.models.chat_attachment import ChatAttachment

        attachment = ChatAttachment(
            organization_id=uuid.uuid4(),
            uploaded_by_user_id=uuid.uuid4(),
            storage_key="chat/org/user/unknown",
            original_filename="unknown",
            content_type=None,
            size_bytes=50,
            extracted_text=None,
        )
        attachment.id = uuid.uuid4()

        result = resolve_attachments_to_agent_input([attachment])
        assert result[0].media_type == ""


class TestResolveAttachmentsToAgentInputForModel:
    """Tests for model-ready attachment materialization (S3 URI vs binary bytes)."""

    @pytest.mark.asyncio
    async def test_pdf_resolves_to_binary_content_even_when_s3_enabled(self, monkeypatch):
        from app.models.chat_attachment import ChatAttachment

        async def _fake_download(_key: str) -> bytes:
            return b"%PDF-1.7"

        monkeypatch.setattr(
            "app.services.chat_stream_protocol.download_file_content",
            _fake_download,
        )

        attachment = ChatAttachment(
            organization_id=uuid.uuid4(),
            uploaded_by_user_id=uuid.uuid4(),
            storage_key="chat/org/user/report.pdf",
            original_filename="report.pdf",
            content_type="application/pdf",
            size_bytes=1024,
            extracted_text=None,
        )
        attachment.id = uuid.uuid4()

        result = await resolve_attachments_to_agent_input_for_model([attachment])

        assert result[0].binary_content == b"%PDF-1.7"
        assert result[0].document_url is None

    @pytest.mark.asyncio
    async def test_image_falls_back_to_binary_content_without_s3(self, monkeypatch):
        from app.models.chat_attachment import ChatAttachment

        monkeypatch.setattr("app.services.chat_stream_protocol.USE_S3", False)

        async def _fake_download(_key: str) -> bytes:
            return b"PNG-BYTES"

        monkeypatch.setattr(
            "app.services.chat_stream_protocol.download_file_content",
            _fake_download,
        )

        attachment = ChatAttachment(
            organization_id=uuid.uuid4(),
            uploaded_by_user_id=uuid.uuid4(),
            storage_key="chat/org/user/image.png",
            original_filename="image.png",
            content_type="image/png",
            size_bytes=2048,
            extracted_text=None,
        )
        attachment.id = uuid.uuid4()

        result = await resolve_attachments_to_agent_input_for_model([attachment])

        assert result[0].binary_content == b"PNG-BYTES"
        assert result[0].document_url is None

    @pytest.mark.asyncio
    async def test_text_attachment_remains_usable_text(self, monkeypatch):
        from app.models.chat_attachment import ChatAttachment

        monkeypatch.setattr("app.services.chat_stream_protocol.USE_S3", False)

        attachment = ChatAttachment(
            organization_id=uuid.uuid4(),
            uploaded_by_user_id=uuid.uuid4(),
            storage_key="chat/org/user/notes.txt",
            original_filename="notes.txt",
            content_type="text/plain",
            size_bytes=128,
            extracted_text="texto extraído",
        )
        attachment.id = uuid.uuid4()

        result = await resolve_attachments_to_agent_input_for_model([attachment])

        assert result[0].extracted_text == "texto extraído"
        assert result[0].binary_content is None


class TestExtractLatestUserTextWithVercelAdapter:
    def test_extracts_latest_user_text_from_sdk_messages_payload(self):
        messages = [
            {
                "id": "m1",
                "role": "user",
                "parts": [{"type": "text", "text": "hola"}],
            },
            {
                "id": "m2",
                "role": "assistant",
                "parts": [{"type": "text", "text": "respuesta"}],
            },
            {
                "id": "m3",
                "role": "user",
                "parts": [{"type": "text", "text": "último mensaje"}],
            },
        ]

        assert extract_latest_user_text_with_vercel_adapter(messages) == "último mensaje"

    def test_falls_back_to_raw_user_text_when_adapter_cannot_parse_custom_parts(self):
        messages = [
            {
                "id": "m1",
                "role": "user",
                "parts": [{"type": "text", "text": "primer mensaje"}],
            },
            {
                "id": "m2",
                "role": "assistant",
                "parts": [
                    {
                        "type": "tool-webSearch",
                        "state": "output-available",
                        "output": [
                            {
                                "title": "Fuente",
                                "url": "https://example.com",
                                "content": "detalle",
                            }
                        ],
                    }
                ],
            },
            {
                "id": "m3",
                "role": "user",
                "parts": [{"type": "text", "text": "segundo mensaje"}],
            },
        ]

        assert extract_latest_user_text_with_vercel_adapter(messages) == "segundo mensaje"


# ---------------------------------------------------------------------------
# 7. Protocol negotiation resolution unit tests
# ---------------------------------------------------------------------------


class TestResolveStreamFormat:
    """Tests for the _resolve_stream_format helper in the API endpoint."""

    def test_official_is_default(self):
        """When no body field or header is set, official protocol is the default."""
        from app.api.v1.chat import _resolve_stream_format
        from app.schemas.chat import StreamFormat

        assert _resolve_stream_format(StreamFormat.OFFICIAL, None) is True

    def test_legacy_body_overrides_default(self):
        """Explicit legacy body format returns False (use legacy)."""
        from app.api.v1.chat import _resolve_stream_format
        from app.schemas.chat import StreamFormat

        assert _resolve_stream_format(StreamFormat.LEGACY, None) is False

    def test_header_v1_triggers_official(self):
        """Header x-vercel-ai-ui-message-stream: v1 triggers official protocol."""
        from app.api.v1.chat import _resolve_stream_format
        from app.schemas.chat import StreamFormat

        assert _resolve_stream_format(StreamFormat.OFFICIAL, "v1") is True

    def test_header_case_insensitive(self):
        """Header value is compared case-insensitively."""
        from app.api.v1.chat import _resolve_stream_format
        from app.schemas.chat import StreamFormat

        assert _resolve_stream_format(StreamFormat.OFFICIAL, "V1") is True

    def test_legacy_body_overrides_header(self):
        """Legacy body takes priority over header — explicit opt-out."""
        from app.api.v1.chat import _resolve_stream_format
        from app.schemas.chat import StreamFormat

        assert _resolve_stream_format(StreamFormat.LEGACY, "v1") is False
