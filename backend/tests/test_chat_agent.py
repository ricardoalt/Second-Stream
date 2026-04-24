from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from pydantic_ai import BinaryContent
from pydantic_ai.messages import DocumentUrl

import app.agents.chat_agent as chat_agent_module
from app.agents.chat_agent import (
    ChatAgentDeps,
    ChatAgentError,
    ChatAgentOutput,
    _build_runtime_user_content,
    generate_chat_response,
    stream_chat_response,
)
from app.services.chat_stream_protocol import ChatAgentAttachmentInput


@pytest.mark.asyncio
async def test_generate_chat_response_uses_typed_deps_and_validates_output(monkeypatch):
    captured: dict[str, object] = {}

    async def _fake_run(prompt, *, deps):
        captured["prompt"] = prompt
        captured["deps"] = deps
        return SimpleNamespace(output={"response_text": "Here is the answer."})

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
        return SimpleNamespace(output={"response_text": ""})

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
    class _FakeStreamResult:
        async def stream_text(self, *, delta: bool, debounce_by: float | None = 0.1):
            assert delta is True
            yield "First "
            yield "chunk"

        def get_output(self):
            return ChatAgentOutput(response_text="First chunk")

    class _FakeRunStream:
        async def __aenter__(self):
            return _FakeStreamResult()

        async def __aexit__(self, exc_type, exc, tb):
            return False

    captured: dict[str, object] = {}

    def _fake_run_stream(prompt, *, deps):
        captured["prompt"] = prompt
        captured["deps"] = deps
        return _FakeRunStream()

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream", _fake_run_stream)

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
        {"event": "delta", "delta": "First "},
        {"event": "delta", "delta": "chunk"},
        {"event": "completed", "response_text": "First chunk"},
    ]
    assert "Attachment extracted content" in str(captured["prompt"])


@pytest.mark.asyncio
async def test_stream_chat_response_falls_back_to_non_stream_run_when_streaming_unavailable(monkeypatch):
    def _broken_run_stream(*_args, **_kwargs):
        raise RuntimeError("stream unavailable")

    async def _fallback_run(prompt, *, deps):
        return SimpleNamespace(output={"response_text": "Fallback answer"})

    monkeypatch.setattr(chat_agent_module.chat_agent, "run_stream", _broken_run_stream)
    monkeypatch.setattr(chat_agent_module.chat_agent, "run", _fallback_run)

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
        {"event": "delta", "delta": "Fallback answer"},
        {"event": "completed", "response_text": "Fallback answer"},
    ]


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
