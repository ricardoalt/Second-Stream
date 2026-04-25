import asyncio
import uuid
from datetime import UTC, datetime

import pytest
from conftest import create_org, create_user
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.chat_agent import ChatAgentError
from app.models.chat_attachment import ChatAttachment
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.user import UserRole
from app.services import chat_service
from app.services.chat_service import CHAT_MODEL_CONTEXT_WINDOW, stream_chat_turn


@pytest.fixture
def chat_session_factory(db_session):
    return async_sessionmaker(
        db_session.bind,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


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
async def test_stream_chat_turn_emits_start_delta_completed_and_persists_assistant(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Stream Org", "chat-stream-org")
    owner = await create_user(
        db_session,
        email=f"chat-stream-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    observed_counts: dict[str, int] = {}

    async def _fake_stream_response(*, prompt, deps, attachments):
        observed_counts["user_before_generation"] = await db_session.scalar(
            select(func.count())
            .select_from(ChatMessage)
            .where(ChatMessage.thread_id == thread.id, ChatMessage.role == "user")
        )
        observed_counts["assistant_before_generation"] = await db_session.scalar(
            select(func.count())
            .select_from(ChatMessage)
            .where(ChatMessage.thread_id == thread.id, ChatMessage.role == "assistant")
        )
        yield {"event": "delta", "delta": "First chunk"}
        yield {"event": "delta", "delta": "Second chunk."}
        yield {"event": "completed", "response_text": "First chunk. Second chunk."}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    events = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Help me analyze",
            run_id="run-stream-success",
        )
    ]

    assert events[0] == {"event": "start", "run_id": "run-stream-success"}
    assert events[1] == {"event": "delta", "delta": "First chunk"}
    assert events[2] == {"event": "delta", "delta": "Second chunk."}
    assert events[3]["event"] == "completed"
    assert uuid.UUID(events[3]["message_id"])
    assert observed_counts == {
        "user_before_generation": 1,
        "assistant_before_generation": 0,
    }

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
async def test_stream_chat_turn_emits_conversation_title_once_for_untitled_thread(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Title Org", "chat-title-org")
    owner = await create_user(
        db_session,
        email=f"chat-title-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)
    thread.title = None
    await db_session.commit()

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "Respuesta"}
        yield {"event": "completed", "response_text": "Respuesta"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    events = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Necesito analizar oportunidades de valorización",
            run_id="run-title-event",
        )
    ]

    assert events[0]["event"] == "data-conversation-title"
    assert events[0]["thread_id"] == str(thread.id)
    assert events[0]["title"] == "Necesito analizar oportunidades de valorización"
    assert events[1] == {"event": "start", "run_id": "run-title-event"}


@pytest.mark.asyncio
async def test_stream_chat_turn_emits_error_and_persists_failed_assistant(
    db_session,
    chat_session_factory,
    monkeypatch,
):
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

    async def _fail_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "Partial analysis"}
        raise ChatAgentError("bedrock timeout")

    monkeypatch.setattr(chat_service, "stream_chat_response", _fail_stream_response)

    events = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Analyze file",
            run_id="run-stream-error",
        )
    ]

    assert events == [
        {"event": "start", "run_id": "run-stream-error"},
        {"event": "delta", "delta": "Partial analysis"},
        {"event": "error", "code": "CHAT_STREAM_FAILED"},
    ]

    assistant_rows = await db_session.execute(
        select(ChatMessage).where(ChatMessage.thread_id == thread_id, ChatMessage.role == "assistant")
    )
    assistant_messages = assistant_rows.scalars().all()
    assert len(assistant_messages) == 1
    assert assistant_messages[0].status == "failed"
    assert assistant_messages[0].error_code == "CHAT_STREAM_FAILED"
    assert assistant_messages[0].content_text == (
        "Partial analysis\n\n"
        "[The agent failed before completing this response. Please retry.]"
    )

    user_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.thread_id == thread_id, ChatMessage.role == "user")
    )
    assert user_count == 1


@pytest.mark.asyncio
async def test_stream_chat_turn_cancelled_after_delta_does_not_persist_failed_assistant(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Stream Cancel Org", "chat-stream-cancel-org")
    owner = await create_user(
        db_session,
        email=f"chat-stream-cancel-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    async def _cancel_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "Partial analysis"}
        raise asyncio.CancelledError()

    monkeypatch.setattr(chat_service, "stream_chat_response", _cancel_stream_response)

    stream = stream_chat_turn(
        session_factory=chat_session_factory,
        organization_id=org.id,
        created_by_user_id=owner.id,
        thread_id=thread.id,
        content_text="Analyze file",
        run_id="run-stream-cancel",
    )

    assert await anext(stream) == {"event": "start", "run_id": "run-stream-cancel"}
    assert await anext(stream) == {"event": "delta", "delta": "Partial analysis"}
    with pytest.raises(asyncio.CancelledError):
        await anext(stream)

    assistant_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.thread_id == thread.id, ChatMessage.role == "assistant")
    )
    assert assistant_count == 0

    user_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.thread_id == thread.id, ChatMessage.role == "user")
    )
    assert user_count == 1


@pytest.mark.asyncio
async def test_stream_chat_turn_prompt_includes_active_user_turn_only_once(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Prompt Org", "chat-prompt-org")
    owner = await create_user(
        db_session,
        email=f"chat-prompt-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    await _create_message(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        thread_id=thread.id,
        role="user",
        text="earlier-user-message",
    )
    await _create_message(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        thread_id=thread.id,
        role="assistant",
        text="earlier-assistant-message",
    )

    captured_prompt: dict[str, str] = {}

    async def _fake_stream_response(*, prompt, deps, attachments):
        captured_prompt["value"] = prompt
        yield {"event": "delta", "delta": "Done"}
        yield {"event": "completed", "response_text": "Done"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    _ = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="current-user-message",
            run_id="run-prompt-dedup",
        )
    ]

    assert captured_prompt["value"].count("current-user-message") == 1
    assert "USER: earlier-user-message" in captured_prompt["value"]
    assert "ASSISTANT: earlier-assistant-message" in captured_prompt["value"]


@pytest.mark.asyncio
async def test_stream_chat_turn_prompt_with_empty_history_includes_single_user_turn(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Empty History Org", "chat-empty-history-org")
    owner = await create_user(
        db_session,
        email=f"chat-empty-history-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    captured_prompt: dict[str, str] = {}

    async def _fake_stream_response(*, prompt, deps, attachments):
        captured_prompt["value"] = prompt
        yield {"event": "delta", "delta": "Done"}
        yield {"event": "completed", "response_text": "Done"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    _ = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="lone-user-message",
            run_id="run-empty-history",
        )
    ]

    assert "(no previous messages)" in captured_prompt["value"]
    assert captured_prompt["value"].count("USER: lone-user-message") == 1
    assert "USER: USER: lone-user-message" not in captured_prompt["value"]


@pytest.mark.asyncio
async def test_stream_chat_turn_persists_full_history_but_uses_recent_window_for_model_context(
    db_session,
    chat_session_factory,
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

    async def _fake_stream_response(*, prompt, deps, attachments):
        captured_prompt["value"] = prompt
        yield {"event": "delta", "delta": "Done"}
        yield {"event": "completed", "response_text": "Done"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    _ = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="latest-user-message",
            run_id="run-history-window",
        )
    ]

    assert oldest_text not in captured_prompt["value"]
    assert first_in_window in captured_prompt["value"]
    assert captured_prompt["value"].count("latest-user-message") == 1
    assert captured_prompt["value"].index(first_in_window) < captured_prompt["value"].index("history-13")

    total_count = await db_session.scalar(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.thread_id == thread.id)
    )
    assert total_count == CHAT_MODEL_CONTEXT_WINDOW + 4


@pytest.mark.asyncio
async def test_stream_chat_turn_forwards_incremental_runtime_events_without_sentence_chunking(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Runtime Stream Org", "chat-runtime-stream-org")
    owner = await create_user(
        db_session,
        email=f"chat-runtime-stream-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "First "}
        yield {"event": "delta", "delta": "chunk"}
        yield {"event": "completed", "response_text": "First chunk"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response, raising=False)

    events = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Help me analyze",
            run_id="run-runtime-stream",
        )
    ]

    assert events[0] == {"event": "start", "run_id": "run-runtime-stream"}
    assert events[1] == {"event": "delta", "delta": "First "}
    assert events[2] == {"event": "delta", "delta": "chunk"}
    assert events[3]["event"] == "completed"
    assert uuid.UUID(events[3]["message_id"])


@pytest.mark.asyncio
async def test_stream_chat_turn_resolves_existing_attachments_and_passes_agent_consumable_inputs(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Attachments Stream Org", "chat-attachments-stream-org")
    owner = await create_user(
        db_session,
        email=f"chat-attachments-stream-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    draft_attachment = ChatAttachment(
        organization_id=org.id,
        uploaded_by_user_id=owner.id,
        message_id=None,
        storage_key=f"chat/{org.id}/{owner.id}/att-1",
        original_filename="evidence.txt",
        content_type="text/plain",
        size_bytes=128,
        extracted_text="Extracted evidence body",
    )
    db_session.add(draft_attachment)
    await db_session.commit()
    await db_session.refresh(draft_attachment)

    captured: dict[str, object] = {}

    async def _fake_stream_response(*, prompt, deps, attachments):
        captured["attachments"] = attachments
        yield {"event": "delta", "delta": "Used attachment"}
        yield {"event": "completed", "response_text": "Used attachment"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response, raising=False)

    events = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Please use my attachment",
            run_id="run-with-attachment",
            existing_attachment_ids=[draft_attachment.id],
        )
    ]

    assert events[0] == {"event": "start", "run_id": "run-with-attachment"}
    assert events[1] == {"event": "delta", "delta": "Used attachment"}
    assert events[2]["event"] == "completed"

    resolved_inputs = captured["attachments"]
    assert len(resolved_inputs) == 1
    assert resolved_inputs[0].attachment_id == str(draft_attachment.id)
    assert resolved_inputs[0].uploaded_file_ref == draft_attachment.storage_key
    assert resolved_inputs[0].extracted_text == "Extracted evidence body"


@pytest.mark.asyncio
async def test_stream_chat_turn_cleans_up_uploaded_storage_key_when_tool_run_fails_before_row_persist(
    db_session,
    chat_session_factory,
    monkeypatch,
):
    org = await create_org(db_session, "Chat Cleanup Org", "chat-cleanup-org")
    owner = await create_user(
        db_session,
        email=f"chat-cleanup-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    deleted_keys: list[str] = []

    async def _capture_delete(storage_key: str):
        deleted_keys.append(storage_key)

    async def _fake_upload(_data, storage_key: str, _content_type: str):
        return storage_key

    async def _fake_stream_response(*, prompt, deps, attachments):
        _ = (prompt, attachments)
        await deps.upload_bytes("chat/test/orphan.pdf", b"%PDF-1.7", "application/pdf")
        raise ChatAgentError("tool execution failed")
        yield

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response, raising=False)
    monkeypatch.setattr("app.services.s3_service.upload_file_to_s3", _fake_upload)
    monkeypatch.setattr("app.services.s3_service.delete_file_from_s3", _capture_delete)

    events = [
        event
        async for event in stream_chat_turn(
            session_factory=chat_session_factory,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Generate report",
            run_id="run-storage-cleanup",
        )
    ]

    assert events == [
        {"event": "start", "run_id": "run-storage-cleanup"},
        {"event": "error", "code": "CHAT_STREAM_FAILED"},
    ]
    assert deleted_keys == ["chat/test/orphan.pdf"]
