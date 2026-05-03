"""Tests for data-new-thread-created stream event in protocol adapters.

TDD RED→GREEN cycle: tests written BEFORE implementation.
Implementation: see app/services/chat_service.py and chat_stream_protocol.py.
"""

import json
import uuid

import pytest

from app.services.chat_stream_protocol import adapt_stream_to_official_protocol


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


class TestDataNewThreadCreatedEventOfficial:
    """Official protocol: data-new-thread-created is emitted before start."""

    @pytest.mark.asyncio
    async def test_data_new_thread_created_emitted_before_start(self):
        """When thread is newly created, data-new-thread-created event is emitted."""
        thread_id = str(uuid.uuid4())
        internal_events = [
            {
                "event": "data-new-thread-created",
                "thread_id": thread_id,
                "title": None,
                "created_at": "2026-04-23T12:00:00+00:00",
                "updated_at": "2026-04-23T12:00:00+00:00",
            },
            {"event": "start", "run_id": "run-test"},
            {"event": "delta", "delta": "Hello"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        # First event should be data-new-thread-created
        assert parsed[0]["type"] == "data-new-thread-created"
        assert parsed[0]["data"]["threadId"] == thread_id
        assert parsed[0]["data"]["createdAt"] == "2026-04-23T12:00:00+00:00"

        # stream should continue normally after
        types_after = [p["type"] for p in parsed[1:] if p["type"] != "DONE"]
        assert types_after[0] == "start"
        assert "finish" in types_after

    @pytest.mark.asyncio
    async def test_no_data_event_on_existing_thread(self):
        """When thread already exists, no data-new-thread-created event is emitted."""
        internal_events = [
            {"event": "start", "run_id": "run-existing"},
            {"event": "delta", "delta": "Reply"},
            {"event": "completed", "message_id": str(uuid.uuid4())},
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        types = [p["type"] for p in parsed]
        assert "data-new-thread-created" not in types
        assert types[0] == "start"

    @pytest.mark.asyncio
    async def test_data_new_thread_created_payload_has_required_fields(self):
        """data-new-thread-created event must contain threadId, title, createdAt, updatedAt."""
        thread_id = str(uuid.uuid4())
        internal_events = [
            {
                "event": "data-new-thread-created",
                "thread_id": thread_id,
                "title": "My Chat",
                "created_at": "2026-04-23T12:00:00+00:00",
                "updated_at": "2026-04-23T12:00:01+00:00",
            },
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        event = parsed[0]
        assert event["type"] == "data-new-thread-created"
        data = event["data"]
        assert data["threadId"] == thread_id
        assert data["title"] == "My Chat"
        assert data["createdAt"] == "2026-04-23T12:00:00+00:00"
        assert data["updatedAt"] == "2026-04-23T12:00:01+00:00"

    @pytest.mark.asyncio
    async def test_data_new_thread_created_null_title(self):
        """data-new-thread-created with null title should serialize correctly."""
        thread_id = str(uuid.uuid4())
        internal_events = [
            {
                "event": "data-new-thread-created",
                "thread_id": thread_id,
                "title": None,
                "created_at": "2026-04-23T12:00:00+00:00",
                "updated_at": "2026-04-23T12:00:00+00:00",
            },
        ]
        stream = adapt_stream_to_official_protocol(_stream_events_gen(internal_events))
        output = await _collect(stream)
        parsed = _parse_official_output(output)

        event = parsed[0]
        assert event["type"] == "data-new-thread-created"
        assert event["data"]["threadId"] == thread_id
        # title is None → JSON null
        assert event["data"]["title"] is None


