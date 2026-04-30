"""Chat service helpers for v1 visibility and message-owned attachments."""

import asyncio
import contextlib
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from time import perf_counter
from uuid import UUID

import structlog
from anyio import BrokenResourceError
from sqlalchemy import Select, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.chat_agent import ChatAgentDeps, ChatAgentError, stream_chat_response
from app.agents.chat_skill_loader import available_skill_names
from app.core.database import AsyncSessionLocal
from app.models.chat_attachment import ChatAttachment
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.services.chat_stream_protocol import resolve_attachments_to_agent_input_for_model
from app.services.s3_service import download_file_content

logger = structlog.get_logger(__name__)

MAX_ATTACHMENTS_PER_MESSAGE = 5
MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024
MAX_TOTAL_ATTACHMENT_BYTES_PER_MESSAGE = 12 * 1024 * 1024
CHAT_ORPHAN_DRAFT_RETENTION_DAYS = 7
ALLOWED_EXACT_MIME_TYPES = {"application/pdf"}
ALLOWED_MIME_PREFIXES = ("image/", "text/")
CHAT_MODEL_CONTEXT_WINDOW = 12
CHAT_TITLE_MAX_CHARS = 80
CHAT_DEFAULT_THREAD_TITLE = "New chat"
CHAT_ATTACHMENT_EXTRACTED_TEXT_MAX_CHARS = 12_000
CHAT_STREAM_KEEPALIVE_INTERVAL_SECONDS = 10.0


@dataclass(slots=True, frozen=True)
class ChatHistoryItem:
    role: str
    content_text: str


class ChatAttachmentValidationError(ValueError):
    """Raised when chat attachment validation fails."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(slots=True, frozen=True)
class ChatAttachmentInput:
    storage_key: str
    original_filename: str
    content_type: str | None
    size_bytes: int
    sha256: str | None = None
    extracted_text: str | None = None
    artifact_type: str | None = None


@dataclass(slots=True, frozen=True)
class _PreparedChatTurn:
    events: tuple[dict, ...]
    agent_prompt: str
    agent_attachments: list
    history_message_count: int


def _normalize_content_type(content_type: str | None) -> str:
    if content_type is None:
        return ""
    return content_type.split(";", 1)[0].strip().lower()


def _is_allowed_content_type(content_type: str) -> bool:
    if content_type in ALLOWED_EXACT_MIME_TYPES:
        return True
    return any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES)


def _is_stable_thread_title(title: str | None) -> bool:
    if title is None:
        return False
    normalized = " ".join(title.split()).strip()
    if not normalized:
        return False
    return normalized.casefold() != CHAT_DEFAULT_THREAD_TITLE.casefold()


def _extract_text_from_attachment_bytes(*, content: bytes, content_type: str | None) -> str | None:
    normalized_content_type = _normalize_content_type(content_type)
    if not normalized_content_type.startswith("text/"):
        return None

    text = content.decode("utf-8", errors="replace").strip()
    if not text:
        return None
    if len(text) <= CHAT_ATTACHMENT_EXTRACTED_TEXT_MAX_CHARS:
        return text
    return text[:CHAT_ATTACHMENT_EXTRACTED_TEXT_MAX_CHARS]


async def ensure_thread_exists(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    thread_id: UUID,
) -> tuple[ChatThread, bool]:
    """Ensure a thread exists for the given org and creator.

    If the thread already exists under this org/user, return (thread, False).
    If it doesn't exist anywhere, create it and return (thread, True).
    If it exists under a different org, raise ChatAttachmentValidationError (404).

    Handles race conditions via INSERT … ON CONFLICT (upsert).
    """
    # Check if thread exists under this org/user
    result = await db.execute(
        select(ChatThread).where(
            ChatThread.id == thread_id,
            ChatThread.organization_id == organization_id,
            ChatThread.created_by_user_id == created_by_user_id,
            ChatThread.archived_at.is_(None),
        )
    )
    thread = result.scalar_one_or_none()
    if thread is not None:
        return (thread, False)

    # Check if thread exists under a different org (cross-tenant UUID collision)
    cross_org = await db.execute(select(ChatThread.id).where(ChatThread.id == thread_id))
    if cross_org.scalar_one_or_none() is not None:
        raise ChatAttachmentValidationError("THREAD_NOT_FOUND", "Thread not found")

    # Thread doesn't exist anywhere — create it
    stmt = (
        pg_insert(ChatThread)
        .values(
            id=thread_id,
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
            title=CHAT_DEFAULT_THREAD_TITLE,
            last_message_preview=None,
            last_message_at=None,
            archived_at=None,
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )

    await db.execute(stmt)
    await db.commit()

    # Re-fetch after upsert to handle race condition
    result = await db.execute(
        select(ChatThread).where(
            ChatThread.id == thread_id,
            ChatThread.organization_id == organization_id,
            ChatThread.created_by_user_id == created_by_user_id,
            ChatThread.archived_at.is_(None),
        )
    )
    thread = result.scalar_one_or_none()
    if thread is None:
        # Race: another org claimed this UUID between our checks
        raise ChatAttachmentValidationError("THREAD_NOT_FOUND", "Thread not found")

    return (thread, True)


async def _load_owned_active_thread(
    *,
    db: AsyncSession,
    thread_id: UUID,
    organization_id: UUID,
    created_by_user_id: UUID,
) -> ChatThread:
    result = await db.execute(
        select(ChatThread)
        .where(
            ChatThread.id == thread_id,
            ChatThread.organization_id == organization_id,
            ChatThread.created_by_user_id == created_by_user_id,
            ChatThread.archived_at.is_(None),
        )
        .with_for_update()
    )
    thread = result.scalar_one_or_none()
    if thread is None:
        raise ChatAttachmentValidationError("THREAD_NOT_FOUND", "Thread not found")
    return thread


def _validate_attachment_inputs(
    *,
    attachments: list[ChatAttachmentInput],
    existing_attachment_ids: list[UUID],
) -> None:
    if len(attachments) + len(existing_attachment_ids) > MAX_ATTACHMENTS_PER_MESSAGE:
        raise ChatAttachmentValidationError(
            "ATTACHMENT_COUNT_LIMIT_EXCEEDED",
            "Attachment count exceeds per-message limit",
        )

    for attachment in attachments:
        normalized_content_type = _normalize_content_type(attachment.content_type)
        if not _is_allowed_content_type(normalized_content_type):
            raise ChatAttachmentValidationError(
                "ATTACHMENT_MIME_NOT_ALLOWED",
                "Attachment MIME type is not allowed",
            )

        if attachment.size_bytes > MAX_ATTACHMENT_SIZE_BYTES:
            raise ChatAttachmentValidationError(
                "ATTACHMENT_TOO_LARGE",
                "Attachment exceeds maximum allowed size",
            )


async def _validate_existing_attachments(
    *,
    db: AsyncSession,
    attachment_ids: list[UUID],
    organization_id: UUID,
    created_by_user_id: UUID,
) -> list[ChatAttachment]:
    if not attachment_ids:
        return []

    rows = await db.execute(
        select(ChatAttachment).where(ChatAttachment.id.in_(attachment_ids)).with_for_update()
    )
    attachments = list(rows.scalars().all())
    if len(attachments) != len(set(attachment_ids)):
        raise ChatAttachmentValidationError(
            "ATTACHMENT_NOT_FOUND",
            "One or more referenced attachments were not found",
        )

    for attachment in attachments:
        if attachment.organization_id != organization_id:
            raise ChatAttachmentValidationError(
                "ATTACHMENT_ORG_MISMATCH",
                "Attachment organization does not match request scope",
            )
        if attachment.uploaded_by_user_id != created_by_user_id:
            raise ChatAttachmentValidationError(
                "ATTACHMENT_USER_MISMATCH",
                "Attachment uploader does not match current user",
            )
        if attachment.message_id is not None:
            raise ChatAttachmentValidationError(
                "ATTACHMENT_ALREADY_LINKED",
                "Attachment is already linked to another message",
            )
    return attachments


def _validate_total_attachment_bytes(
    *,
    incoming_attachments: list[ChatAttachmentInput],
    existing_attachments: list[ChatAttachment],
) -> int:
    total_bytes = sum(max(0, attachment.size_bytes) for attachment in incoming_attachments)
    total_bytes += sum(max(0, int(attachment.size_bytes or 0)) for attachment in existing_attachments)

    if total_bytes > MAX_TOTAL_ATTACHMENT_BYTES_PER_MESSAGE:
        limit_mb = MAX_TOTAL_ATTACHMENT_BYTES_PER_MESSAGE // (1024 * 1024)
        raise ChatAttachmentValidationError(
            "ATTACHMENT_TOTAL_BYTES_LIMIT_EXCEEDED",
            f"Total attachment payload exceeds {limit_mb}MB per message",
        )

    return total_bytes


def _summarize_attachments_for_observability(
    *,
    attachments: list,
) -> tuple[dict[str, int], int, int, int]:
    media_counter: Counter[str] = Counter()
    total_binary_bytes = 0
    total_text_chars = 0
    binary_attachment_count = 0

    for attachment in attachments:
        media_type = str(getattr(attachment, "media_type", "") or "unknown")
        media_counter[media_type] += 1

        binary_content = getattr(attachment, "binary_content", None)
        if binary_content:
            binary_attachment_count += 1
            total_binary_bytes += len(binary_content)

        extracted_text = getattr(attachment, "extracted_text", None)
        if extracted_text:
            total_text_chars += len(extracted_text)

    return dict(media_counter), total_binary_bytes, total_text_chars, binary_attachment_count


def _build_last_message_preview(content_text: str) -> str:
    return content_text[:280]


def _derive_conversation_title(content_text: str) -> str | None:
    normalized = " ".join(content_text.split()).strip()
    if not normalized:
        return None
    if len(normalized) <= CHAT_TITLE_MAX_CHARS:
        return normalized
    return f"{normalized[: CHAT_TITLE_MAX_CHARS - 1]}…"


async def find_cleanup_eligible_draft_attachments(
    *,
    db: AsyncSession,
    now: datetime | None = None,
    retention_days: int = CHAT_ORPHAN_DRAFT_RETENTION_DAYS,
    limit: int = 500,
) -> list[ChatAttachment]:
    """Return unclaimed drafts older than the retention window.

    This helper is intentionally read-only: cleanup execution is deferred to
    maintenance jobs/manual operations outside the chat send/upload path.
    """
    reference_time = now or datetime.now(UTC)
    cutoff = reference_time - timedelta(days=retention_days)

    rows = await db.execute(
        select(ChatAttachment)
        .where(
            ChatAttachment.message_id.is_(None),
            ChatAttachment.created_at < cutoff,
        )
        .order_by(ChatAttachment.created_at.asc())
        .limit(limit)
    )
    return list(rows.scalars().all())


async def create_user_message_with_attachments(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    thread_id: UUID,
    content_text: str,
    run_id: str,
    attachments: list[ChatAttachmentInput] | None = None,
    existing_attachment_ids: list[UUID] | None = None,
) -> ChatMessage:
    """Persist one user message and link attachments transaction-safely."""
    incoming_attachments = attachments or []
    referenced_attachment_ids = existing_attachment_ids or []
    _validate_attachment_inputs(
        attachments=incoming_attachments,
        existing_attachment_ids=referenced_attachment_ids,
    )

    thread = await _load_owned_active_thread(
        db=db,
        thread_id=thread_id,
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
    )

    message_id: UUID | None = None
    try:
        existing_attachments = await _validate_existing_attachments(
            db=db,
            attachment_ids=referenced_attachment_ids,
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
        )
        _validate_total_attachment_bytes(
            incoming_attachments=incoming_attachments,
            existing_attachments=existing_attachments,
        )

        message = ChatMessage(
            organization_id=organization_id,
            thread_id=thread_id,
            created_by_user_id=created_by_user_id,
            role="user",
            content_text=content_text,
            status="completed",
        )
        db.add(message)
        await db.flush()
        message_id = message.id

        for attachment in incoming_attachments:
            db.add(
                ChatAttachment(
                    organization_id=organization_id,
                    uploaded_by_user_id=created_by_user_id,
                    message_id=message.id,
                    storage_key=attachment.storage_key,
                    original_filename=attachment.original_filename,
                    content_type=_normalize_content_type(attachment.content_type) or None,
                    size_bytes=attachment.size_bytes,
                    sha256=attachment.sha256,
                    extracted_text=attachment.extracted_text,
                    artifact_type=attachment.artifact_type,
                )
            )

        for attachment in existing_attachments:
            attachment.message_id = message.id

        derived_title = _derive_conversation_title(content_text)
        if not _is_stable_thread_title(thread.title) and derived_title is not None:
            thread.title = derived_title

        now = datetime.now(UTC)
        thread.last_message_at = now
        thread.last_message_preview = _build_last_message_preview(content_text)
        thread.updated_at = now

        await db.commit()
        await db.refresh(message)

        logger.info(
            "chat_user_message_persisted",
            thread_id=str(thread_id),
            message_id=str(message.id),
            run_id=run_id,
            organization_id=str(organization_id),
            user_id=str(created_by_user_id),
        )
        return message
    except ChatAttachmentValidationError:
        await db.rollback()
        logger.warning(
            "chat_user_message_attachment_validation_failed",
            thread_id=str(thread_id),
            message_id=str(message_id) if message_id else None,
            run_id=run_id,
            organization_id=str(organization_id),
            user_id=str(created_by_user_id),
        )
        raise
    except Exception:
        await db.rollback()
        logger.exception(
            "chat_user_message_persistence_failed",
            thread_id=str(thread_id),
            message_id=str(message_id) if message_id else None,
            run_id=run_id,
            organization_id=str(organization_id),
            user_id=str(created_by_user_id),
        )
        raise


async def _load_recent_thread_history(
    *,
    db: AsyncSession,
    thread_id: UUID,
    limit: int,
    exclude_message_id: UUID | None = None,
) -> list[ChatHistoryItem]:
    filters = [
        ChatMessage.thread_id == thread_id,
        ChatMessage.status == "completed",
    ]
    if exclude_message_id is not None:
        filters.append(ChatMessage.id != exclude_message_id)

    rows = await db.execute(
        select(ChatMessage.role, ChatMessage.content_text)
        .where(*filters)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    )
    latest_first = [
        ChatHistoryItem(role=role, content_text=content_text) for role, content_text in rows.all()
    ]
    latest_first.reverse()
    return latest_first


def _build_agent_prompt(*, history: list[ChatHistoryItem], user_message: str) -> str:
    history_lines = [
        f"{item.role.upper()}: {item.content_text}" for item in history if item.content_text
    ]
    history_block = "\n".join(history_lines) if history_lines else "(no previous messages)"
    return (
        "Conversation history (oldest first; most recent window):\n"
        f"{history_block}\n\n"
        "Current user message:\n"
        f"USER: {user_message}"
    )


async def _persist_assistant_terminal_message(
    *,
    db: AsyncSession,
    thread: ChatThread,
    organization_id: UUID,
    created_by_user_id: UUID,
    content_text: str,
    run_id: str,
    produced_attachment_ids: list[UUID] | None = None,
) -> ChatMessage:
    from sqlalchemy import update

    message = ChatMessage(
        organization_id=organization_id,
        thread_id=thread.id,
        created_by_user_id=created_by_user_id,
        role="assistant",
        content_text=content_text,
        status="completed",
    )
    db.add(message)
    await db.flush()
    now = datetime.now(UTC)
    thread.last_message_at = now
    thread.last_message_preview = _build_last_message_preview(content_text)
    thread.updated_at = now

    if produced_attachment_ids:
        await db.execute(
            update(ChatAttachment)
            .where(
                ChatAttachment.id.in_(produced_attachment_ids),
                ChatAttachment.message_id.is_(None),
            )
            .values(message_id=message.id)
        )

    await db.commit()
    await db.refresh(message)
    logger.info(
        "chat_assistant_message_persisted",
        thread_id=str(thread.id),
        message_id=str(message.id),
        run_id=run_id,
        organization_id=str(organization_id),
        user_id=str(created_by_user_id),
    )
    return message


async def _persist_assistant_failed_message(
    *,
    db: AsyncSession,
    thread: ChatThread,
    organization_id: UUID,
    created_by_user_id: UUID,
    content_text: str,
    run_id: str,
    error_code: str,
) -> ChatMessage:
    message = ChatMessage(
        organization_id=organization_id,
        thread_id=thread.id,
        created_by_user_id=created_by_user_id,
        role="assistant",
        content_text=content_text,
        status="failed",
        error_code=error_code,
    )
    db.add(message)
    now = datetime.now(UTC)
    thread.last_message_at = now
    thread.last_message_preview = _build_last_message_preview(content_text)
    thread.updated_at = now

    await db.commit()
    await db.refresh(message)
    logger.info(
        "chat_assistant_failed_message_persisted",
        thread_id=str(thread.id),
        message_id=str(message.id),
        run_id=run_id,
        organization_id=str(organization_id),
        user_id=str(created_by_user_id),
        error_code=error_code,
    )
    return message


async def _load_message_attachments_for_agent(
    *,
    db: AsyncSession,
    organization_id: UUID,
    message_id: UUID,
) -> list[ChatAttachment]:
    rows = await db.execute(
        select(ChatAttachment)
        .where(
            ChatAttachment.organization_id == organization_id,
            ChatAttachment.message_id == message_id,
        )
        .order_by(ChatAttachment.created_at.asc(), ChatAttachment.id.asc())
    )
    return list(rows.scalars().all())


async def _hydrate_missing_attachment_text(
    *,
    db: AsyncSession,
    attachments: list[ChatAttachment],
) -> list[ChatAttachment]:
    pending_updates = False

    for attachment in attachments:
        if attachment.extracted_text:
            continue

        normalized_content_type = _normalize_content_type(attachment.content_type)
        if not normalized_content_type.startswith("text/"):
            continue

        try:
            content = await download_file_content(attachment.storage_key)
            extracted_text = _extract_text_from_attachment_bytes(
                content=content,
                content_type=attachment.content_type,
            )
            if extracted_text:
                attachment.extracted_text = extracted_text
                pending_updates = True
        except Exception:
            logger.warning(
                "chat_attachment_text_hydration_failed",
                attachment_id=str(attachment.id),
                storage_key=attachment.storage_key,
            )

    if pending_updates:
        await db.commit()

    return attachments


async def stream_chat_turn(
    *,
    organization_id: UUID,
    created_by_user_id: UUID,
    thread_id: UUID,
    content_text: str,
    run_id: str,
    attachments: list[ChatAttachmentInput] | None = None,
    existing_attachment_ids: list[UUID] | None = None,
    session_factory: async_sessionmaker[AsyncSession] = AsyncSessionLocal,
    keepalive_interval_seconds: float = CHAT_STREAM_KEEPALIVE_INTERVAL_SECONDS,
):
    """Stream one chat turn with short database sessions around each unit of work."""
    stream_started_at = perf_counter()
    first_event_at: float | None = None
    first_delta_at: float | None = None
    last_event_at: float | None = None
    max_gap_seconds = 0.0
    emitted_events_count = 0
    emitted_keepalive_count = 0
    stream_outcome = "unknown"

    keepalive_interval = max(float(keepalive_interval_seconds), 0.01)

    def _mark_emitted_event(*, event_type: str) -> None:
        nonlocal first_event_at, first_delta_at, last_event_at, max_gap_seconds, emitted_events_count

        now = perf_counter()
        if first_event_at is None:
            first_event_at = now
            logger.info(
                "chat_stream_first_event",
                thread_id=str(thread_id),
                run_id=run_id,
                organization_id=str(organization_id),
                user_id=str(created_by_user_id),
                event_type=event_type,
                first_event_latency_seconds=now - stream_started_at,
            )

        if event_type == "delta" and first_delta_at is None:
            first_delta_at = now
            logger.info(
                "chat_stream_first_delta",
                thread_id=str(thread_id),
                run_id=run_id,
                organization_id=str(organization_id),
                user_id=str(created_by_user_id),
                first_delta_latency_seconds=now - stream_started_at,
            )

        if last_event_at is not None:
            max_gap_seconds = max(max_gap_seconds, now - last_event_at)

        last_event_at = now
        emitted_events_count += 1

    preparation_events: list[dict] = []

    async with session_factory() as db:
        # Upsert/ownership validation and user message persistence are short-lived
        # DB units; the agent stream below intentionally runs without this session.
        thread, was_created = await ensure_thread_exists(
            db=db,
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
            thread_id=thread_id,
        )

        if was_created:
            preparation_events.append(
                {
                    "event": "data-new-thread-created",
                    "thread_id": str(thread.id),
                    "title": thread.title,
                    "created_at": thread.created_at.isoformat(),
                    "updated_at": thread.updated_at.isoformat(),
                }
            )

        previous_thread_title = thread.title

        user_message = await create_user_message_with_attachments(
            db=db,
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
            thread_id=thread_id,
            content_text=content_text,
            run_id=run_id,
            attachments=attachments,
            existing_attachment_ids=existing_attachment_ids,
        )

        if (
            thread.title
            and thread.title != previous_thread_title
            and _is_stable_thread_title(thread.title)
        ):
            preparation_events.append(
                {
                    "event": "data-conversation-title",
                    "thread_id": str(thread.id),
                    "title": thread.title,
                }
            )

        history = await _load_recent_thread_history(
            db=db,
            thread_id=thread_id,
            limit=CHAT_MODEL_CONTEXT_WINDOW,
            exclude_message_id=user_message.id,
        )
        agent_prompt = _build_agent_prompt(history=history, user_message=user_message.content_text)

        message_attachments = await _load_message_attachments_for_agent(
            db=db,
            organization_id=organization_id,
            message_id=user_message.id,
        )
        message_attachments = await _hydrate_missing_attachment_text(
            db=db,
            attachments=message_attachments,
        )

        history_message_count = len(history)

    agent_attachments = await resolve_attachments_to_agent_input_for_model(message_attachments)
    prepared = _PreparedChatTurn(
        events=tuple(preparation_events),
        agent_prompt=agent_prompt,
        agent_attachments=agent_attachments,
        history_message_count=history_message_count,
    )

    produced_attachment_ids: list[UUID] = []
    produced_storage_keys: list[str] = []

    async def _persist_attachment(
        *,
        storage_key: str,
        filename: str,
        content_type: str,
        size_bytes: int,
        artifact_type: str | None = None,
    ):
        async with session_factory() as db:
            att = ChatAttachment(
                organization_id=organization_id,
                uploaded_by_user_id=created_by_user_id,
                message_id=None,
                storage_key=storage_key,
                original_filename=filename,
                content_type=content_type,
                size_bytes=size_bytes,
                artifact_type=artifact_type,
            )
            db.add(att)
            await db.commit()
            await db.refresh(att)

        return att

    async def _upload_bytes(storage_key: str, data: object, content_type: str) -> str:
        from app.services.s3_service import upload_file_to_s3

        result = await upload_file_to_s3(data, storage_key, content_type)
        produced_storage_keys.append(storage_key)
        return result

    deps = ChatAgentDeps(
        organization_id=str(organization_id),
        user_id=str(created_by_user_id),
        thread_id=str(thread_id),
        run_id=run_id,
        attachments=tuple(prepared.agent_attachments),
        persist_attachment=_persist_attachment,
        upload_bytes=_upload_bytes,
    )
    available_skills = available_skill_names()
    logger.info(
        "chat_stream_started",
        thread_id=str(thread_id),
        run_id=run_id,
        organization_id=str(organization_id),
        user_id=str(created_by_user_id),
        keepalive_interval_seconds=keepalive_interval,
        available_skills=available_skills,
    )
    media_type_counts, total_binary_bytes, total_text_chars, binary_attachment_count = (
        _summarize_attachments_for_observability(attachments=prepared.agent_attachments)
    )
    logger.info(
        "chat_run_agent_input_resolved",
        thread_id=str(thread_id),
        run_id=run_id,
        organization_id=str(organization_id),
        user_id=str(created_by_user_id),
        history_message_count=prepared.history_message_count,
        attachment_count=len(prepared.agent_attachments),
        binary_attachment_count=binary_attachment_count,
        total_binary_bytes=total_binary_bytes,
        total_text_chars=total_text_chars,
        media_type_counts=media_type_counts,
        available_skills=available_skills,
    )

    for event in prepared.events:
        _mark_emitted_event(event_type=str(event.get("event", "unknown")))
        yield event

    _mark_emitted_event(event_type="start")
    yield {"event": "start", "run_id": run_id}
    delta_chunks: list[str] = []
    tools_called: list[dict[str, str]] = []
    try:
        runtime_terminal_text: str | None = None

        runtime_stream = stream_chat_response(
            prompt=prepared.agent_prompt,
            deps=deps,
            attachments=prepared.agent_attachments,
        )
        pending_runtime_event: asyncio.Task[dict] | None = None

        try:
            while True:
                if pending_runtime_event is None:
                    pending_runtime_event = asyncio.create_task(runtime_stream.__anext__())

                try:
                    runtime_event = await asyncio.wait_for(
                        asyncio.shield(pending_runtime_event),
                        timeout=keepalive_interval,
                    )
                    pending_runtime_event = None
                except TimeoutError:
                    emitted_keepalive_count += 1
                    _mark_emitted_event(event_type="keepalive")
                    yield {"event": "keepalive"}
                    continue
                except StopAsyncIteration:
                    pending_runtime_event = None
                    break

                event_type = runtime_event.get("event")
                if event_type == "delta":
                    delta = str(runtime_event.get("delta", ""))
                    if not delta:
                        continue
                    delta_chunks.append(delta)
                    _mark_emitted_event(event_type="delta")
                    yield {"event": "delta", "delta": delta}
                    continue

                if event_type == "agent-status":
                    _mark_emitted_event(event_type="agent-status")
                    yield runtime_event
                    continue

                if event_type == "tool-output-available":
                    output = runtime_event.get("output", {})
                    if isinstance(output, dict) and (att_id := output.get("attachment_id")):
                        with contextlib.suppress(ValueError):
                            produced_attachment_ids.append(UUID(att_id))
                    _mark_emitted_event(event_type="tool-output-available")
                    yield runtime_event
                    continue

                if event_type in (
                    "tool-input-start",
                    "tool-input-delta",
                    "tool-input-available",
                    "tool-output-error",
                ):
                    if event_type == "tool-input-start":
                        tool_name = runtime_event.get("toolName")
                        tool_call_id = runtime_event.get("toolCallId")
                        if isinstance(tool_name, str) and isinstance(tool_call_id, str):
                            tools_called.append(
                                {"tool_name": tool_name, "tool_call_id": tool_call_id}
                            )
                    _mark_emitted_event(event_type=str(event_type))
                    yield runtime_event
                    continue

                if event_type == "completed":
                    candidate = str(runtime_event.get("response_text", "")).strip()
                    if candidate:
                        runtime_terminal_text = candidate
        finally:
            if pending_runtime_event is not None and not pending_runtime_event.done():
                pending_runtime_event.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await pending_runtime_event
            with contextlib.suppress(Exception):
                await runtime_stream.aclose()

        response_text = runtime_terminal_text or "".join(delta_chunks).strip()
        if not response_text:
            raise ChatAgentError("Chat agent returned empty streamed response")

        async with session_factory() as db:
            thread = await _load_owned_active_thread(
                db=db,
                thread_id=thread_id,
                organization_id=organization_id,
                created_by_user_id=created_by_user_id,
            )
            assistant_message = await _persist_assistant_terminal_message(
                db=db,
                thread=thread,
                organization_id=organization_id,
                created_by_user_id=created_by_user_id,
                content_text=response_text,
                run_id=run_id,
                produced_attachment_ids=produced_attachment_ids,
            )

        _mark_emitted_event(event_type="completed")
        yield {
            "event": "completed",
            "message_id": str(assistant_message.id),
        }
        stream_outcome = "completed"
    except asyncio.CancelledError:
        stream_outcome = "cancelled"
        logger.info(
            "chat_stream_cancelled",
            thread_id=str(thread_id),
            run_id=run_id,
            organization_id=str(organization_id),
            user_id=str(created_by_user_id),
            available_skills=available_skills,
            tools_called=tools_called,
        )
        raise
    except BrokenResourceError:
        stream_outcome = "disconnected"
        logger.info(
            "chat_stream_disconnected",
            thread_id=str(thread_id),
            run_id=run_id,
            organization_id=str(organization_id),
            user_id=str(created_by_user_id),
            available_skills=available_skills,
            tools_called=tools_called,
        )
        raise
    except Exception as exc:
        stream_outcome = "failed"
        # Preserve successfully produced attachments so the frontend can still
        # download them even if the overall stream later fails. Only clean up S3
        # objects that have no corresponding persisted attachment record.
        preserved_storage_keys: set[str] = set()
        if produced_attachment_ids:
            try:
                async with session_factory() as db:
                    rows = await db.execute(
                        select(ChatAttachment.storage_key).where(
                            ChatAttachment.id.in_(produced_attachment_ids)
                        )
                    )
                    preserved_storage_keys = set(rows.scalars().all())
            except Exception:
                pass

        if produced_storage_keys:
            from app.services.s3_service import delete_file_from_s3

            for key in produced_storage_keys:
                if key in preserved_storage_keys:
                    continue
                with contextlib.suppress(Exception):
                    await delete_file_from_s3(key)

        logger.info(
            "chat_stream_failure_attachment_preservation",
            produced_attachment_count=len(produced_attachment_ids),
            preserved_storage_key_count=len(preserved_storage_keys),
            deleted_orphan_storage_key_count=len(
                [k for k in produced_storage_keys if k not in preserved_storage_keys]
            ),
            run_id=run_id,
        )

        partial_text = "".join(delta_chunks).strip()
        failed_content = (
            f"{partial_text}\n\n"
            "[The agent failed before completing this response. Please retry.]"
            if partial_text
            else "The agent failed before completing this response. Please retry."
        )
        with contextlib.suppress(Exception):
            async with session_factory() as db:
                thread = await _load_owned_active_thread(
                    db=db,
                    thread_id=thread_id,
                    organization_id=organization_id,
                    created_by_user_id=created_by_user_id,
                )
                await _persist_assistant_failed_message(
                    db=db,
                    thread=thread,
                    organization_id=organization_id,
                    created_by_user_id=created_by_user_id,
                    content_text=failed_content,
                    run_id=run_id,
                    error_code="CHAT_STREAM_FAILED",
                )
        logger.error(
            "chat_stream_failed",
            thread_id=str(thread_id),
            run_id=run_id,
            organization_id=str(organization_id),
            user_id=str(created_by_user_id),
            available_skills=available_skills,
            tools_called=tools_called,
            error=str(exc),
        )
        _mark_emitted_event(event_type="error")
        yield {"event": "error", "code": "CHAT_STREAM_FAILED"}
    finally:
        ended_at = perf_counter()
        logger.info(
            "chat_stream_metrics",
            thread_id=str(thread_id),
            run_id=run_id,
            organization_id=str(organization_id),
            user_id=str(created_by_user_id),
            outcome=stream_outcome,
            cancelled_or_disconnected=stream_outcome in {"cancelled", "disconnected"},
            total_duration_seconds=ended_at - stream_started_at,
            first_event_latency_seconds=(
                None if first_event_at is None else first_event_at - stream_started_at
            ),
            first_delta_latency_seconds=(
                None if first_delta_at is None else first_delta_at - stream_started_at
            ),
            max_gap_seconds=max_gap_seconds,
            emitted_events_count=emitted_events_count,
            emitted_keepalive_count=emitted_keepalive_count,
            available_skills=available_skills,
            tools_called=tools_called,
        )


def build_thread_list_query(
    *,
    organization_id: UUID,
    created_by_user_id: UUID,
    limit: int,
) -> Select[tuple[ChatThread]]:
    """Build list query scoped to org + creator only for v1."""
    return (
        select(ChatThread)
        .where(
            ChatThread.organization_id == organization_id,
            ChatThread.created_by_user_id == created_by_user_id,
            ChatThread.archived_at.is_(None),
        )
        .order_by(ChatThread.last_message_at.desc(), ChatThread.id.desc())
        .limit(limit)
    )


async def list_owned_threads(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    limit: int = 50,
) -> list[ChatThread]:
    """List chat threads using DB-level creator visibility predicates only."""
    statement = build_thread_list_query(
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
        limit=limit,
    )
    result = await db.execute(statement)
    return list(result.scalars().all())


async def create_thread(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    title: str | None = None,
) -> ChatThread:
    """Create one chat thread scoped to org + creator."""
    normalized_title = title.strip() if title else ""
    thread = ChatThread(
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
        title=normalized_title or CHAT_DEFAULT_THREAD_TITLE,
        last_message_preview=None,
        last_message_at=None,
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


async def rename_thread(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    thread_id: UUID,
    title: str,
) -> ChatThread:
    """Rename one owned active thread with normalized title validation."""
    normalized_title = title.strip()
    if not normalized_title:
        raise ChatAttachmentValidationError("THREAD_TITLE_REQUIRED", "Thread title cannot be empty")
    if len(normalized_title) > CHAT_TITLE_MAX_CHARS:
        raise ChatAttachmentValidationError(
            "THREAD_TITLE_TOO_LONG",
            f"Thread title exceeds maximum length of {CHAT_TITLE_MAX_CHARS}",
        )

    thread = await _load_owned_active_thread(
        db=db,
        thread_id=thread_id,
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
    )
    thread.title = normalized_title
    thread.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(thread)
    return thread


async def archive_thread(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    thread_id: UUID,
) -> ChatThread:
    """Soft-delete one owned active thread by setting archived_at timestamp."""
    thread = await _load_owned_active_thread(
        db=db,
        thread_id=thread_id,
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
    )
    now = datetime.now(UTC)
    thread.archived_at = now
    thread.updated_at = now
    await db.commit()
    await db.refresh(thread)
    return thread


async def get_owned_thread(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    thread_id: UUID,
) -> ChatThread:
    """Fetch one owned active thread or fail with not-found contract."""
    result = await db.execute(
        select(ChatThread).where(
            ChatThread.id == thread_id,
            ChatThread.organization_id == organization_id,
            ChatThread.created_by_user_id == created_by_user_id,
            ChatThread.archived_at.is_(None),
        )
    )
    thread = result.scalar_one_or_none()
    if thread is None:
        raise ChatAttachmentValidationError("THREAD_NOT_FOUND", "Thread not found")
    return thread


async def get_owned_attachment(
    *,
    db: AsyncSession,
    organization_id: UUID,
    uploaded_by_user_id: UUID,
    attachment_id: UUID,
) -> ChatAttachment:
    """Fetch one attachment by org+uploader scope or fail with not-found."""
    result = await db.execute(
        select(ChatAttachment).where(
            ChatAttachment.id == attachment_id,
            ChatAttachment.organization_id == organization_id,
            ChatAttachment.uploaded_by_user_id == uploaded_by_user_id,
        )
    )
    attachment = result.scalar_one_or_none()
    if attachment is None:
        raise ChatAttachmentValidationError("ATTACHMENT_NOT_FOUND", "Attachment not found")
    return attachment


async def list_thread_messages(
    *,
    db: AsyncSession,
    thread_id: UUID,
    organization_id: UUID,
) -> list[ChatMessage]:
    """Return thread messages in chronological order."""
    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.thread_id == thread_id,
            ChatMessage.organization_id == organization_id,
        )
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
    )
    return list(result.scalars().all())


async def list_message_attachments(
    *,
    db: AsyncSession,
    message_ids: list[UUID],
    organization_id: UUID,
) -> list[ChatAttachment]:
    """Return attachments for a set of message ids."""
    if not message_ids:
        return []
    result = await db.execute(
        select(ChatAttachment)
        .where(
            ChatAttachment.organization_id == organization_id,
            ChatAttachment.message_id.in_(message_ids),
        )
        .order_by(ChatAttachment.created_at.asc(), ChatAttachment.id.asc())
    )
    return list(result.scalars().all())


async def create_draft_attachment(
    *,
    db: AsyncSession,
    organization_id: UUID,
    uploaded_by_user_id: UUID,
    attachment: ChatAttachmentInput,
) -> ChatAttachment:
    """Create one unlinked attachment draft scoped to org + user."""
    _validate_attachment_inputs(attachments=[attachment], existing_attachment_ids=[])

    attachment_row = ChatAttachment(
        organization_id=organization_id,
        uploaded_by_user_id=uploaded_by_user_id,
        message_id=None,
        storage_key=attachment.storage_key,
        original_filename=attachment.original_filename,
        content_type=_normalize_content_type(attachment.content_type) or None,
        size_bytes=attachment.size_bytes,
        sha256=attachment.sha256,
        extracted_text=attachment.extracted_text,
        artifact_type=attachment.artifact_type,
    )
    db.add(attachment_row)
    await db.commit()
    await db.refresh(attachment_row)
    return attachment_row


async def create_attachment_for_message(
    *,
    db: AsyncSession,
    organization_id: UUID,
    created_by_user_id: UUID,
    message_id: UUID,
    attachment: ChatAttachmentInput,
) -> ChatAttachment:
    """Create one attachment bound to an existing owned user message."""
    _validate_attachment_inputs(attachments=[attachment], existing_attachment_ids=[])

    message_result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.id == message_id,
            ChatMessage.organization_id == organization_id,
            ChatMessage.created_by_user_id == created_by_user_id,
            ChatMessage.role == "user",
        )
    )
    message = message_result.scalar_one_or_none()
    if message is None:
        raise ChatAttachmentValidationError("MESSAGE_NOT_FOUND", "Message not found")

    attachment_row = ChatAttachment(
        organization_id=organization_id,
        uploaded_by_user_id=created_by_user_id,
        message_id=message.id,
        storage_key=attachment.storage_key,
        original_filename=attachment.original_filename,
        content_type=_normalize_content_type(attachment.content_type) or None,
        size_bytes=attachment.size_bytes,
        sha256=attachment.sha256,
        extracted_text=attachment.extracted_text,
        artifact_type=attachment.artifact_type,
    )
    db.add(attachment_row)
    await db.commit()
    await db.refresh(attachment_row)
    return attachment_row
