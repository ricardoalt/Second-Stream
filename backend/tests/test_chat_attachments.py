import uuid
from datetime import UTC, datetime, timedelta

import pytest
from conftest import create_org, create_user
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.chat_attachment import ChatAttachment
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.user import UserRole
from app.services.chat_service import (
    CHAT_ORPHAN_DRAFT_RETENTION_DAYS,
    ChatAttachmentInput,
    ChatAttachmentValidationError,
    create_draft_attachment,
    create_user_message_with_attachments,
    find_cleanup_eligible_draft_attachments,
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
    message_id: uuid.UUID | None,
    storage_key: str,
    size_bytes: int = 64,
) -> ChatAttachment:
    attachment = ChatAttachment(
        organization_id=org_id,
        uploaded_by_user_id=user_id,
        message_id=message_id,
        storage_key=storage_key,
        original_filename="existing.txt",
        content_type="text/plain",
        size_bytes=size_bytes,
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
async def test_create_user_message_allows_text_markdown_attachments(db_session):
    org = await create_org(db_session, "Chat Attach Markdown Org", "chat-attach-markdown")
    owner = await create_user(
        db_session,
        email=f"chat-attach-markdown-{uuid.uuid4().hex[:8]}@example.com",
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
        content_text="Analyze this markdown",
        run_id="run-allowed-markdown",
        attachments=[
            ChatAttachmentInput(
                storage_key=f"chat/{org.id}/{uuid.uuid4()}.md",
                original_filename="notes.md",
                content_type="text/markdown",
                size_bytes=256,
            )
        ],
    )

    result = await db_session.execute(
        select(ChatAttachment).where(ChatAttachment.message_id == message.id)
    )
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].content_type == "text/markdown"


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
async def test_create_user_message_rejects_total_attachment_payload_above_12mb(db_session):
    org = await create_org(db_session, "Chat Attach Total Bytes Org", "chat-attach-total-bytes")
    owner = await create_user(
        db_session,
        email=f"chat-attach-total-bytes-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=owner.id)

    drafts: list[ChatAttachment] = []
    for idx in range(4):
        draft = await _create_attachment(
            db_session,
            org_id=org.id,
            user_id=owner.id,
            message_id=None,
            storage_key=f"chat/{org.id}/{uuid.uuid4()}-{idx}.pdf",
            size_bytes=3 * 1024 * 1024 + 1,
        )
        drafts.append(draft)

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=owner.id,
            thread_id=thread.id,
            content_text="Analyze these files",
            run_id="run-total-bytes-blocked",
            existing_attachment_ids=[draft.id for draft in drafts],
        )

    assert exc_info.value.code == "ATTACHMENT_TOTAL_BYTES_LIMIT_EXCEEDED"


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


@pytest.mark.asyncio
async def test_create_draft_attachment_persists_unlinked_attachment(db_session):
    org = await create_org(db_session, "Chat Draft Org", "chat-draft-org")
    owner = await create_user(
        db_session,
        email=f"chat-draft-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    attachment = await create_draft_attachment(
        db=db_session,
        organization_id=org.id,
        uploaded_by_user_id=owner.id,
        attachment=ChatAttachmentInput(
            storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
            original_filename="draft.txt",
            content_type="text/plain",
            size_bytes=128,
        ),
    )

    assert attachment.id is not None
    assert attachment.message_id is None
    assert attachment.organization_id == org.id
    assert attachment.uploaded_by_user_id == owner.id
    assert attachment.original_filename == "draft.txt"


@pytest.mark.asyncio
async def test_create_draft_attachment_rejects_mime_outside_allowlist(db_session):
    org = await create_org(db_session, "Chat Draft Mime Org", "chat-draft-mime")
    owner = await create_user(
        db_session,
        email=f"chat-draft-mime-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_draft_attachment(
            db=db_session,
            organization_id=org.id,
            uploaded_by_user_id=owner.id,
            attachment=ChatAttachmentInput(
                storage_key=f"chat/{org.id}/{uuid.uuid4()}.zip",
                original_filename="bad.zip",
                content_type="application/zip",
                size_bytes=128,
            ),
        )

    assert exc_info.value.code == "ATTACHMENT_MIME_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_create_draft_attachment_rejects_attachment_over_4mb(db_session):
    org = await create_org(db_session, "Chat Draft Size Org", "chat-draft-size")
    owner = await create_user(
        db_session,
        email=f"chat-draft-size-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_draft_attachment(
            db=db_session,
            organization_id=org.id,
            uploaded_by_user_id=owner.id,
            attachment=ChatAttachmentInput(
                storage_key=f"chat/{org.id}/{uuid.uuid4()}.pdf",
                original_filename="large.pdf",
                content_type="application/pdf",
                size_bytes=(4 * 1024 * 1024) + 1,
            ),
        )

    assert exc_info.value.code == "ATTACHMENT_TOO_LARGE"


@pytest.mark.asyncio
async def test_create_user_message_claims_existing_draft_attachment(db_session):
    org = await create_org(db_session, "Chat Claim Draft Org", "chat-claim-draft")
    user = await create_user(
        db_session,
        email=f"chat-claim-draft-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=user.id)
    draft = await _create_attachment(
        db_session,
        org_id=org.id,
        user_id=user.id,
        message_id=None,
        storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
    )

    message = await create_user_message_with_attachments(
        db=db_session,
        organization_id=org.id,
        created_by_user_id=user.id,
        thread_id=thread.id,
        content_text="Claim this draft",
        run_id="run-claim-draft",
        attachments=[],
        existing_attachment_ids=[draft.id],
    )

    result = await db_session.execute(
        select(ChatAttachment).where(ChatAttachment.id == draft.id)
    )
    claimed = result.scalar_one()
    assert claimed.message_id == message.id


@pytest.mark.asyncio
async def test_create_user_message_rejects_claiming_foreign_org_draft(db_session):
    caller_org = await create_org(db_session, "Chat Caller Draft Org", "chat-caller-draft")
    foreign_org = await create_org(db_session, "Chat Foreign Draft Org", "chat-foreign-draft")

    caller = await create_user(
        db_session,
        email=f"chat-caller-draft-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    foreign_owner = await create_user(
        db_session,
        email=f"chat-foreign-draft-{uuid.uuid4().hex[:8]}@example.com",
        org_id=foreign_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    caller_thread = await _create_thread(db_session, org_id=caller_org.id, owner_id=caller.id)
    foreign_draft = await _create_attachment(
        db_session,
        org_id=foreign_org.id,
        user_id=foreign_owner.id,
        message_id=None,
        storage_key=f"chat/{foreign_org.id}/{uuid.uuid4()}.txt",
    )

    with pytest.raises(ChatAttachmentValidationError) as exc_info:
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=caller_org.id,
            created_by_user_id=caller.id,
            thread_id=caller_thread.id,
            content_text="Use foreign draft",
            run_id="run-foreign-draft",
            attachments=[],
            existing_attachment_ids=[foreign_draft.id],
        )

    assert exc_info.value.code == "ATTACHMENT_ORG_MISMATCH"


@pytest.mark.asyncio
async def test_create_user_message_rolls_back_when_claim_commit_fails(db_session, monkeypatch):
    org = await create_org(db_session, "Chat Claim Rollback Org", "chat-claim-rollback")
    user = await create_user(
        db_session,
        email=f"chat-claim-rollback-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=user.id)
    thread_id = thread.id
    draft = await _create_attachment(
        db_session,
        org_id=org.id,
        user_id=user.id,
        message_id=None,
        storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
    )
    draft_id = draft.id

    original_commit = db_session.commit
    commit_calls = 0

    async def fail_claim_commit_once():
        nonlocal commit_calls
        commit_calls += 1
        if commit_calls == 1:
            raise RuntimeError("Simulated claim commit failure")
        await original_commit()

    monkeypatch.setattr(db_session, "commit", fail_claim_commit_once)

    with pytest.raises(RuntimeError, match="Simulated claim commit failure"):
        await create_user_message_with_attachments(
            db=db_session,
            organization_id=org.id,
            created_by_user_id=user.id,
            thread_id=thread.id,
            content_text="Claim should rollback",
            run_id="run-claim-rollback",
            attachments=[],
            existing_attachment_ids=[draft.id],
        )

    result = await db_session.execute(
        select(ChatMessage).where(ChatMessage.thread_id == thread_id)
    )
    assert result.scalars().all() == []

    draft_result = await db_session.execute(
        select(ChatAttachment).where(ChatAttachment.id == draft_id)
    )
    persisted_draft = draft_result.scalar_one()
    assert persisted_draft.message_id is None


@pytest.mark.asyncio
async def test_find_cleanup_eligible_draft_attachments_returns_old_unclaimed_only(db_session):
    org = await create_org(db_session, "Chat Draft Cleanup Org", "chat-draft-cleanup")
    user = await create_user(
        db_session,
        email=f"chat-draft-cleanup-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    thread = await _create_thread(db_session, org_id=org.id, owner_id=user.id)
    message = await _create_message(
        db_session,
        org_id=org.id,
        user_id=user.id,
        thread_id=thread.id,
        text="claimed message",
    )

    eligible_draft = await _create_attachment(
        db_session,
        org_id=org.id,
        user_id=user.id,
        message_id=None,
        storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
    )
    recent_draft = await _create_attachment(
        db_session,
        org_id=org.id,
        user_id=user.id,
        message_id=None,
        storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
    )
    claimed_attachment = await _create_attachment(
        db_session,
        org_id=org.id,
        user_id=user.id,
        message_id=message.id,
        storage_key=f"chat/{org.id}/{uuid.uuid4()}.txt",
    )

    now = datetime.now(UTC)
    eligible_draft.created_at = now.replace(microsecond=0)
    recent_draft.created_at = now
    claimed_attachment.created_at = now.replace(microsecond=0)

    retention_cutoff = now - timedelta(days=CHAT_ORPHAN_DRAFT_RETENTION_DAYS + 1)
    eligible_draft.created_at = retention_cutoff

    await db_session.commit()

    eligible = await find_cleanup_eligible_draft_attachments(
        db=db_session,
        now=now,
    )

    eligible_ids = {row.id for row in eligible}
    assert eligible_draft.id in eligible_ids
    assert recent_draft.id not in eligible_ids
    assert claimed_attachment.id not in eligible_ids
