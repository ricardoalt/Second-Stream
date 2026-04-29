"""Chat v1 API router: threads, detail, attachments, and SSE streaming."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any
from uuid import UUID

import structlog
from anyio import BrokenResourceError
from fastapi import APIRouter, File, Header, HTTPException, Response, UploadFile, status

from app.api.dependencies import AsyncDB, CurrentUser, OrganizationContext
from app.authz import permissions
from app.authz.authz import raise_resource_not_found, require_permission
from app.models.chat_attachment import ChatAttachment
from app.schemas.chat import (
    ChatAttachmentResponse,
    ChatMessageResponse,
    ChatStreamRequest,
    ChatThreadCreateRequest,
    ChatThreadDetailResponse,
    ChatThreadListResponse,
    ChatThreadSummaryResponse,
    ChatThreadUpdateRequest,
    StreamFormat,
)
from app.services.chat_service import (
    MAX_ATTACHMENT_SIZE_BYTES,
    ChatAttachmentInput,
    ChatAttachmentValidationError,
    archive_thread,
    create_attachment_for_message,
    create_draft_attachment,
    create_thread,
    get_owned_attachment,
    get_owned_thread,
    list_message_attachments,
    list_owned_threads,
    list_thread_messages,
    rename_thread,
    stream_chat_turn,
)
from app.services.chat_stream_protocol import (
    PROTOCOL_HEADER,
    PROTOCOL_VERSION,
    adapt_stream_to_legacy_protocol,
    adapt_stream_to_official_protocol,
    extract_latest_user_text_with_vercel_adapter,
)
from app.services.s3_service import delete_file_from_s3, download_file_content, upload_file_to_s3

router = APIRouter(prefix="/chat")
logger = structlog.get_logger(__name__)

CHAT_ATTACHMENT_STORAGE_PREFIX = "chat"
CHAT_ATTACHMENT_EXTRACTED_TEXT_MAX_CHARS = 12_000
CHAT_ALLOWED_UPLOAD_EXACT_MIME_TYPES = {"application/pdf"}
CHAT_ALLOWED_UPLOAD_PREFIXES = ("image/", "text/")


@dataclass(slots=True)
class _ChatStreamSession:
    protocol_official: bool
    _frames: list[str] = field(default_factory=list)
    _done: bool = False
    _condition: asyncio.Condition = field(default_factory=asyncio.Condition)

    async def publish(self, frame: str) -> None:
        async with self._condition:
            self._frames.append(frame)
            self._condition.notify_all()

    async def close(self) -> None:
        async with self._condition:
            self._done = True
            self._condition.notify_all()

    async def iter_frames(self) -> AsyncIterator[str]:
        index = 0
        while True:
            async with self._condition:
                while index >= len(self._frames) and not self._done:
                    await self._condition.wait()

                if index < len(self._frames):
                    frame = self._frames[index]
                    index += 1
                elif self._done:
                    break
                else:
                    continue

            yield frame


# Best-effort stream resume cache: process-local/in-memory only (no cross-worker durability).
_active_chat_stream_sessions: dict[tuple[str, str, str], _ChatStreamSession] = {}


def _build_stream_session_key(*, organization_id: UUID, user_id: UUID, thread_id: UUID) -> tuple[str, str, str]:
    return (str(organization_id), str(user_id), str(thread_id))


def _raise_chat_error(exc: ChatAttachmentValidationError) -> None:
    status_code = status.HTTP_400_BAD_REQUEST
    if exc.code in {"THREAD_NOT_FOUND", "MESSAGE_NOT_FOUND", "ATTACHMENT_NOT_FOUND"}:
        status_code = status.HTTP_404_NOT_FOUND
    if exc.code == "ATTACHMENT_ALREADY_LINKED":
        status_code = status.HTTP_409_CONFLICT
    raise HTTPException(
        status_code=status_code,
        detail={"code": exc.code, "message": str(exc)},
    )


def _attachment_to_response(attachment: ChatAttachment) -> ChatAttachmentResponse:
    return ChatAttachmentResponse(
        id=attachment.id,
        message_id=attachment.message_id,
        original_filename=attachment.original_filename,
        content_type=attachment.content_type,
        size_bytes=attachment.size_bytes,
        created_at=attachment.created_at,
        artifact_type=attachment.artifact_type,
    )


def _sse_encode(event_payload: dict[str, Any]) -> str:
    event_name = str(event_payload["event"])
    data_payload = {k: v for k, v in event_payload.items() if k != "event"}
    return f"event: {event_name}\ndata: {json.dumps(data_payload)}\n\n"


def _normalize_attachment_content_type(content_type: str | None) -> str:
    if content_type is None:
        return ""
    return content_type.split(";", 1)[0].strip().lower()


def _build_attachment_storage_key(*, organization_id: UUID, user_id: UUID, filename: str) -> str:
    safe_name = Path(filename).name or "attachment"
    return f"{CHAT_ATTACHMENT_STORAGE_PREFIX}/{organization_id}/{user_id}/{uuid.uuid4().hex}-{safe_name}"


def _extract_attachment_text(*, content: bytes, content_type: str | None) -> str | None:
    normalized = _normalize_attachment_content_type(content_type)
    if not normalized.startswith("text/"):
        return None

    extracted = content.decode("utf-8", errors="replace").strip()
    if not extracted:
        return None
    if len(extracted) <= CHAT_ATTACHMENT_EXTRACTED_TEXT_MAX_CHARS:
        return extracted
    return extracted[:CHAT_ATTACHMENT_EXTRACTED_TEXT_MAX_CHARS]


async def _cleanup_uploaded_attachment_blob(storage_key: str) -> None:
    try:
        await delete_file_from_s3(storage_key)
    except Exception:
        logger.warning(
            "chat_attachment_upload_compensation_cleanup_failed",
            storage_key=storage_key,
        )


def _build_attachment_input_and_persist_content(
    *,
    organization_id: UUID,
    user_id: UUID,
    file_name: str,
    content_type: str | None,
    content: bytes,
) -> ChatAttachmentInput:
    normalized_content_type = _normalize_attachment_content_type(content_type)
    if normalized_content_type not in CHAT_ALLOWED_UPLOAD_EXACT_MIME_TYPES and not any(
        normalized_content_type.startswith(prefix) for prefix in CHAT_ALLOWED_UPLOAD_PREFIXES
    ):
        raise ChatAttachmentValidationError(
            "ATTACHMENT_MIME_NOT_ALLOWED",
            "Attachment MIME type is not allowed",
        )

    if len(content) > MAX_ATTACHMENT_SIZE_BYTES:
        raise ChatAttachmentValidationError(
            "ATTACHMENT_TOO_LARGE",
            "Attachment exceeds maximum allowed size",
        )

    storage_key = _build_attachment_storage_key(
        organization_id=organization_id,
        user_id=user_id,
        filename=file_name,
    )

    return ChatAttachmentInput(
        storage_key=storage_key,
        original_filename=file_name,
        content_type=normalized_content_type or None,
        size_bytes=len(content),
        sha256=hashlib.sha256(content).hexdigest(),
        extracted_text=_extract_attachment_text(
            content=content,
            content_type=normalized_content_type,
        ),
    )


@router.post("/threads", response_model=ChatThreadSummaryResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_thread(
    payload: ChatThreadCreateRequest,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> ChatThreadSummaryResponse:
    require_permission(current_user, permissions.CHAT_WRITE)
    thread = await create_thread(
        db=db,
        organization_id=org.id,
        created_by_user_id=current_user.id,
        title=payload.title,
    )
    return ChatThreadSummaryResponse.model_validate(thread)


@router.get("/threads", response_model=ChatThreadListResponse)
async def list_chat_threads(
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> ChatThreadListResponse:
    require_permission(current_user, permissions.CHAT_READ)
    rows = await list_owned_threads(
        db=db,
        organization_id=org.id,
        created_by_user_id=current_user.id,
        limit=50,
    )
    return ChatThreadListResponse(items=[ChatThreadSummaryResponse.model_validate(row) for row in rows])


@router.get("/threads/{thread_id}", response_model=ChatThreadDetailResponse)
async def get_chat_thread(
    thread_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> ChatThreadDetailResponse:
    require_permission(current_user, permissions.CHAT_READ)
    try:
        thread = await get_owned_thread(
            db=db,
            organization_id=org.id,
            created_by_user_id=current_user.id,
            thread_id=thread_id,
        )
    except ChatAttachmentValidationError:
        raise_resource_not_found("Chat thread not found", details={"thread_id": str(thread_id)})

    messages = await list_thread_messages(db=db, thread_id=thread.id, organization_id=org.id)
    attachments = await list_message_attachments(
        db=db,
        message_ids=[message.id for message in messages],
        organization_id=org.id,
    )
    attachments_by_message: dict[UUID, list[ChatAttachmentResponse]] = {}
    for attachment in attachments:
        if attachment.message_id is None:
            continue
        attachments_by_message.setdefault(attachment.message_id, []).append(
            _attachment_to_response(attachment)
        )

    return ChatThreadDetailResponse(
        id=thread.id,
        title=thread.title,
        last_message_preview=thread.last_message_preview,
        last_message_at=thread.last_message_at,
        messages=[
            ChatMessageResponse(
                id=message.id,
                role=message.role,
                content_text=message.content_text,
                status=message.status,
                created_at=message.created_at,
                attachments=attachments_by_message.get(message.id, []),
            )
            for message in messages
        ],
    )


@router.patch("/threads/{thread_id}", response_model=ChatThreadSummaryResponse)
async def rename_chat_thread(
    thread_id: UUID,
    payload: ChatThreadUpdateRequest,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> ChatThreadSummaryResponse:
    require_permission(current_user, permissions.CHAT_WRITE)
    try:
        thread = await rename_thread(
            db=db,
            organization_id=org.id,
            created_by_user_id=current_user.id,
            thread_id=thread_id,
            title=payload.title,
        )
    except ChatAttachmentValidationError as exc:
        if exc.code == "THREAD_NOT_FOUND":
            raise_resource_not_found("Chat thread not found", details={"thread_id": str(thread_id)})
        _raise_chat_error(exc)

    return ChatThreadSummaryResponse.model_validate(thread)


@router.post("/threads/{thread_id}/archive", response_model=ChatThreadSummaryResponse)
async def archive_chat_thread(
    thread_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> ChatThreadSummaryResponse:
    require_permission(current_user, permissions.CHAT_WRITE)
    try:
        thread = await archive_thread(
            db=db,
            organization_id=org.id,
            created_by_user_id=current_user.id,
            thread_id=thread_id,
        )
    except ChatAttachmentValidationError as exc:
        if exc.code == "THREAD_NOT_FOUND":
            raise_resource_not_found("Chat thread not found", details={"thread_id": str(thread_id)})
        _raise_chat_error(exc)

    return ChatThreadSummaryResponse.model_validate(thread)


@router.post("/messages/{message_id}/attachments", response_model=ChatAttachmentResponse, status_code=201)
async def upload_chat_attachment(
    message_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    file: Annotated[UploadFile, File(...)],
) -> ChatAttachmentResponse:
    require_permission(current_user, permissions.CHAT_ATTACHMENT_UPLOAD)

    content = await file.read()
    original_filename = file.filename or "attachment"
    try:
        attachment_input = _build_attachment_input_and_persist_content(
            organization_id=org.id,
            user_id=current_user.id,
            file_name=original_filename,
            content_type=file.content_type,
            content=content,
        )
    except ChatAttachmentValidationError as exc:
        _raise_chat_error(exc)

    await upload_file_to_s3(
        BytesIO(content),
        attachment_input.storage_key,
        content_type=_normalize_attachment_content_type(file.content_type) or None,
    )

    try:
        attachment = await create_attachment_for_message(
            db=db,
            organization_id=org.id,
            created_by_user_id=current_user.id,
            message_id=message_id,
            attachment=attachment_input,
        )
    except ChatAttachmentValidationError as exc:
        await _cleanup_uploaded_attachment_blob(attachment_input.storage_key)
        _raise_chat_error(exc)
    except Exception as exc:
        await _cleanup_uploaded_attachment_blob(attachment_input.storage_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "ATTACHMENT_UPLOAD_FAILED", "message": "Attachment upload failed"},
        ) from exc

    return _attachment_to_response(attachment)


@router.get("/attachments/{attachment_id}/download")
async def download_chat_attachment(
    attachment_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> Response:
    require_permission(current_user, permissions.CHAT_READ)

    try:
        attachment = await get_owned_attachment(
            db=db,
            organization_id=org.id,
            uploaded_by_user_id=current_user.id,
            attachment_id=attachment_id,
        )
        content = await download_file_content(attachment.storage_key)
    except ChatAttachmentValidationError as exc:
        _raise_chat_error(exc)
    except FileNotFoundError:
        _raise_chat_error(
            ChatAttachmentValidationError("ATTACHMENT_NOT_FOUND", "Attachment file not found")
        )

    filename = Path(attachment.original_filename).name.replace('"', "") or "attachment"
    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
    }
    return Response(
        content=content,
        media_type=attachment.content_type or "application/octet-stream",
        headers=headers,
    )


@router.post("/attachments", response_model=ChatAttachmentResponse, status_code=201)
async def upload_chat_attachment_draft(
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    file: Annotated[UploadFile, File(...)],
) -> ChatAttachmentResponse:
    require_permission(current_user, permissions.CHAT_ATTACHMENT_UPLOAD)

    content = await file.read()
    original_filename = file.filename or "attachment"
    try:
        attachment_input = _build_attachment_input_and_persist_content(
            organization_id=org.id,
            user_id=current_user.id,
            file_name=original_filename,
            content_type=file.content_type,
            content=content,
        )
    except ChatAttachmentValidationError as exc:
        _raise_chat_error(exc)

    await upload_file_to_s3(
        BytesIO(content),
        attachment_input.storage_key,
        content_type=_normalize_attachment_content_type(file.content_type) or None,
    )

    try:
        attachment = await create_draft_attachment(
            db=db,
            organization_id=org.id,
            uploaded_by_user_id=current_user.id,
            attachment=attachment_input,
        )
    except ChatAttachmentValidationError as exc:
        await _cleanup_uploaded_attachment_blob(attachment_input.storage_key)
        _raise_chat_error(exc)
    except Exception as exc:
        await _cleanup_uploaded_attachment_blob(attachment_input.storage_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "ATTACHMENT_UPLOAD_FAILED", "message": "Attachment upload failed"},
        ) from exc

    return _attachment_to_response(attachment)


@router.post("/threads/{thread_id}/messages/stream")
async def stream_chat_message(
    thread_id: UUID,
    payload: ChatStreamRequest,
    current_user: CurrentUser,
    org: OrganizationContext,
    x_vercel_ai_ui_message_stream: Annotated[str | None, Header()] = None,
):
    """Stream a chat turn using the negotiated protocol format.

    Protocol negotiation (priority order):
    1. Request body ``stream_format`` field (``official`` | ``legacy``)
    2. Header ``x-vercel-ai-ui-message-stream: v1`` → official
    3. Default → official (canonical product target)
    """
    require_permission(current_user, permissions.CHAT_WRITE)
    run_id = f"run-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
    content_text = _resolve_content_text(payload)
    payload_messages_count, payload_file_parts_count = _summarize_ui_messages(payload.messages)
    session_key = _build_stream_session_key(
        organization_id=org.id,
        user_id=current_user.id,
        thread_id=thread_id,
    )

    # Resolve negotiated format: body field > header > default
    use_official = _resolve_stream_format(payload.stream_format, x_vercel_ai_ui_message_stream)

    previous_session = _active_chat_stream_sessions.get(session_key)
    if previous_session is not None:
        await previous_session.close()

    stream_session = _ChatStreamSession(protocol_official=use_official)
    _active_chat_stream_sessions[session_key] = stream_session

    logger.info(
        "chat_stream_request_received",
        thread_id=str(thread_id),
        run_id=run_id,
        organization_id=str(org.id),
        user_id=str(current_user.id),
        stream_format="official" if use_official else "legacy",
        existing_attachment_ids_count=len(payload.existing_attachment_ids),
        payload_messages_count=payload_messages_count,
        payload_file_parts_count=payload_file_parts_count,
    )

    async def _event_generator():
        try:
            internal_stream = stream_chat_turn(
                organization_id=org.id,
                created_by_user_id=current_user.id,
                thread_id=thread_id,
                content_text=content_text,
                run_id=run_id,
                existing_attachment_ids=payload.existing_attachment_ids,
            )
            if use_official:
                async for frame in adapt_stream_to_official_protocol(internal_stream):
                    await stream_session.publish(frame)
                    yield frame
            else:
                async for frame in adapt_stream_to_legacy_protocol(internal_stream):
                    await stream_session.publish(frame)
                    yield frame
        except asyncio.CancelledError:
            logger.info(
                "chat_stream_client_disconnected",
                thread_id=str(thread_id),
                run_id=run_id,
                organization_id=str(org.id),
                user_id=str(current_user.id),
            )
            raise
        except BrokenResourceError:
            logger.info(
                "chat_stream_client_channel_closed",
                thread_id=str(thread_id),
                run_id=run_id,
                organization_id=str(org.id),
                user_id=str(current_user.id),
            )
        except ChatAttachmentValidationError as exc:
            # Attachment validation errors bypass the stream adapter —
            # they are emitted directly in the negotiated format.
            if use_official:
                from app.services.chat_stream_protocol import encode_official_sse

                error_frame = encode_official_sse("error", {"errorText": exc.code})
                await stream_session.publish(error_frame)
                yield error_frame

                done_frame = "data: [DONE]\n\n"
                await stream_session.publish(done_frame)
                yield done_frame
            else:
                error_frame = _sse_encode({"event": "error", "code": exc.code})
                await stream_session.publish(error_frame)
                yield error_frame
        finally:
            await stream_session.close()
            if _active_chat_stream_sessions.get(session_key) is stream_session:
                _active_chat_stream_sessions.pop(session_key, None)

    from fastapi.responses import StreamingResponse

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }
    if use_official:
        headers[PROTOCOL_HEADER] = PROTOCOL_VERSION

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers=headers,
    )


@router.get("/threads/{thread_id}/messages/stream")
async def reconnect_chat_message_stream(
    thread_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
):
    """Reconnect to an in-flight chat stream if one exists.

    Returns 204 when there is no active stream for this user/thread pair.
    """

    require_permission(current_user, permissions.CHAT_WRITE)

    session_key = _build_stream_session_key(
        organization_id=org.id,
        user_id=current_user.id,
        thread_id=thread_id,
    )
    stream_session = _active_chat_stream_sessions.get(session_key)
    if stream_session is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    from fastapi.responses import StreamingResponse

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }
    if stream_session.protocol_official:
        headers[PROTOCOL_HEADER] = PROTOCOL_VERSION

    return StreamingResponse(
        stream_session.iter_frames(),
        media_type="text/event-stream",
        headers=headers,
    )


def _resolve_stream_format(
    body_format: StreamFormat,
    header_value: str | None,
) -> bool:
    """Return True for official protocol, False for legacy.

    Priority: body field > header > default (official).
    """
    if body_format == StreamFormat.LEGACY:
        return False
    if body_format == StreamFormat.OFFICIAL:
        return True
    # Body was default (official) but check header for explicit opt-in
    if header_value and header_value.strip().lower() == PROTOCOL_VERSION:
        return True
    return True  # Default to official


def _summarize_ui_messages(messages: list[dict[str, Any]]) -> tuple[int, int]:
    file_parts_count = 0
    for message in messages:
        parts = message.get("parts")
        if not isinstance(parts, list):
            continue
        for part in parts:
            if isinstance(part, dict) and part.get("type") == "file":
                file_parts_count += 1
    return len(messages), file_parts_count


def _resolve_content_text(payload: ChatStreamRequest) -> str:
    if payload.content_text and payload.content_text.strip():
        return payload.content_text.strip()

    extracted = extract_latest_user_text_with_vercel_adapter(payload.messages)
    if extracted:
        return extracted

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "code": "CONTENT_TEXT_REQUIRED",
            "message": "contentText is required when no user text can be derived from messages",
        },
    )
