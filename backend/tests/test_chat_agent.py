import asyncio
import importlib
from io import BytesIO
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from pydantic_ai import BinaryContent, ModelRetry
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
async def test_stream_chat_response_suppresses_retry_prompt_part_from_user_stream(monkeypatch):
    """RetryPromptPart is an internal retry signal; it must not surface as tool-output-error."""
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

    # RetryPromptPart must be suppressed; only terminal events reach the client.
    assert events == [
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


def test_chat_agent_model_settings_include_max_tokens():
    from unittest.mock import MagicMock, patch

    class FakeAgent:
        def __init__(self, *args, **kwargs):
            self._init_kwargs = kwargs

        def instructions(self, fn):
            return fn

        def tool(self, *args, **kwargs):
            def decorator(fn):
                return fn

            return decorator

    fake_instance = FakeAgent()
    with patch(
        "app.agents.chat_agent.Agent",
        MagicMock(return_value=fake_instance),
    ) as mock_agent_cls:
        from app.agents.chat_agent import _make_agent

        _make_agent()
        call_kwargs = mock_agent_cls.call_args.kwargs
        assert "model_settings" in call_kwargs
        assert call_kwargs["model_settings"]["max_tokens"] == 32768
        assert "parallel_tool_calls" not in call_kwargs["model_settings"]


class _CaptureLogger:
    def __init__(self):
        self.calls: list[dict] = []

    def info(self, event, **kwargs):
        self.calls.append({"level": "info", "event": event, "kwargs": kwargs})

    def warning(self, event, **kwargs):
        self.calls.append({"level": "warning", "event": event, "kwargs": kwargs})

    def error(self, event, **kwargs):
        self.calls.append({"level": "error", "event": event, "kwargs": kwargs})


@pytest.mark.asyncio
async def test_generate_chat_response_emits_run_started_event(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    async def _fake_run(prompt, *, deps):
        return SimpleNamespace(output="Answer.")

    monkeypatch.setattr(chat_agent_module.chat_agent, "run", _fake_run)

    deps = ChatAgentDeps(
        organization_id="org-123",
        user_id="user-123",
        thread_id="thread-123",
        run_id="run-123",
    )
    result = await generate_chat_response(prompt="Hello", deps=deps)
    assert result.response_text == "Answer."

    started = [c for c in capture.calls if c["event"] == "chat_agent_run_started"]
    assert len(started) == 1
    assert started[0]["kwargs"]["run_id"] == "run-123"
    assert "available_skills" in started[0]["kwargs"]
    assert started[0]["kwargs"]["available_skills"] is not None
    assert isinstance(started[0]["kwargs"]["attachment_count"], int)


@pytest.mark.asyncio
async def test_generate_chat_response_error_log_includes_available_skills(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    async def _boom(*_args, **_kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(chat_agent_module.chat_agent, "run", _boom)

    deps = ChatAgentDeps(
        organization_id="org-123",
        user_id="user-123",
        thread_id="thread-123",
        run_id="run-123",
    )
    with pytest.raises(ChatAgentError):
        await generate_chat_response(prompt="Hello", deps=deps)

    error_calls = [c for c in capture.calls if c["event"] == "chat_agent_run_failed"]
    assert len(error_calls) == 1
    assert "available_skills" in error_calls[0]["kwargs"]


@pytest.mark.asyncio
async def test_stream_chat_response_emits_run_started_event(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    async def _fake_run_stream_events(prompt, *, deps):
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
    assert events == [{"event": "completed", "response_text": "done"}]

    started = [c for c in capture.calls if c["event"] == "chat_agent_run_started"]
    assert len(started) == 1
    assert started[0]["kwargs"]["run_id"] == "run-1"
    assert "available_skills" in started[0]["kwargs"]
    assert started[0]["kwargs"]["attachment_count"] == 0


@pytest.mark.asyncio
async def test_stream_chat_response_emits_tool_started_and_completed(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    async def _fake_run_stream_events(_prompt, *, deps):
        tool_call_id = "call-abc"
        yield PartStartEvent(index=1, part=ToolCallPart("generateIdeationBrief", args={}, tool_call_id=tool_call_id))
        yield FunctionToolResultEvent(
            result=ToolReturnPart(
                tool_name="generateIdeationBrief",
                tool_call_id=tool_call_id,
                content={"attachment_id": "att-1", "filename": "report.pdf"},
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
    _ = [
        event
        async for event in stream_chat_response(
            prompt="Question",
            deps=deps,
            attachments=[],
        )
    ]

    started = [c for c in capture.calls if c["event"] == "chat_agent_tool_started"]
    assert len(started) == 1
    assert started[0]["kwargs"]["tool_name"] == "generateIdeationBrief"
    assert started[0]["kwargs"]["tool_call_id"] == "call-abc"

    completed = [c for c in capture.calls if c["event"] == "chat_agent_tool_completed"]
    assert len(completed) == 1
    assert completed[0]["kwargs"]["tool_name"] == "generateIdeationBrief"
    assert completed[0]["kwargs"]["tool_call_id"] == "call-abc"


@pytest.mark.asyncio
async def test_stream_chat_response_cancel_log_includes_active_skills_and_tools_called(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    async def _fake_run_stream_events(_prompt, *, deps):
        tool_call_id = "call-abc"
        yield PartStartEvent(index=1, part=ToolCallPart("webSearch", args={}, tool_call_id=tool_call_id))
        raise asyncio.CancelledError()

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _fake_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    with pytest.raises(asyncio.CancelledError):
        _ = [
            event
            async for event in stream_chat_response(
                prompt="Question",
                deps=deps,
                attachments=[],
            )
        ]

    cancel_logs = [c for c in capture.calls if c["event"] == "chat_agent_stream_cancelled"]
    assert len(cancel_logs) == 1
    assert "available_skills" in cancel_logs[0]["kwargs"]
    assert "tools_called" in cancel_logs[0]["kwargs"]
    assert cancel_logs[0]["kwargs"]["tools_called"] == [
        {"tool_name": "webSearch", "tool_call_id": "call-abc"}
    ]


@pytest.mark.asyncio
async def test_stream_chat_response_failure_log_includes_available_skills_and_tools_called(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    async def _fake_run_stream_events(_prompt, *, deps):
        tool_call_id = "call-abc"
        yield PartStartEvent(index=1, part=ToolCallPart("webSearch", args={}, tool_call_id=tool_call_id))
        raise RuntimeError("stream broke")

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _fake_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    with pytest.raises(ChatAgentError):
        _ = [
            event
            async for event in stream_chat_response(
                prompt="Question",
                deps=deps,
                attachments=[],
            )
        ]

    fail_logs = [c for c in capture.calls if c["event"] == "chat_agent_stream_failed"]
    assert len(fail_logs) == 1
    assert "available_skills" in fail_logs[0]["kwargs"]
    assert "tools_called" in fail_logs[0]["kwargs"]
    assert fail_logs[0]["kwargs"]["tools_called"] == [
        {"tool_name": "webSearch", "tool_call_id": "call-abc"}
    ]


@pytest.mark.asyncio
async def test_load_skill_tool_returns_skill_content(monkeypatch):
    monkeypatch.setattr(
        chat_agent_module,
        "_load_skill_tool_impl",
        chat_agent_module._load_skill_tool_impl,
    )

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    ctx = SimpleNamespace(deps=deps)

    result = await chat_agent_module._load_skill_tool_impl(ctx, name="safety-flagging")
    assert result["skill_name"] == "safety-flagging"
    assert len(result["content"]) > 100
    assert "---" not in result["content"]


@pytest.mark.asyncio
async def test_load_skill_tool_logs_chat_agent_skill_loaded(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    ctx = SimpleNamespace(deps=deps)

    result = await chat_agent_module._load_skill_tool_impl(ctx, name="discovery-reporting")
    assert result["skill_name"] == "discovery-reporting"

    loaded = [c for c in capture.calls if c["event"] == "chat_agent_skill_loaded"]
    assert len(loaded) == 1
    assert loaded[0]["kwargs"]["skill_name"] == "discovery-reporting"
    assert loaded[0]["kwargs"]["run_id"] == "run-1"
    assert loaded[0]["kwargs"]["source"] == "model_tool_call"


@pytest.mark.asyncio
async def test_load_skill_tool_rejects_unknown_skill():
    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    ctx = SimpleNamespace(deps=deps)

    with pytest.raises(ModelRetry):
        await chat_agent_module._load_skill_tool_impl(ctx, name="nonexistent-skill")


@pytest.mark.asyncio
async def test_load_skill_tool_rejects_path_traversal():
    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-1",
    )
    ctx = SimpleNamespace(deps=deps)

    with pytest.raises(ModelRetry):
        await chat_agent_module._load_skill_tool_impl(ctx, name="../../../etc/passwd")


@pytest.mark.asyncio
async def test_stream_chat_response_sanitizes_load_skill_output(monkeypatch):
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    async def _fake_run_stream_events(_prompt, *, deps):
        tool_call_id = "call-skill"
        yield PartStartEvent(index=1, part=ToolCallPart("loadSkill", args={"name": "safety-flagging"}, tool_call_id=tool_call_id))
        yield FunctionToolCallEvent(part=ToolCallPart("loadSkill", args={"name": "safety-flagging"}, tool_call_id=tool_call_id))
        yield FunctionToolResultEvent(
            result=ToolReturnPart(
                tool_name="loadSkill",
                tool_call_id=tool_call_id,
                content={"skill_name": "safety-flagging", "content": "INTERNAL SKILL BODY"},
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

    assert all("INTERNAL SKILL BODY" not in str(event) for event in events)
    # Should emit a sanitized tool-output-available event with status-only payload
    output_events = [e for e in events if e.get("event") == "tool-output-available"]
    assert len(output_events) == 1
    assert output_events[0]["output"] == {"skill_name": "safety-flagging", "status": "loaded"}
    assert events[-1] == {"event": "completed", "response_text": "done"}


@pytest.mark.asyncio
async def test_stream_chat_response_logs_parallel_load_skill_batch(monkeypatch):
    """Multiple tool starts in the same model step must be logged as one batch."""
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    skill_names = ["sds-interpretation", "sub-discipline-router", "safety-flagging"]

    async def _fake_run_stream_events(_prompt, *, deps):
        _ = deps
        for index, skill_name in enumerate(skill_names, start=1):
            yield PartStartEvent(
                index=index,
                part=ToolCallPart(
                    "loadSkill",
                    args={"name": skill_name},
                    tool_call_id=f"call-{index}",
                ),
            )
        for index, skill_name in enumerate(skill_names, start=1):
            yield FunctionToolCallEvent(
                part=ToolCallPart(
                    "loadSkill",
                    args={"name": skill_name},
                    tool_call_id=f"call-{index}",
                )
            )
        for index, skill_name in enumerate(skill_names, start=1):
            yield FunctionToolResultEvent(
                result=ToolReturnPart(
                    tool_name="loadSkill",
                    tool_call_id=f"call-{index}",
                    content={"skill_name": skill_name, "content": f"INTERNAL {skill_name}"},
                )
            )
        yield AgentRunResultEvent(result=SimpleNamespace(output="done"))

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream_events", _fake_run_stream_events)

    deps = ChatAgentDeps(
        organization_id="org-1",
        user_id="user-1",
        thread_id="thread-1",
        run_id="run-batch",
    )
    events = [
        event
        async for event in stream_chat_response(
            prompt="Question",
            deps=deps,
            attachments=[],
        )
    ]

    batch_logs = [c for c in capture.calls if c["event"] == "chat_agent_tool_call_batch"]
    assert len(batch_logs) == 1
    assert batch_logs[0]["kwargs"]["run_id"] == "run-batch"
    assert batch_logs[0]["kwargs"]["batch_size"] == 3
    assert batch_logs[0]["kwargs"]["tool_names"] == ["loadSkill", "loadSkill", "loadSkill"]
    assert batch_logs[0]["kwargs"]["tool_call_ids"] == ["call-1", "call-2", "call-3"]

    output_events = [e for e in events if e.get("event") == "tool-output-available"]
    assert [e["output"] for e in output_events] == [
        {"skill_name": "sds-interpretation", "status": "loaded"},
        {"skill_name": "sub-discipline-router", "status": "loaded"},
        {"skill_name": "safety-flagging", "status": "loaded"},
    ]
    assert all("INTERNAL" not in str(event) for event in events)


@pytest.mark.asyncio
async def test_stream_chat_response_emits_agent_status_for_load_skill(monkeypatch):
    """loadSkill start and end must emit semantic agent-status events without leaking skill names."""
    async def _fake_run_stream_events(_prompt, *, deps):
        _ = deps
        tool_call_id = "call-skill"
        yield PartStartEvent(index=1, part=ToolCallPart("loadSkill", args={"name": "discovery-reporting"}, tool_call_id=tool_call_id))
        yield FunctionToolCallEvent(part=ToolCallPart("loadSkill", args={"name": "discovery-reporting"}, tool_call_id=tool_call_id))
        yield FunctionToolResultEvent(
            result=ToolReturnPart(
                tool_name="loadSkill",
                tool_call_id=tool_call_id,
                content={"skill_name": "discovery-reporting", "content": "INTERNAL SKILL BODY"},
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

    status_events = [e for e in events if e.get("event") == "agent-status"]
    assert len(status_events) == 1
    assert status_events[0] == {"event": "agent-status", "phase": "preparing-analysis", "label": "Preparing analysis..."}
    # No skill name must appear in any agent-status event
    for e in status_events:
        assert "discovery-reporting" not in str(e)


@pytest.mark.asyncio
async def test_stream_chat_response_clears_agent_status_when_pdf_tool_starts(monkeypatch):
    """When a visible PDF tool starts after loadSkill, agent-status must emit idle to clear shimmer."""
    async def _fake_run_stream_events(_prompt, *, deps):
        _ = deps
        skill_call_id = "call-skill"
        pdf_call_id = "call-pdf"
        yield PartStartEvent(index=1, part=ToolCallPart("loadSkill", args={"name": "discovery-reporting"}, tool_call_id=skill_call_id))
        yield PartStartEvent(index=2, part=ToolCallPart("generateIdeationBrief", args={}, tool_call_id=pdf_call_id))
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

    status_events = [e for e in events if e.get("event") == "agent-status"]
    assert len(status_events) == 2
    assert status_events[0] == {"event": "agent-status", "phase": "preparing-analysis", "label": "Preparing analysis..."}
    assert status_events[1] == {"event": "agent-status", "phase": "idle", "label": ""}


@pytest.mark.asyncio
async def test_stream_chat_response_load_skill_status_persists_until_text_delta(monkeypatch):
    """Preparing analysis status must remain until the next text delta arrives."""
    async def _fake_run_stream_events(_prompt, *, deps):
        _ = deps
        tool_call_id = "call-skill"
        yield PartStartEvent(index=1, part=ToolCallPart("loadSkill", args={"name": "discovery-reporting"}, tool_call_id=tool_call_id))
        yield FunctionToolCallEvent(part=ToolCallPart("loadSkill", args={"name": "discovery-reporting"}, tool_call_id=tool_call_id))
        yield FunctionToolResultEvent(
            result=ToolReturnPart(
                tool_name="loadSkill",
                tool_call_id=tool_call_id,
                content={"skill_name": "discovery-reporting", "content": "INTERNAL SKILL BODY"},
            )
        )
        yield PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="Here is "))
        yield PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="the analysis."))
        yield AgentRunResultEvent(result=SimpleNamespace(output="Here is the analysis."))

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
        {"event": "agent-status", "phase": "preparing-analysis", "label": "Preparing analysis..."},
        {"event": "tool-input-start", "toolCallId": "call-skill", "toolName": "loadSkill"},
        {
            "event": "tool-input-available",
            "toolCallId": "call-skill",
            "toolName": "loadSkill",
            "input": {"name": "discovery-reporting"},
        },
        {
            "event": "tool-output-available",
            "toolCallId": "call-skill",
            "output": {"skill_name": "discovery-reporting", "status": "loaded"},
        },
        {"event": "agent-status", "phase": "idle", "label": ""},
        {"event": "delta", "delta": "Here is "},
        {"event": "delta", "delta": "the analysis."},
        {"event": "completed", "response_text": "Here is the analysis."},
    ]


@pytest.mark.asyncio
async def test_stream_chat_response_survives_tool_input_parse_failure(monkeypatch):
    """FunctionToolCallEvent args parse failure must not fail the stream."""
    capture = _CaptureLogger()
    monkeypatch.setattr(chat_agent_module, "logger", capture)

    class _BadToolCallPart(ToolCallPart):
        def args_as_dict(self):
            raise ValueError("malformed json")

    async def _fake_run_stream_events(_prompt, *, deps):
        tool_call_id = "call-bad"
        yield PartStartEvent(index=1, part=ToolCallPart("webSearch", args={}, tool_call_id=tool_call_id))
        yield FunctionToolCallEvent(part=_BadToolCallPart("webSearch", args="not-valid-json", tool_call_id=tool_call_id))
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

    assert events[-1] == {"event": "completed", "response_text": "done"}
    # Input-available should survive with empty input dict
    input_available = [e for e in events if e.get("event") == "tool-input-available"]
    assert len(input_available) == 1
    assert input_available[0]["input"] == {}
    # Warning should be logged
    warn_calls = [c for c in capture.calls if c["event"] == "chat_agent_tool_input_parse_failed"]
    assert len(warn_calls) == 1
    assert warn_calls[0]["kwargs"]["tool_name"] == "webSearch"
