"""Tests for ensure_thread_exists and data-new-thread-created stream event.

TDD RED→GREEN cycle: tests written BEFORE implementation.
Implementation: see app/services/chat_service.py and chat_stream_protocol.py.
"""

import uuid

import pytest
from conftest import create_org, create_user

from app.models.chat_thread import ChatThread
from app.models.user import UserRole
from app.services.chat_service import (
    ChatAttachmentValidationError,
    ensure_thread_exists,
)


@pytest.mark.asyncio
async def test_ensure_thread_exists_creates_when_missing(db_session):
    """When no thread exists with the given ID, create it and return (thread, True)."""
    org = await create_org(db_session, "Test Org", "test-org-ensure-create")
    user = await create_user(
        db_session,
        email=f"ensure-create-user-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    new_thread_id = uuid.uuid4()

    thread, was_created = await ensure_thread_exists(
        db=db_session,
        organization_id=org.id,
        created_by_user_id=user.id,
        thread_id=new_thread_id,
    )

    assert was_created is True
    assert thread.id == new_thread_id
    assert thread.organization_id == org.id
    assert thread.created_by_user_id == user.id


@pytest.mark.asyncio
async def test_ensure_thread_exists_idempotent_same_owner(db_session):
    """When thread exists under same org/user, return (thread, False) without creating another."""
    org = await create_org(db_session, "Test Org", "test-org-ensure-idem")
    user = await create_user(
        db_session,
        email=f"ensure-idem-user-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    # Pre-create the thread directly
    preexisting = ChatThread(
        id=uuid.uuid4(),
        organization_id=org.id,
        created_by_user_id=user.id,
        title="Existing thread",
    )
    db_session.add(preexisting)
    await db_session.commit()
    existing_id = preexisting.id

    thread, was_created = await ensure_thread_exists(
        db=db_session,
        organization_id=org.id,
        created_by_user_id=user.id,
        thread_id=existing_id,
    )

    assert was_created is False
    assert thread.id == existing_id
    assert thread.title == "Existing thread"


@pytest.mark.asyncio
async def test_ensure_thread_exists_404_when_exists_in_other_org(db_session):
    """When thread exists under a different org, raise 404 without revealing existence."""
    org_a = await create_org(db_session, "Org A", "org-a-ensure-404")
    org_b = await create_org(db_session, "Org B", "org-b-ensure-404")
    user_a = await create_user(
        db_session,
        email=f"org-a-user-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email=f"org-b-user-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_b.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    # Thread under org_b
    thread_b = ChatThread(
        id=uuid.uuid4(),
        organization_id=org_b.id,
        created_by_user_id=user_b.id,
    )
    db_session.add(thread_b)
    await db_session.commit()
    cross_org_id = thread_b.id

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await ensure_thread_exists(
            db=db_session,
            organization_id=org_a.id,
            created_by_user_id=user_a.id,
            thread_id=cross_org_id,
        )

    assert exc_info.value.code == "THREAD_NOT_FOUND"


@pytest.mark.asyncio
async def test_ensure_thread_exists_handles_race_integrity_error(db_session):
    """When two concurrent requests try to create the same thread, one wins and one gets the thread."""
    org = await create_org(db_session, "Test Org", "test-org-ensure-race")
    user = await create_user(
        db_session,
        email=f"ensure-race-user-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    race_thread_id = uuid.uuid4()

    # First call creates
    thread1, created1 = await ensure_thread_exists(
        db=db_session,
        organization_id=org.id,
        created_by_user_id=user.id,
        thread_id=race_thread_id,
    )
    assert created1 is True
    assert thread1.id == race_thread_id

    # Second call gets the existing one
    thread2, created2 = await ensure_thread_exists(
        db=db_session,
        organization_id=org.id,
        created_by_user_id=user.id,
        thread_id=race_thread_id,
    )
    assert created2 is False
    assert thread2.id == race_thread_id
