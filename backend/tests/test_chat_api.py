import io
import json
import uuid

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient
from sqlalchemy import func, select

from app.agents.chat_agent import ChatAgentError
from app.models.chat_message import ChatMessage
from app.models.user import UserRole
from app.services import chat_service


async def _create_authed_user(db_session, set_current_user):
    org = await create_org(db_session, "Chat API Org", "chat-api-org")
    user = await create_user(
        db_session,
        email=f"chat-api-user-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)
    return org, user


def _assert_error_contract(response, expected_status: int, expected_code: str) -> None:
    assert response.status_code == expected_status
    payload = response.json()
    assert payload["code"] == expected_code
    assert isinstance(payload["message"], str)


def _parse_sse_events(payload: str) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    for raw_event in payload.strip().split("\n\n"):
        if not raw_event:
            continue
        lines = raw_event.splitlines()
        event_name = lines[0].removeprefix("event: ")
        data = json.loads(lines[1].removeprefix("data: "))
        events.append({"event": event_name, "data": data})
    return events


@pytest.mark.asyncio
async def test_chat_thread_create_list_and_detail_contract(client: AsyncClient, db_session, set_current_user):
    _org, _user = await _create_authed_user(db_session, set_current_user)

    create_first = await client.post("/api/v1/chat/threads", json={"title": "First"})
    assert create_first.status_code == 201
    first_payload = create_first.json()
    assert first_payload["title"] == "First"
    assert "id" in first_payload

    create_second = await client.post("/api/v1/chat/threads", json={"title": "Second"})
    assert create_second.status_code == 201
    second_payload = create_second.json()

    list_response = await client.get("/api/v1/chat/threads")
    assert list_response.status_code == 200
    rows = list_response.json()["items"]
    assert len(rows) == 2
    listed_ids = {row["id"] for row in rows}
    assert listed_ids == {first_payload["id"], second_payload["id"]}

    detail_response = await client.get(f"/api/v1/chat/threads/{first_payload['id']}")
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["id"] == first_payload["id"]
    assert detail_payload["messages"] == []


@pytest.mark.asyncio
async def test_chat_detail_denies_cross_user_visibility(client: AsyncClient, db_session, set_current_user):
    org = await create_org(db_session, "Chat API Cross User Org", "chat-api-cross-user-org")
    owner = await create_user(
        db_session,
        email=f"chat-api-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other_user = await create_user(
        db_session,
        email=f"chat-api-other-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(owner)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Owner"})
    thread_id = create_thread.json()["id"]

    set_current_user(other_user)
    detail_response = await client.get(f"/api/v1/chat/threads/{thread_id}")
    _assert_error_contract(detail_response, 404, "RESOURCE_NOT_FOUND")


@pytest.mark.asyncio
async def test_chat_message_owned_attachment_upload_contract(client: AsyncClient, db_session, set_current_user):
    org, user = await _create_authed_user(db_session, set_current_user)

    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Attachment Thread"})
    thread_id = create_thread.json()["id"]

    async def _fake_generate(*, prompt, deps):
        return chat_service.ChatAgentOutput(response_text="Attachment upload turn response")

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(chat_service, "generate_chat_response", _fake_generate)
    try:
        stream_response = await client.post(
            f"/api/v1/chat/threads/{thread_id}/messages/stream",
            json={"contentText": "Create initial user message"},
        )
        assert stream_response.status_code == 200
    finally:
        monkeypatch.undo()

    user_message_id = await db_session.scalar(
        select(ChatMessage.id).where(
            ChatMessage.thread_id == uuid.UUID(thread_id),
            ChatMessage.organization_id == org.id,
            ChatMessage.created_by_user_id == user.id,
            ChatMessage.role == "user",
        )
    )
    assert user_message_id is not None

    upload_response = await client.post(
        f"/api/v1/chat/messages/{user_message_id}/attachments",
        files={"file": ("report.txt", io.BytesIO(b"chat attachment"), "text/plain")},
    )
    assert upload_response.status_code == 201
    attachment_payload = upload_response.json()
    assert attachment_payload["messageId"] == str(user_message_id)
    assert attachment_payload["contentType"] == "text/plain"
    assert attachment_payload["sizeBytes"] == len(b"chat attachment")

    detail_response = await client.get(f"/api/v1/chat/threads/{thread_id}")
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    user_messages = [row for row in detail_payload["messages"] if row["role"] == "user"]
    assert len(user_messages) == 1
    assert len(user_messages[0]["attachments"]) == 1
    assert user_messages[0]["attachments"][0]["messageId"] == str(user_message_id)


@pytest.mark.asyncio
async def test_chat_stream_success_contract(client: AsyncClient, db_session, set_current_user, monkeypatch):
    org, user = await _create_authed_user(db_session, set_current_user)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Stream Success"})
    thread_id = create_thread.json()["id"]

    async def _fake_generate(*, prompt, deps):
        return chat_service.ChatAgentOutput(response_text="First chunk. Second chunk.")

    monkeypatch.setattr(chat_service, "generate_chat_response", _fake_generate)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "Stream me"},
    )
    events = _parse_sse_events(response.text)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert [event["event"] for event in events] == ["start", "delta", "delta", "completed"]
    assert isinstance(events[0]["data"]["run_id"], str)
    assert events[0]["data"]["run_id"]
    assert events[1]["data"] == {"delta": "First chunk"}
    assert events[2]["data"] == {"delta": "Second chunk."}
    assert uuid.UUID(events[3]["data"]["message_id"])

    assistant_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(
            ChatMessage.thread_id == uuid.UUID(thread_id),
            ChatMessage.organization_id == org.id,
            ChatMessage.created_by_user_id == user.id,
            ChatMessage.role == "assistant",
        )
    )
    assert assistant_count == 1


@pytest.mark.asyncio
async def test_chat_stream_error_contract_without_partial_assistant(
    client: AsyncClient,
    db_session,
    set_current_user,
    monkeypatch,
):
    org, user = await _create_authed_user(db_session, set_current_user)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Stream Error"})
    thread_id = create_thread.json()["id"]

    async def _fail_generate(*, prompt, deps):
        raise ChatAgentError("forced model failure")

    monkeypatch.setattr(chat_service, "generate_chat_response", _fail_generate)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "This should fail"},
    )
    events = _parse_sse_events(response.text)

    assert response.status_code == 200
    assert [event["event"] for event in events] == ["start", "error"]
    assert isinstance(events[0]["data"]["run_id"], str)
    assert events[0]["data"]["run_id"]
    assert events[1]["data"] == {"code": "CHAT_STREAM_FAILED"}

    assistant_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(
            ChatMessage.thread_id == uuid.UUID(thread_id),
            ChatMessage.organization_id == org.id,
            ChatMessage.created_by_user_id == user.id,
            ChatMessage.role == "assistant",
        )
    )
    assert assistant_count == 0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "path_suffix"),
    [
        ("post", "/messages/message-does-not-exist/regenerate"),
        ("post", "/messages/message-does-not-exist/branch"),
    ],
)
async def test_chat_phase1_unsupported_actions_are_unavailable_and_history_is_unchanged(
    client: AsyncClient,
    db_session,
    set_current_user,
    monkeypatch,
    method: str,
    path_suffix: str,
):
    org, user = await _create_authed_user(db_session, set_current_user)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Unsupported actions"})
    thread_id = create_thread.json()["id"]

    async def _fake_generate(*, prompt, deps):
        return chat_service.ChatAgentOutput(response_text="Persisted assistant response")

    monkeypatch.setattr(chat_service, "generate_chat_response", _fake_generate)

    stream_response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "Seed transcript"},
    )
    assert stream_response.status_code == 200

    before_detail = await client.get(f"/api/v1/chat/threads/{thread_id}")
    assert before_detail.status_code == 200
    before_payload = before_detail.json()
    before_message_ids = [message["id"] for message in before_payload["messages"]]
    assert len(before_message_ids) == 2

    unsupported_response = await getattr(client, method)(
        f"/api/v1/chat/threads/{thread_id}{path_suffix}"
    )
    assert unsupported_response.status_code == 404

    after_detail = await client.get(f"/api/v1/chat/threads/{thread_id}")
    assert after_detail.status_code == 200
    after_payload = after_detail.json()
    assert [message["id"] for message in after_payload["messages"]] == before_message_ids

    message_count = await db_session.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(
            ChatMessage.thread_id == uuid.UUID(thread_id),
            ChatMessage.organization_id == org.id,
            ChatMessage.created_by_user_id == user.id,
        )
    )
    assert message_count == 2
