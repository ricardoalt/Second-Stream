import importlib
from io import BytesIO
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from pydantic_ai import BinaryContent
from pydantic_ai.messages import (
    DocumentUrl,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartStartEvent,
    RetryPromptPart,
    TextPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
    ToolReturnPart,
)
from pydantic_ai.run import AgentRunResultEvent

from app.agents.chat_agent import (
    ChatAgentDeps,
    ChatAgentError,
    ChatAgentOutput,
    _build_runtime_user_content,
    generate_chat_response,
    stream_chat_response,
)
from app.services.chat_stream_protocol import ChatAgentAttachmentInput

chat_agent_module = importlib.import_module("app.agents.chat_agent")


@pytest.mark.asyncio
async def test_generate_chat_response_uses_typed_deps_and_validates_output(monkeypatch):
    captured: dict[str, object] = {}

    async def _fake_run(prompt, *, deps):
        captured["prompt"] = prompt
        captured["deps"] = deps
        return SimpleNamespace(output="Here is the answer.")

    monkeypatch.setattr(chat_agent_module.chat_agent, "run", _fake_run)

    deps = ChatAgentDeps(
        organization_id="org-123",
        user_id="user-123",
        thread_id="thread-123",
        run_id="run-123",
    )

    result = await generate_chat_response(prompt="Hello", deps=deps)

    assert isinstance(result, ChatAgentOutput)
    assert result.response_text == "Here is the answer."
    assert captured["prompt"] == "Hello"
    assert isinstance(captured["deps"], ChatAgentDeps)
    assert captured["deps"] == deps


@pytest.mark.asyncio
async def test_generate_chat_response_wraps_result_schema_validation_errors(monkeypatch):
    async def _fake_run(*_args, **_kwargs):
        return SimpleNamespace(output="")

    monkeypatch.setattr(chat_agent_module.chat_agent, "run", _fake_run)

    deps = ChatAgentDeps(
        organization_id="org-123",
        user_id="user-123",
        thread_id="thread-123",
        run_id="run-123",
    )

    with pytest.raises(ChatAgentError) as exc_info:
        await generate_chat_response(prompt="Hello", deps=deps)

    assert isinstance(exc_info.value.__cause__, ValidationError)


@pytest.mark.asyncio
async def test_generate_chat_response_wraps_agent_runtime_failures(monkeypatch):
    async def _boom(*_args, **_kwargs):
        raise RuntimeError("bedrock timeout")

    monkeypatch.setattr(chat_agent_module.chat_agent, "run", _boom)

    deps = ChatAgentDeps(
        organization_id="org-123",
        user_id="user-123",
        thread_id="thread-123",
        run_id="run-123",
    )

    with pytest.raises(ChatAgentError) as exc_info:
        await generate_chat_response(prompt="Hello", deps=deps)

    assert isinstance(exc_info.value.__cause__, RuntimeError)


@pytest.mark.asyncio
async def test_stream_chat_response_emits_incremental_deltas_and_completed(monkeypatch):
    captured: dict[str, object] = {}

    async def _fake_run_stream_events(prompt, *, deps):
        captured["prompt"] = prompt
        captured["deps"] = deps
        tool_call_id = "call-abc"
        yield PartStartEvent(index=1, part=ToolCallPart("webSearch", args={}, tool_call_id=tool_call_id))
        yield PartDeltaEvent(
            index=1,
            delta=ToolCallPartDelta(args_delta='{"customer":"Ex', tool_call_id=tool_call_id),
        )
        yield FunctionToolCallEvent(
            part=ToolCallPart("webSearch", args={"customer": "ExxonMobil"}, tool_call_id=tool_call_id)
        )
        yield FunctionToolResultEvent(
            result=ToolReturnPart(
                tool_name="generateIdeationBrief",
                tool_call_id=tool_call_id,
                content={"attachment_id": "att-1", "filename": "report.pdf"},
            )
        )
        yield PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="First "))
        yield PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="chunk"))
        yield AgentRunResultEvent(result=SimpleNamespace(output="First chunk"))

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _fake_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    attachments = [
        ChatAgentAttachmentInput(
            attachment_id="att-1",
            media_type="text/plain",
            filename="notes.txt",
            extracted_text="Attachment extracted content",
        )
    ]

    events = [
        event
        async for event in stream_chat_response(
            prompt="Question",
            deps=deps,
            attachments=attachments,
        )
    ]

    assert events == [
        {"event": "tool-input-start", "toolCallId": "call-abc", "toolName": "webSearch"},
        {"event": "tool-input-delta", "toolCallId": "call-abc", "inputTextDelta": '{"customer":"Ex'},
        {
            "event": "tool-input-available",
            "toolCallId": "call-abc",
            "toolName": "webSearch",
            "input": {"customer": "ExxonMobil"},
        },
        {
            "event": "tool-output-available",
            "toolCallId": "call-abc",
            "output": {"attachment_id": "att-1", "filename": "report.pdf"},
        },
        {"event": "delta", "delta": "First "},
        {"event": "delta", "delta": "chunk"},
        {"event": "completed", "response_text": "First chunk"},
    ]
    assert "Attachment extracted content" in str(captured["prompt"])


@pytest.mark.asyncio
async def test_stream_chat_response_maps_tool_output_error_events(monkeypatch):
    async def _fake_run_stream_events(_prompt, *, deps):
        _ = deps
        tool_call_id = "call-error"
        yield FunctionToolResultEvent(
            result=RetryPromptPart(
                tool_name="generateIdeationBrief",
                tool_call_id=tool_call_id,
                content="tool failed",
            )
        )
        yield AgentRunResultEvent(result=SimpleNamespace(output="done"))

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _fake_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )

    events = [
        event
        async for event in stream_chat_response(
            prompt="Question",
            deps=deps,
            attachments=[],
        )
    ]

    assert events == [
        {
            "event": "tool-output-error",
            "toolCallId": "call-error",
            "errorText": "tool failed\n\nFix the errors and try again.",
        },
        {"event": "completed", "response_text": "done"},
    ]


@pytest.mark.asyncio
async def test_stream_chat_response_uses_tool_call_id_from_part_index_for_delta_without_id(monkeypatch):
    async def _fake_run_stream_events(_prompt, *, deps):
        _ = deps
        yield PartStartEvent(
            index=5,
            part=ToolCallPart("webSearch", args={}, tool_call_id="call-from-start"),
        )
        yield PartDeltaEvent(index=5, delta=ToolCallPartDelta(args_delta='{"gate_status":"OPEN"}'))
        yield AgentRunResultEvent(result=SimpleNamespace(output="done"))

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _fake_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )

    events = [
        event
        async for event in stream_chat_response(
            prompt="Question",
            deps=deps,
            attachments=[],
        )
    ]

    assert events[0] == {
        "event": "tool-input-start",
        "toolCallId": "call-from-start",
        "toolName": "webSearch",
    }
    assert events[1] == {
        "event": "tool-input-delta",
        "toolCallId": "call-from-start",
        "inputTextDelta": '{"gate_status":"OPEN"}',
    }


@pytest.mark.asyncio
async def test_stream_chat_response_suppresses_pdf_tool_input_delta_only(monkeypatch):
    async def _fake_run_stream_events(_prompt, *, deps):
        _ = deps
        yield PartStartEvent(
            index=1,
            part=ToolCallPart("generateIdeationBrief", args={}, tool_call_id="pdf-call"),
        )
        yield PartDeltaEvent(
            index=1,
            delta=ToolCallPartDelta(args_delta='{"customer":"Ex"}', tool_call_id="pdf-call"),
        )
        yield PartStartEvent(
            index=2,
            part=ToolCallPart("webSearch", args={}, tool_call_id="web-call"),
        )
        yield PartDeltaEvent(
            index=2,
            delta=ToolCallPartDelta(args_delta='{"query":"waste"}', tool_call_id="web-call"),
        )
        yield AgentRunResultEvent(result=SimpleNamespace(output="done"))

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _fake_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )

    events = [
        event
        async for event in stream_chat_response(
            prompt="Question",
            deps=deps,
            attachments=[],
        )
    ]

    assert events == [
        {"event": "tool-input-start", "toolCallId": "pdf-call", "toolName": "generateIdeationBrief"},
        {"event": "tool-input-start", "toolCallId": "web-call", "toolName": "webSearch"},
        {"event": "tool-input-delta", "toolCallId": "web-call", "inputTextDelta": '{"query":"waste"}'},
        {"event": "completed", "response_text": "done"},
    ]


@pytest.mark.asyncio
async def test_stream_chat_response_raises_when_stream_crashes_before_terminal_result(monkeypatch):
    async def _broken_run_stream_events(_prompt, *, deps):
        _ = deps
        raise RuntimeError("stream unavailable")
        yield

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _broken_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )

    with pytest.raises(ChatAgentError) as exc_info:
        _ = [
            event
            async for event in stream_chat_response(
            prompt="Question",
            deps=deps,
            attachments=[],
        )
        ]

    assert isinstance(exc_info.value.__cause__, RuntimeError)


def test_build_runtime_user_content_uses_binary_for_local_image_attachment():
    runtime_input = _build_runtime_user_content(
        prompt="Analiza la imagen",
        attachments=[
            ChatAgentAttachmentInput(
                attachment_id="att-img",
                media_type="image/png",
                filename="image.png",
                binary_content=b"PNG",
            )
        ],
    )

    assert isinstance(runtime_input, list)
    assert isinstance(runtime_input[1], BinaryContent)


def test_build_runtime_user_content_uses_binary_for_pdf_attachment_when_bytes_available():
    runtime_input = _build_runtime_user_content(
        prompt="Analiza el PDF",
        attachments=[
            ChatAgentAttachmentInput(
                attachment_id="att-pdf",
                media_type="application/pdf",
                filename="report.pdf",
                binary_content=b"%PDF-1.7",
            )
        ],
    )

    assert isinstance(runtime_input, list)
    assert isinstance(runtime_input[1], BinaryContent)


def test_build_runtime_user_content_uses_document_url_for_s3_pdf_attachment():
    runtime_input = _build_runtime_user_content(
        prompt="Analiza el PDF",
        attachments=[
            ChatAgentAttachmentInput(
                attachment_id="att-pdf",
                media_type="application/pdf",
                filename="report.pdf",
                document_url="s3://bucket/chat/report.pdf",
            )
        ],
    )

    assert isinstance(runtime_input, list)
    assert isinstance(runtime_input[1], DocumentUrl)


@pytest.mark.asyncio
async def test_upload_pdf_requires_persist_attachment_when_upload_is_enabled():
    async def _upload_bytes(_storage_key, _data, _content_type):
        return "ok"

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
        upload_bytes=_upload_bytes,
    )
    ctx = SimpleNamespace(deps=deps)

    with pytest.raises(ChatAgentError):
        await chat_agent_module._upload_pdf(
            ctx,
            payload=SimpleNamespace(customer="Acme", stream="Caustic"),
            renderer=lambda _payload: BytesIO(b"%PDF-1.7"),
            filename_suffix="discovery-exec",
            tool_name="generateIdeationBrief",
        )


@pytest.mark.asyncio
async def test_upload_pdf_renders_in_thread_offload(monkeypatch):
    captured: dict[str, object] = {}

    async def _fake_to_thread(fn, payload):
        captured["fn"] = fn
        captured["payload"] = payload
        return BytesIO(b"%PDF-1.7")

    def _renderer(payload):
        return BytesIO(bytes(str(payload), "utf-8"))

    monkeypatch.setattr(chat_agent_module.asyncio, "to_thread", _fake_to_thread)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    payload = SimpleNamespace(customer="Acme", stream="Caustic")
    ctx = SimpleNamespace(deps=deps)

    result = await chat_agent_module._upload_pdf(
        ctx,
        payload=payload,
        renderer=_renderer,
        filename_suffix="discovery-exec",
        tool_name="generateAnalyticalRead",
    )

    assert captured["fn"] is _renderer
    assert captured["payload"] is payload
    assert result.size_bytes == len(b"%PDF-1.7")
    assert result.download_url is None
    assert result.view_url is None


@pytest.mark.asyncio
async def test_upload_pdf_returns_attachment_id_and_none_urls(monkeypatch):
    """Presigned URLs must not be exposed; attachment_id is the canonical handle."""
    async def _fake_to_thread(fn, payload):
        return BytesIO(b"%PDF-1.7")

    monkeypatch.setattr(chat_agent_module.asyncio, "to_thread", _fake_to_thread)

    class FakeRef:
        id = "att-ref-1"
        signed_url = "https://example.com/download"
        view_url = "https://example.com/view"
        signed_url_expires_at = None

    async def _persist(*, storage_key, filename, content_type, size_bytes, artifact_type=None):
        return FakeRef()

    async def _upload_bytes(storage_key, data, content_type):
        return "ok"

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
        upload_bytes=_upload_bytes,
        persist_attachment=_persist,
    )
    payload = SimpleNamespace(customer="Acme", stream="Caustic")
    ctx = SimpleNamespace(deps=deps)

    result = await chat_agent_module._upload_pdf(
        ctx,
        payload=payload,
        renderer=lambda p: BytesIO(b"%PDF-1.7"),
        filename_suffix="discovery-exec",
        tool_name="generateIdeationBrief",
    )

    assert result.attachment_id == "att-ref-1"
    assert result.download_url is None
    assert result.view_url is None
    assert result.expires_at is None


@pytest.mark.asyncio
async def test_upload_pdf_passes_artifact_type_to_persist(monkeypatch):
    """PDF tool outputs must carry artifact_type for rehydration."""
    async def _fake_to_thread(fn, payload):
        return BytesIO(b"%PDF-1.7")

    monkeypatch.setattr(chat_agent_module.asyncio, "to_thread", _fake_to_thread)

    captured: dict[str, object] = {}

    class FakeRef:
        id = "att-ref-2"

    async def _persist(*, storage_key, filename, content_type, size_bytes, artifact_type=None):
        captured["artifact_type"] = artifact_type
        return FakeRef()

    async def _upload_bytes(storage_key, data, content_type):
        return "ok"

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
        upload_bytes=_upload_bytes,
        persist_attachment=_persist,
    )
    payload = SimpleNamespace(customer="Acme", stream="Caustic")
    ctx = SimpleNamespace(deps=deps)

    result = await chat_agent_module._upload_pdf(
        ctx,
        payload=payload,
        renderer=lambda p: BytesIO(b"%PDF-1.7"),
        filename_suffix="playbook",
        tool_name="generatePlaybook",
    )

    assert result.attachment_id == "att-ref-2"
    assert captured["artifact_type"] == "generatePlaybook"
