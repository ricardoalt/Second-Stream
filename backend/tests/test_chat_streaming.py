import uuid
from datetime import UTC, datetime

import pytest
from conftest import create_org, create_user
from sqlalchemy import func, select

from app.agents.chat_agent import ChatAgentError
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.user import UserRole
from app.services import chat_service
from app.services.chat_service import CHAT_MODEL_CONTEXT_WINDOW, stream_chat_turn


async def _create_thread(db_session, *, org_id: uuid.UUID, owner_id: uuid.UUID) -> ChatThread:
    thread = ChatThread(
        organization_id=org_id,
        created_by_user_id=owner_id,
        title="Thread",
        last_message_preview="",
        last_message_at=datetime.now(UTC),
    )
    db_session.add(thread)
    await db_session.commit()
    await db_session.refresh(thread)
    return thread


async def _create_message(
    db_session,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    thread_id: uuid.UUID,
    role: str,
    text: str,
) -> ChatMessage:
    message = ChatMessage(
        organization_id=org_id,
        thread_id=thread_id,
        created_by_user_id=user_id,
        role=role,
        content_text=text,
        status="completed",
    )
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)
    return message


@pytest.mark.asyncio
async def test_stream_chat_turn_emits_start_delta_completed_and_persists_assistant(db_session, monkeypatch):
    org = await create_org(db_session, "Chat Stream Org", "chat-stream-org")
    owner = await create_user(
        db_session,
        email=f"chat-stream-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    async def _fake_generate(*, prompt, deps):
        return chat_service.ChatAgentOutput(response_text="First chunk. Second chunk.")

    monkeypatch.setattr(chat_service, "generate_chat_response", _fake_generate)

    events = [
        event
        async for event in stream_chat_turn(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Help me analyze",
            run_id="run-stream-success",
        )
    ]

    assert events[0]["event"] == "start"
    assert events[1]["event"] == "delta"
    assert events[2]["event"] == "delta"
    assert events[3]["event"] == "completed"

    assistant_rows = await db_session.execute(
        select(ChatMessage).where(
            ChatMessage.thread_id == thread.id,
            ChatMessage.role == "assistant",
        )
    )
    assistant_messages = assistant_rows.scalars().all()
    assert len(assistant_messages) == 1
    assert assistant_messages[0].content_text == "First chunk. Second chunk."


@pytest.mark.asyncio
async def test_stream_chat_turn_emits_error_and_does_not_persist_partial_assistant(db_session, monkeypatch):
    org = await create_org(db_session, "Chat Stream Error Org", "chat-stream-error-org")
    owner = await create_user(
        db_session,
        email=f"chat-stream-error-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)
    thread_id = thread.id

    async def _fail_generate(*, prompt, deps):
        raise ChatAgentError("bedrock timeout")

    monkeypatch.setattr(chat_service, "generate_chat_response", _fail_generate)

    events = [
        event
        async for event in stream_chat_turn(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Analyze file",
            run_id="run-stream-error",
        )
    ]

    assert [item["event"] for item in events] == ["start", "error"]

    assistant_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.thread_id == thread_id, ChatMessage.role == "assistant")
    )
    assert assistant_count == 0

    user_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.thread_id == thread_id, ChatMessage.role == "user")
    )
    assert user_count == 1


@pytest.mark.asyncio
async def test_stream_chat_turn_persists_full_history_but_uses_recent_window_for_model_context(
    db_session,
    monkeypatch,
):
    org = await create_org(db_session, "Chat History Org", "chat-history-org")
    owner = await create_user(
        db_session,
        email=f"chat-history-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    oldest_text = "oldest-message-text"
    first_in_window = "window-first-message"
    for idx in range(CHAT_MODEL_CONTEXT_WINDOW + 2):
        text = f"history-{idx}"
        if idx == 0:
            text = oldest_text
        if idx == 3:
            text = first_in_window
        await _create_message(
            db_session,
            org_id=org.id,
            user_id=owner.id,
            thread_id=thread.id,
            role="user",
            text=text,
        )

    captured_prompt: dict[str, str] = {}

    async def _fake_generate(*, prompt, deps):
        captured_prompt["value"] = prompt
        return chat_service.ChatAgentOutput(response_text="Done")

    monkeypatch.setattr(chat_service, "generate_chat_response", _fake_generate)

    _ = [
        event
        async for event in stream_chat_turn(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="latest-user-message",
            run_id="run-history-window",
        )
    ]

    assert oldest_text not in captured_prompt["value"]
    assert first_in_window in captured_prompt["value"]
    assert "latest-user-message" in captured_prompt["value"]

    total_count = await db_session.scalar(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.thread_id == thread.id)
    )
    assert total_count == CHAT_MODEL_CONTEXT_WINDOW + 4
