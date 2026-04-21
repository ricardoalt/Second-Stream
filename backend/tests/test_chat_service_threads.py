import uuid
from datetime import UTC, datetime, timedelta

import pytest
import sqlalchemy as sa
from conftest import create_org, create_user
from sqlalchemy.dialects import postgresql

from app.models.chat_thread import ChatThread
from app.models.user import UserRole
from app.services.chat_service import build_thread_list_query, list_owned_threads


def _compiled_sql(query: sa.sql.Select) -> str:
    return str(
        query.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


@pytest.mark.asyncio
async def test_thread_list_query_uses_org_creator_predicates_and_last_message_desc_order(
    db_session,
):
    org_id = uuid.uuid4()
    user_id = uuid.uuid4()
    query = build_thread_list_query(
        organization_id=org_id,
        created_by_user_id=user_id,
        limit=25,
    )

    sql = _compiled_sql(query)

    assert "FROM chat_threads" in sql
    assert "chat_threads.organization_id" in sql
    assert str(org_id) in sql
    assert "chat_threads.created_by_user_id" in sql
    assert str(user_id) in sql
    assert "chat_threads.archived_at IS NULL" in sql
    assert "ORDER BY chat_threads.last_message_at DESC" in sql
    assert "visibility_scope" not in sql


@pytest.mark.asyncio
async def test_list_owned_threads_returns_db_rows_without_python_post_filter(db_session):
    org = await create_org(db_session, "Chat Service Org", "chat-service-org")
    owner = await create_user(
        db_session,
        email=f"chat-service-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    owned_thread = ChatThread(
        organization_id=org.id,
        created_by_user_id=owner.id,
        title="Owned",
        last_message_preview="Owned preview",
        last_message_at=datetime.now(UTC),
    )
    db_session.add(owned_thread)
    await db_session.commit()

    rows = await list_owned_threads(
        db=db_session,
        organization_id=org.id,
        created_by_user_id=owner.id,
        limit=10,
    )

    assert len(rows) == 1
    assert rows[0].id == owned_thread.id


@pytest.mark.asyncio
async def test_thread_list_query_explain_uses_frozen_threads_index(db_session):
    org = await create_org(db_session, "Chat Explain Org", "chat-explain-org")
    owner = await create_user(
        db_session,
        email=f"chat-explain-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    now = datetime.now(UTC)
    for idx in range(20):
        db_session.add(
            ChatThread(
                organization_id=org.id,
                created_by_user_id=owner.id,
                title=f"Thread {idx}",
                last_message_preview="Preview",
                last_message_at=now - timedelta(minutes=idx),
            )
        )
    await db_session.commit()

    query = build_thread_list_query(
        organization_id=org.id,
        created_by_user_id=owner.id,
        limit=10,
    )
    sql = _compiled_sql(query)

    await db_session.execute(sa.text("SET LOCAL enable_seqscan = off"))
    explain_result = await db_session.execute(sa.text(f"EXPLAIN {sql}"))
    plan_lines = [row[0] for row in explain_result.all()]
    plan_text = "\n".join(plan_lines)

    assert "ix_chat_threads_org_creator_archived_lastmsg" in plan_text
