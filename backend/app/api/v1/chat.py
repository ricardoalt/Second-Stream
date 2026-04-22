"""Chat v1 API router: threads, detail, attachments, and SSE streaming."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, File, Header, HTTPException, UploadFile, status

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
    StreamFormat,
)
from app.services.chat_service import (
    ChatAttachmentInput,
    ChatAttachmentValidationError,
    create_attachment_for_message,
    create_draft_attachment,
    create_thread,
    get_owned_thread,
    list_message_attachments,
    list_owned_threads,
    list_thread_messages,
    stream_chat_turn,
)
from app.services.chat_stream_protocol import (
    PROTOCOL_HEADER,
    PROTOCOL_VERSION,
    adapt_stream_to_legacy_protocol,
    adapt_stream_to_official_protocol,
)

router = APIRouter(prefix="/chat")


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
    )


def _sse_encode(event_payload: dict[str, Any]) -> str:
    event_name = str(event_payload["event"])
    data_payload = {k: v for k, v in event_payload.items() if k != "event"}
    return f"event: {event_name}\ndata: {json.dumps(data_payload)}\n\n"


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
    attachment_input = ChatAttachmentInput(
        storage_key=f"chat/{org.id}/{current_user.id}/{uuid.uuid4().hex}",
        original_filename=file.filename or "attachment",
        content_type=file.content_type,
        size_bytes=len(content),
        sha256=hashlib.sha256(content).hexdigest(),
        extracted_text=None,
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
        _raise_chat_error(exc)

    return _attachment_to_response(attachment)


@router.post("/attachments", response_model=ChatAttachmentResponse, status_code=201)
async def upload_chat_attachment_draft(
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    file: Annotated[UploadFile, File(...)],
) -> ChatAttachmentResponse:
    require_permission(current_user, permissions.CHAT_ATTACHMENT_UPLOAD)

    content = await file.read()
    attachment_input = ChatAttachmentInput(
        storage_key=f"chat/{org.id}/{current_user.id}/{uuid.uuid4().hex}",
        original_filename=file.filename or "attachment",
        content_type=file.content_type,
        size_bytes=len(content),
        sha256=hashlib.sha256(content).hexdigest(),
        extracted_text=None,
    )

    try:
        attachment = await create_draft_attachment(
            db=db,
            organization_id=org.id,
            uploaded_by_user_id=current_user.id,
            attachment=attachment_input,
        )
    except ChatAttachmentValidationError as exc:
        _raise_chat_error(exc)

    return _attachment_to_response(attachment)


@router.post("/threads/{thread_id}/messages/stream")
async def stream_chat_message(
    thread_id: UUID,
    payload: ChatStreamRequest,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
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

    # Resolve negotiated format: body field > header > default
    use_official = _resolve_stream_format(payload.stream_format, x_vercel_ai_ui_message_stream)

    async def _event_generator():
        try:
            internal_stream = stream_chat_turn(
                db=db,
                organization_id=org.id,
                created_by_user_id=current_user.id,
                thread_id=thread_id,
                content_text=payload.content_text,
                run_id=run_id,
                existing_attachment_ids=payload.existing_attachment_ids,
            )
            if use_official:
                async for frame in adapt_stream_to_official_protocol(internal_stream):
                    yield frame
            else:
                async for frame in adapt_stream_to_legacy_protocol(internal_stream):
                    yield frame
        except ChatAttachmentValidationError as exc:
            # Attachment validation errors bypass the stream adapter —
            # they are emitted directly in the negotiated format.
            if use_official:
                from app.services.chat_stream_protocol import encode_official_sse

                yield encode_official_sse("error", {"errorText": exc.code})
                yield "data: [DONE]\n\n"
            else:
                yield _sse_encode({"event": "error", "code": exc.code})

    from fastapi.responses import StreamingResponse

    headers = {}
    if use_official:
        headers[PROTOCOL_HEADER] = PROTOCOL_VERSION

    return StreamingResponse(
        _event_generator(),
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
