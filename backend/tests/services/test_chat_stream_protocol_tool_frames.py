import json

import pytest

from app.services.chat_stream_protocol import adapt_stream_to_official_protocol


async def _collect(events):
    return [frame async for frame in adapt_stream_to_official_protocol(_agen(events))]


async def _agen(items):
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_tool_input_start_frame_shape():
    frames = await _collect(
        [
            {
                "event": "tool-input-start",
                "toolCallId": "call-1",
                "toolName": "generateIdeationBrief",
            },
            {"event": "completed"},
        ]
    )
    tool_frame = next(f for f in frames if "tool-input-start" in f)
    data = json.loads(tool_frame.replace("data: ", "").strip())
    assert data["type"] == "tool-input-start"
    assert data["toolCallId"] == "call-1"
    assert data["toolName"] == "generateIdeationBrief"


@pytest.mark.asyncio
async def test_tool_input_available_frame_shape():
    frames = await _collect(
        [
            {
                "event": "tool-input-available",
                "toolCallId": "call-1",
                "toolName": "generateIdeationBrief",
                "input": {"customer": "ExxonMobil"},
            },
            {"event": "completed"},
        ]
    )
    tool_frame = next(f for f in frames if "tool-input-available" in f)
    data = json.loads(tool_frame.replace("data: ", "").strip())
    assert data["type"] == "tool-input-available"
    assert data["toolCallId"] == "call-1"
    assert data["input"]["customer"] == "ExxonMobil"


@pytest.mark.asyncio
async def test_tool_input_delta_frame_shape():
    frames = await _collect(
        [
            {
                "event": "tool-input-delta",
                "toolCallId": "call-1",
                "inputTextDelta": '{"customer":"Ex',
            },
            {"event": "completed"},
        ]
    )
    tool_frame = next(f for f in frames if "tool-input-delta" in f)
    data = json.loads(tool_frame.replace("data: ", "").strip())
    assert data["type"] == "tool-input-delta"
    assert data["toolCallId"] == "call-1"
    assert data["inputTextDelta"] == '{"customer":"Ex'


@pytest.mark.asyncio
async def test_tool_output_available_frame_shape():
    frames = await _collect(
        [
            {
                "event": "tool-output-available",
                "toolCallId": "call-1",
                "output": {"attachmentId": "att-1", "filename": "report.pdf"},
            },
            {"event": "completed"},
        ]
    )
    tool_frame = next(f for f in frames if "tool-output-available" in f)
    data = json.loads(tool_frame.replace("data: ", "").strip())
    assert data["type"] == "tool-output-available"
    assert data["toolCallId"] == "call-1"
    assert "toolName" not in data  # CRITICAL: tool-output-available has no toolName
    assert data["output"]["filename"] == "report.pdf"


@pytest.mark.asyncio
async def test_tool_output_error_frame_shape():
    frames = await _collect(
        [
            {
                "event": "tool-output-error",
                "toolCallId": "call-1",
                "errorText": "PDF generation failed",
            },
            {"event": "completed"},
        ]
    )
    tool_frame = next(f for f in frames if "tool-output-error" in f)
    data = json.loads(tool_frame.replace("data: ", "").strip())
    assert data["type"] == "tool-output-error"
    assert data["toolCallId"] == "call-1"
    assert data["errorText"] == "PDF generation failed"


@pytest.mark.asyncio
async def test_existing_delta_events_unaffected():
    """Adding tool frames must not break existing delta/completed events."""
    frames = await _collect(
        [
            {"event": "start", "run_id": "run-1"},
            {"event": "delta", "delta": "Hello"},
            {"event": "completed"},
        ]
    )
    assert any("text-delta" in f for f in frames)
    assert any("[DONE]" in f for f in frames)
