import uuid
from datetime import UTC, datetime

import pytest
from conftest import create_org, create_user
from fastapi import APIRouter
from httpx import AsyncClient
from sqlalchemy import select

from app.api.dependencies import AsyncDB, CurrentUser, OrganizationContext
from app.authz import permissions
from app.authz.authz import (
    raise_org_access_denied,
    raise_resource_not_found,
    require_permission,
)
from app.main import app
from app.models.chat_thread import ChatThread
from app.models.user import UserRole

TEST_CHAT_PREFIX = "/api/v1/_test/chat-contract"


def _ensure_test_router_registered() -> None:
    if any(route.path == f"{TEST_CHAT_PREFIX}/threads" for route in app.routes):
        return

    router = APIRouter(prefix=TEST_CHAT_PREFIX)

    @router.get("/threads")
    async def _list_threads(
        current_user: CurrentUser,
        org: OrganizationContext,
        db: AsyncDB,
    ) -> dict[str, list[dict[str, str]]]:
        require_permission(current_user, permissions.CHAT_READ)
        result = await db.execute(
            select(ChatThread)
            .where(
                ChatThread.organization_id == org.id,
                ChatThread.created_by_user_id == current_user.id,
                ChatThread.archived_at.is_(None),
            )
            .order_by(ChatThread.last_message_at.desc(), ChatThread.id.desc())
        )
        rows = result.scalars().all()
        return {"items": [{"id": str(row.id)} for row in rows]}

    @router.get("/threads/{thread_id}")
    async def _get_thread(
        thread_id: uuid.UUID,
        current_user: CurrentUser,
        org: OrganizationContext,
        db: AsyncDB,
    ) -> dict[str, str]:
        require_permission(current_user, permissions.CHAT_READ)
        owned_result = await db.execute(
            select(ChatThread).where(
                ChatThread.id == thread_id,
                ChatThread.organization_id == org.id,
                ChatThread.created_by_user_id == current_user.id,
                ChatThread.archived_at.is_(None),
            )
        )
        thread = owned_result.scalar_one_or_none()
        if thread is not None:
            return {"id": str(thread.id)}

        any_scope_result = await db.execute(select(ChatThread).where(ChatThread.id == thread_id))
        cross_tenant_thread = any_scope_result.scalar_one_or_none()
        if cross_tenant_thread is not None and cross_tenant_thread.organization_id != org.id:
            raise_org_access_denied(org_id=str(org.id))

        raise_resource_not_found("Chat thread not found", details={"thread_id": str(thread_id)})

    app.include_router(router)


def _assert_error_contract(response, expected_status: int, expected_code: str) -> None:
    assert response.status_code == expected_status
    payload = response.json()
    assert payload["code"] == expected_code
    assert isinstance(payload["message"], str)


async def _create_chat_thread(
    db_session,
    *,
    organization_id: uuid.UUID,
    created_by_user_id: uuid.UUID,
) -> ChatThread:
    thread = ChatThread(
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
        title="Contract Thread",
        last_message_preview="Preview",
        last_message_at=datetime.now(UTC),
    )
    db_session.add(thread)
    await db_session.commit()
    await db_session.refresh(thread)
    return thread


@pytest.mark.asyncio
async def test_chat_auth_required_uses_contract_payload(client: AsyncClient):
    _ensure_test_router_registered()

    response = await client.get(f"{TEST_CHAT_PREFIX}/threads")

    _assert_error_contract(response, 401, "AUTH_REQUIRED")


@pytest.mark.asyncio
async def test_chat_superadmin_missing_org_header_rejected(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    _ensure_test_router_registered()

    superuser = await create_user(
        db_session,
        email=f"chat-superuser-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)

    response = await client.get(f"{TEST_CHAT_PREFIX}/threads")

    _assert_error_contract(response, 400, "BAD_REQUEST")


@pytest.mark.asyncio
async def test_chat_list_enforces_creator_only_visibility(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    _ensure_test_router_registered()

    org = await create_org(db_session, "Chat Contract Org", "chat-contract-org")
    owner = await create_user(
        db_session,
        email=f"chat-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other_user = await create_user(
        db_session,
        email=f"chat-other-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    await _create_chat_thread(
        db_session,
        organization_id=org.id,
        created_by_user_id=owner.id,
    )

    set_current_user(other_user)
    response = await client.get(f"{TEST_CHAT_PREFIX}/threads")

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == []


@pytest.mark.asyncio
async def test_chat_detail_cross_tenant_returns_org_access_denied(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    _ensure_test_router_registered()

    caller_org = await create_org(db_session, "Chat Caller Org", "chat-caller-org")
    target_org = await create_org(db_session, "Chat Target Org", "chat-target-org")

    caller = await create_user(
        db_session,
        email=f"chat-caller-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    target_owner = await create_user(
        db_session,
        email=f"chat-target-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=target_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    target_thread = await _create_chat_thread(
        db_session,
        organization_id=target_org.id,
        created_by_user_id=target_owner.id,
    )

    set_current_user(caller)
    response = await client.get(f"{TEST_CHAT_PREFIX}/threads/{target_thread.id}")

    _assert_error_contract(response, 403, "ORG_ACCESS_DENIED")
