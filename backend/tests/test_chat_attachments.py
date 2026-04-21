import uuid
from datetime import UTC, datetime

import pytest
from conftest import create_org, create_user
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.chat_attachment import ChatAttachment
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.user import UserRole
from app.services.chat_service import (
    ChatAttachmentInput,
    ChatAttachmentValidationError,
    create_user_message_with_attachments,
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
    text: str,
) -> ChatMessage:
    message = ChatMessage(
        organization_id=org_id,
        thread_id=thread_id,
        created_by_user_id=user_id,
        role="user",
        content_text=text,
        status="completed",
    )
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)
    return message


async def _create_attachment(
    db_session,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    message_id: uuid.UUID,
    storage_key: str,
) -> ChatAttachment:
    attachment = ChatAttachment(
        organization_id=org_id,
        uploaded_by_user_id=user_id,
        message_id=message_id,
        storage_key=storage_key,
        original_filename="existing.txt",
        content_type="text/plain",
        size_bytes=64,
        sha256=None,
        extracted_text=None,
    )
    db_session.add(attachment)
    await db_session.commit()
    await db_session.refresh(attachment)
    return attachment


@pytest.mark.asyncio
async def test_create_user_message_with_allowed_attachment_persists_message_owned_attachment(db_session):
    org = await create_org(db_session, "Chat Attach Allowed Org", "chat-attach-allowed")
    owner = await create_user(
        db_session,
        email=f"chat-attach-allowed-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    message = await create_user_message_with_attachments(
        db=db_session,
        organization_id=org.id,
        created_by_user_id=owner.id,
        thread_id=thread.id,
        content_text="Analyze this image",
        run_id="run-allowed",
        attachments=[
            ChatAttachmentInput(
                storage_key=f"chat/{org.id}/{uuid.uuid4()}.png",
                original_filename="image.png",
                content_type="image/png",
                size_bytes=1024,
            )
        ],
    )

    saved_message = await db_session.get(ChatMessage, message.id)
    assert saved_message is not None

    result = await db_session.execute(
        select(ChatAttachment).where(ChatAttachment.message_id == message.id)
    )
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].organization_id == org.id
    assert rows[0].uploaded_by_user_id == owner.id
    assert rows[0].content_type == "image/png"


@pytest.mark.asyncio
async def test_create_user_message_rejects_mime_outside_allowlist(db_session):
    org = await create_org(db_session, "Chat Attach Mime Org", "chat-attach-mime")
    owner = await create_user(
        db_session,
        email=f"chat-attach-mime-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Analyze this archive",
            run_id="run-mime-blocked",
            attachments=[
                ChatAttachmentInput(
                    storage_key=f"chat/{org.id}/{uuid.uuid4()}.zip",
                    original_filename="archive.zip",
                    content_type="application/zip",
                    size_bytes=1024,
                )
            ],
        )

    assert exc_info.value.code == "ATTACHMENT_MIME_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_create_user_message_rejects_attachment_over_4mb(db_session):
    org = await create_org(db_session, "Chat Attach Size Org", "chat-attach-size")
    owner = await create_user(
        db_session,
        email=f"chat-attach-size-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Analyze this pdf",
            run_id="run-size-blocked",
            attachments=[
                ChatAttachmentInput(
                    storage_key=f"chat/{org.id}/{uuid.uuid4()}.pdf",
                    original_filename="large.pdf",
                    content_type="application/pdf",
                    size_bytes=(4 * 1024 * 1024) + 1,
                )
            ],
        )

    assert exc_info.value.code == "ATTACHMENT_TOO_LARGE"


@pytest.mark.asyncio
async def test_create_user_message_rejects_more_than_five_attachments(db_session):
    org = await create_org(db_session, "Chat Attach Count Org", "chat-attach-count")
    owner = await create_user(
        db_session,
        email=f"chat-attach-count-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    attachments = [
        ChatAttachmentInput(
            storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
            original_filename=f"doc-{idx}.txt",
            content_type="text/plain",
            size_bytes=128,
        )
        for idx in range(6)
    ]

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Analyze six files",
            run_id="run-count-blocked",
            attachments=attachments,
        )

    assert exc_info.value.code == "ATTACHMENT_COUNT_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_create_user_message_rejects_foreign_org_attachment_reference(db_session):
    caller_org = await create_org(db_session, "Chat Caller Org", "chat-attach-caller-org")
    foreign_org = await create_org(db_session, "Chat Foreign Org", "chat-attach-foreign-org")

    caller = await create_user(
        db_session,
        email=f"chat-attach-caller-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    foreign_owner = await create_user(
        db_session,
        email=f"chat-attach-foreign-{uuid.uuid4().hex[:8]}@example.com",
        org_id=foreign_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    caller_thread = await _create_thread(db_session, org_id=caller_org.id, owner_id=caller.id)
    foreign_thread = await _create_thread(db_session, org_id=foreign_org.id, owner_id=foreign_owner.id)
    foreign_message = await _create_message(
        db_session,
        org_id=foreign_org.id,
        user_id=foreign_owner.id,
        thread_id=foreign_thread.id,
        text="Foreign message",
    )
    foreign_attachment = await _create_attachment(
        db_session,
        org_id=foreign_org.id,
        user_id=foreign_owner.id,
        message_id=foreign_message.id,
        storage_key=f"chat/{foreign_org.id}/{uuid.uuid4()}.txt",
    )

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=caller_org.id,
            created_by_user_id=caller.id,
            thread_id=caller_thread.id,
            content_text="Use foreign org file",
            run_id="run-foreign-org",
            attachments=[],
            existing_attachment_ids=[foreign_attachment.id],
        )

    assert exc_info.value.code == "ATTACHMENT_ORG_MISMATCH"


@pytest.mark.asyncio
async def test_create_user_message_rejects_foreign_user_attachment_reference(db_session):
    org = await create_org(db_session, "Chat Attach User Org", "chat-attach-user-org")
    caller = await create_user(
        db_session,
        email=f"chat-attach-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other_user = await create_user(
        db_session,
        email=f"chat-attach-other-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    caller_thread = await _create_thread(db_session, org_id=org.id, owner_id=caller.id)
    other_thread = await _create_thread(db_session, org_id=org.id, owner_id=other_user.id)
    other_message = await _create_message(
        db_session,
        org_id=org.id,
        user_id=other_user.id,
        thread_id=other_thread.id,
        text="Other user message",
    )
    other_attachment = await _create_attachment(
        db_session,
        org_id=org.id,
        user_id=other_user.id,
        message_id=other_message.id,
        storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
    )

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=caller.id,
            thread_id=caller_thread.id,
            content_text="Use other user file",
            run_id="run-foreign-user",
            attachments=[],
            existing_attachment_ids=[other_attachment.id],
        )

    assert exc_info.value.code == "ATTACHMENT_USER_MISMATCH"


@pytest.mark.asyncio
async def test_create_user_message_rejects_attachment_already_linked_to_another_message(db_session):
    org = await create_org(db_session, "Chat Attach Link Org", "chat-attach-link-org")
    user = await create_user(
        db_session,
        email=f"chat-attach-link-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    thread = await _create_thread(db_session, org_id=org.id, owner_id=user.id)
    existing_message = await _create_message(
        db_session,
        org_id=org.id,
        user_id=user.id,
        thread_id=thread.id,
        text="Existing message",
    )
    existing_attachment = await _create_attachment(
        db_session,
        org_id=org.id,
        user_id=user.id,
        message_id=existing_message.id,
        storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
    )

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=user.id,
            thread_id=thread.id,
            content_text="Try reusing attachment",
            run_id="run-foreign-message",
            attachments=[],
            existing_attachment_ids=[existing_attachment.id],
        )

    assert exc_info.value.code == "ATTACHMENT_ALREADY_LINKED"


@pytest.mark.asyncio
async def test_create_user_message_rolls_back_message_if_attachment_persistence_fails(db_session):
    org = await create_org(db_session, "Chat Attach Txn Org", "chat-attach-txn-org")
    user = await create_user(
        db_session,
        email=f"chat-attach-txn-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=user.id)
    thread_id = thread.id

    duplicated_key = f"chat/{org.id}/{uuid.uuid4()}.txt"
    with pytest.raises(IntegrityError):
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=user.id,
            thread_id=thread.id,
            content_text="This should rollback",
            run_id="run-rollback",
            attachments=[
                ChatAttachmentInput(
                    storage_key=duplicated_key,
                    original_filename="dup1.txt",
                    content_type="text/plain",
                    size_bytes=10,
                ),
                ChatAttachmentInput(
                    storage_key=duplicated_key,
                    original_filename="dup2.txt",
                    content_type="text/plain",
                    size_bytes=11,
                ),
            ],
        )

    messages = await db_session.execute(select(ChatMessage).where(ChatMessage.thread_id == thread_id))
    assert messages.scalars().all() == []
