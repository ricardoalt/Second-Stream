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
    """Parse legacy SSE format: event: name\\ndata: json."""
    events: list[dict[str, object]] = []
    for raw_event in payload.strip().split("\n\n"):
        if not raw_event:
            continue
        lines = raw_event.splitlines()
        event_name = lines[0].removeprefix("event: ")
        data = json.loads(lines[1].removeprefix("data: "))
        events.append({"event": event_name, "data": data})
    return events


def _parse_official_sse_events(payload: str) -> list[dict[str, object]]:
    """Parse official AI SDK UI/Data Stream Protocol format: data: {json}\\n\\n."""
    events: list[dict[str, object]] = []
    for line in payload.strip().split("\n"):
        line = line.strip()
        if line == "data: [DONE]":
            events.append({"type": "DONE"})
            continue
        if line.startswith("data: "):
            events.append(json.loads(line.removeprefix("data: ")))
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

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "Attachment upload turn response"}
        yield {"event": "completed", "response_text": "Attachment upload turn response"}

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)
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

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "First chunk"}
        yield {"event": "delta", "delta": "Second chunk."}
        yield {"event": "completed", "response_text": "First chunk. Second chunk."}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "Stream me", "streamFormat": "legacy"},
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

    async def _fail_stream_response(*, prompt, deps, attachments):
        raise ChatAgentError("forced model failure")
        yield {"event": "delta", "delta": "unreachable"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fail_stream_response)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "This should fail", "streamFormat": "legacy"},
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

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "Persisted assistant response"}
        yield {"event": "completed", "response_text": "Persisted assistant response"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

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


@pytest.mark.asyncio
async def test_chat_draft_attachment_upload_contract(client: AsyncClient, db_session, set_current_user):
    org, user = await _create_authed_user(db_session, set_current_user)

    upload_response = await client.post(
        "/api/v1/chat/attachments",
        files={"file": ("draft-report.txt", io.BytesIO(b"draft content"), "text/plain")},
    )
    assert upload_response.status_code == 201
    attachment_payload = upload_response.json()
    assert attachment_payload["messageId"] is None
    assert attachment_payload["originalFilename"] == "draft-report.txt"
    assert attachment_payload["contentType"] == "text/plain"
    assert attachment_payload["sizeBytes"] == len(b"draft content")

    from app.models.chat_attachment import ChatAttachment

    saved = await db_session.get(ChatAttachment, uuid.UUID(attachment_payload["id"]))
    assert saved is not None
    assert saved.message_id is None
    assert saved.organization_id == org.id
    assert saved.uploaded_by_user_id == user.id


@pytest.mark.asyncio
async def test_chat_draft_attachment_upload_rejects_invalid_mime(client: AsyncClient, db_session, set_current_user):
    await _create_authed_user(db_session, set_current_user)

    upload_response = await client.post(
        "/api/v1/chat/attachments",
        files={"file": ("bad.exe", io.BytesIO(b"binary"), "application/octet-stream")},
    )
    _assert_error_contract(upload_response, 400, "ATTACHMENT_MIME_NOT_ALLOWED")


# ---------------------------------------------------------------------------
# Official AI SDK UI/Data Stream Protocol tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_stream_official_protocol_success_contract(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    """Official protocol: default stream emits start→text-start→text-delta→text-end→finish→[DONE]."""
    org, user = await _create_authed_user(db_session, set_current_user)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Official Stream"})
    thread_id = create_thread.json()["id"]

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "First chunk"}
        yield {"event": "delta", "delta": "Second chunk."}
        yield {"event": "completed", "response_text": "First chunk. Second chunk."}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "Stream official"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers.get("x-vercel-ai-ui-message-stream") == "v1"

    events = _parse_official_sse_events(response.text)
    types = [e["type"] for e in events]

    assert types[0] == "start"
    assert "messageId" in events[0]
    assert types[1] == "text-start"
    text_id = events[1]["id"]

    # text deltas with consistent id
    assert types[2] == "text-delta"
    assert events[2]["id"] == text_id
    assert events[2]["delta"] == "First chunk"
    assert types[3] == "text-delta"
    assert events[3]["id"] == text_id
    assert events[3]["delta"] == "Second chunk."

    assert types[4] == "text-end"
    assert events[4]["id"] == text_id
    assert types[5] == "finish"
    assert types[6] == "DONE"


@pytest.mark.asyncio
async def test_chat_stream_official_protocol_error_contract(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    """Official protocol: error stream emits start→error→[DONE] with no finish."""
    org, user = await _create_authed_user(db_session, set_current_user)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Official Error"})
    thread_id = create_thread.json()["id"]

    async def _fail_stream_response(*, prompt, deps, attachments):
        raise ChatAgentError("forced model failure")
        yield {"event": "delta", "delta": "unreachable"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fail_stream_response)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "This should fail"},
    )
    assert response.status_code == 200
    events = _parse_official_sse_events(response.text)
    types = [e["type"] for e in events]

    assert types[0] == "start"
    assert types[1] == "error"
    assert events[1]["errorText"] == "CHAT_STREAM_FAILED"
    assert types[2] == "DONE"


@pytest.mark.asyncio
async def test_chat_stream_official_protocol_header_override(client: AsyncClient, db_session, set_current_user, monkeypatch):
    """Official protocol: x-vercel-ai-ui-message-stream header triggers official format even without body."""
    org, user = await _create_authed_user(db_session, set_current_user)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Header Override"})
    thread_id = create_thread.json()["id"]

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "Header test"}
        yield {"event": "completed", "response_text": "Header test"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "Header test"},
        headers={"x-vercel-ai-ui-message-stream": "v1"},
    )
    events = _parse_official_sse_events(response.text)
    types = [e["type"] for e in events]
    assert "start" in types
    assert "finish" in types
    assert "DONE" in types


@pytest.mark.asyncio
async def test_chat_stream_legacy_explicit_request(client: AsyncClient, db_session, set_current_user, monkeypatch):
    """Legacy format: explicit streamFormat=legacy produces legacy SSE events."""
    org, user = await _create_authed_user(db_session, set_current_user)
    create_thread = await client.post("/api/v1/chat/threads", json={"title": "Legacy Explicit"})
    thread_id = create_thread.json()["id"]

    async def _fake_stream_response(*, prompt, deps, attachments):
        yield {"event": "delta", "delta": "Legacy response"}
        yield {"event": "completed", "response_text": "Legacy response"}

    monkeypatch.setattr(chat_service, "stream_chat_response", _fake_stream_response)

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/stream",
        json={"contentText": "Legacy format", "streamFormat": "legacy"},
    )
    assert response.status_code == 200
    # Legacy format does NOT include the protocol header
    assert "x-vercel-ai-ui-message-stream" not in response.headers
    events = _parse_sse_events(response.text)
    assert [e["event"] for e in events] == ["start", "delta", "completed"]
