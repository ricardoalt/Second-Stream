from types import SimpleNamespace

import pytest
from pydantic import ValidationError

import app.agents.chat_agent as chat_agent_module
from app.agents.chat_agent import (
    ChatAgentDeps,
    ChatAgentError,
    ChatAgentOutput,
    generate_chat_response,
)


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
