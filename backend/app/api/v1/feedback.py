"""Feedback endpoints."""

import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import urlparse
from uuid import UUID, uuid4

import aiofiles
import structlog
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload, selectinload

from app.api.dependencies import (
    AsyncDB,
    CurrentUser,
    CurrentUserOrganization,
    OrganizationContext,
    RateLimitUser10,
    RateLimitUser30,
    RateLimitUser60,
)
from app.authz import permissions
from app.authz.authz import require_permission
from app.core.config import settings
from app.models.feedback import Feedback
from app.models.feedback_attachment import FeedbackAttachment
from app.models.user import User
from app.schemas.feedback import (
    FeedbackAdminRead,
    FeedbackAttachmentAdminRead,
    FeedbackAttachmentRead,
    FeedbackCreate,
    FeedbackPublicCreateResponse,
    FeedbackType,
    FeedbackUpdate,
)
from app.services.s3_service import get_presigned_url_with_headers, upload_file_to_s3
from app.services.storage_delete_service import delete_storage_keys

router = APIRouter()
admin_router = APIRouter()
logger = structlog.get_logger(__name__)

FeedbackTypeFilter = Annotated[
    FeedbackType | None,
    Query(
        description="Filter by feedback type",
        examples=["bug", "incorrect_response", "feature_request", "general"],
    ),
]

MAX_ATTACHMENTS_PER_FEEDBACK = 5
MAX_ATTACHMENT_SIZE = settings.MAX_UPLOAD_SIZE
STREAM_CHUNK_SIZE = 1024 * 1024


def _sanitize_page_path(page_path: str | None) -> str | None:
    if page_path is None:
        return None
    parsed = urlparse(page_path)
    if parsed.scheme and parsed.scheme not in ("http", "https"):
        return None
    path = parsed.path
    if not path:
        return None
    if not path.startswith("/"):
        path = f"/{path}"
    if len(path) > 512:
        return None
    return path


def _error_detail(message: str, code: str, details: dict | None = None) -> dict:
    return {"message": message, "code": code, "details": details or {}}


def _sanitize_filename(filename: str) -> str:
    cleaned = Path(filename.replace("\\", "/")).name
    cleaned = "".join(ch for ch in cleaned if ch.isprintable() and ch not in "\x00")
    cleaned = cleaned.strip()
    if len(cleaned) > 200:
        cleaned = cleaned[:200]
    return cleaned


def _sniff_image_type(path: Path) -> tuple[bool, str | None, str | None]:
    with path.open("rb") as handle:
        header = handle.read(16)

    if len(header) >= 3 and header[:3] == b"\xff\xd8\xff":
        return True, ".jpg", "image/jpeg"
    if len(header) >= 8 and header[:8] == b"\x89PNG\r\n\x1a\n":
        return True, ".png", "image/png"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return True, ".webp", "image/webp"
    return False, None, None


async def _stream_upload_to_temp(upload_file: UploadFile) -> tuple[Path, int]:
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_path = Path(tmp_file.name)

    size = 0
    try:
        async with aiofiles.open(tmp_path, "wb") as out:
            while True:
                chunk = await upload_file.read(STREAM_CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_ATTACHMENT_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=_error_detail(
                            "File too large",
                            "FILE_TOO_LARGE",
                            {"maxSizeBytes": MAX_ATTACHMENT_SIZE},
                        ),
                    )
                await out.write(chunk)
        return tmp_path, size
    except Exception:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise


def _suffix_from_filename(filename: str) -> str:
    return Path(filename).suffix or ""


def _preview_content_type_from_key(storage_key: str) -> str | None:
    preview_content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    return preview_content_types.get(Path(storage_key).suffix.lower())


@router.post(
    "",
    response_model=FeedbackPublicCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_feedback(
    payload: FeedbackCreate,
    current_user: CurrentUser,
    org: CurrentUserOrganization,
    db: AsyncDB,
    _rate_limit: RateLimitUser30,
):
    require_permission(current_user, permissions.FEEDBACK_CREATE)
    feedback = Feedback(
        organization_id=org.id,
        user_id=current_user.id,
        content=payload.content,
        feedback_type=payload.feedback_type,
        page_path=_sanitize_page_path(payload.page_path),
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return FeedbackPublicCreateResponse(id=feedback.id, created_at=feedback.created_at)


@router.post(
    "/{feedback_id}/attachments",
    response_model=list[FeedbackAttachmentRead],
    status_code=status.HTTP_201_CREATED,
)
async def upload_feedback_attachments(
    feedback_id: UUID,
    attachments: Annotated[list[UploadFile], File()],
    current_user: CurrentUser,
    org: CurrentUserOrganization,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
):
    require_permission(current_user, permissions.FEEDBACK_ATTACHMENT_UPLOAD)

    async def rollback_and_cleanup_uploaded_keys(*, log_message: str) -> None:
        await db.rollback()
        if not uploaded_keys:
            return
        try:
            await delete_storage_keys(uploaded_keys)
        except Exception:
            logger.warning(log_message, uploaded_key_count=len(uploaded_keys))

    result = await db.execute(
        select(Feedback)
        .where(
            Feedback.id == feedback_id,
            Feedback.organization_id == org.id,
            Feedback.user_id == current_user.id,
        )
        .with_for_update()
    )
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_error_detail(
                "Feedback not found",
                "NOT_FOUND",
                {"feedbackId": str(feedback_id)},
            ),
        )

    if not attachments:
        return []

    existing_count = await db.scalar(
        select(func.count(FeedbackAttachment.id)).where(
            FeedbackAttachment.organization_id == org.id,
            FeedbackAttachment.feedback_id == feedback_id,
        )
    )
    existing_total = int(existing_count or 0)
    if existing_total + len(attachments) > MAX_ATTACHMENTS_PER_FEEDBACK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_error_detail(
                "Too many attachments",
                "TOO_MANY_ATTACHMENTS",
                {
                    "maxAttachments": MAX_ATTACHMENTS_PER_FEEDBACK,
                    "existing": existing_total,
                    "incoming": len(attachments),
                },
            ),
        )

    uploaded_keys: list[str] = []
    created_attachments: list[FeedbackAttachment] = []

    try:
        for upload in attachments:
            if not upload.filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=_error_detail("Filename is required", "INVALID_FILENAME"),
                )

            sanitized_name = _sanitize_filename(upload.filename)
            if not sanitized_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=_error_detail("Invalid filename", "INVALID_FILENAME"),
                )

            tmp_path = None
            try:
                tmp_path, size_bytes = await _stream_upload_to_temp(upload)
                is_previewable, forced_suffix, sniffed_content_type = _sniff_image_type(tmp_path)
                suffix = forced_suffix if is_previewable else _suffix_from_filename(upload.filename)
                attachment_id = uuid4()
                storage_key = f"feedback/{org.id}/{feedback.id}/{attachment_id}{suffix}"
                stored_content_type = (
                    sniffed_content_type if is_previewable else (upload.content_type or None)
                )

                try:
                    with tmp_path.open("rb") as file_buffer:
                        await upload_file_to_s3(file_buffer, storage_key, stored_content_type)
                except Exception as exc:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=_error_detail("Upload failed", "UPLOAD_FAILED"),
                    ) from exc

                uploaded_keys.append(storage_key)

                attachment = FeedbackAttachment(
                    id=attachment_id,
                    organization_id=org.id,
                    feedback_id=feedback.id,
                    storage_key=storage_key,
                    original_filename=sanitized_name,
                    content_type=stored_content_type,
                    size_bytes=size_bytes,
                    is_previewable=is_previewable,
                    uploaded_by_user_id=current_user.id,
                )
                db.add(attachment)
                created_attachments.append(attachment)
            finally:
                if tmp_path and tmp_path.exists():
                    tmp_path.unlink(missing_ok=True)

        await db.commit()
        for attachment in created_attachments:
            await db.refresh(attachment)
        return [
            FeedbackAttachmentRead.model_validate(attachment) for attachment in created_attachments
        ]
    except HTTPException:
        await rollback_and_cleanup_uploaded_keys(
            log_message="Failed to cleanup feedback attachment uploads after HTTP error"
        )
        raise
    except Exception as exc:
        await rollback_and_cleanup_uploaded_keys(
            log_message="Failed to cleanup feedback attachment uploads after unexpected error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=_error_detail("Upload failed", "UPLOAD_FAILED"),
        ) from exc


@admin_router.get("", response_model=list[FeedbackAdminRead])
async def list_feedback(
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser60,
    days: Annotated[
        Literal[7, 30] | None,
        Query(description="Filter by recency", examples=[7, 30]),
    ] = None,
    resolved: Annotated[bool | None, Query(description="Filter by resolved status")] = None,
    feedback_type: FeedbackTypeFilter = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    require_permission(current_user, permissions.FEEDBACK_READ)
    attachment_count_subq = (
        select(func.count(FeedbackAttachment.id))
        .where(
            FeedbackAttachment.feedback_id == Feedback.id,
            FeedbackAttachment.organization_id == Feedback.organization_id,
        )
        .correlate(Feedback)
        .scalar_subquery()
        .label("attachment_count")
    )

    query = (
        select(Feedback, attachment_count_subq)
        .options(selectinload(Feedback.user).load_only(User.id, User.first_name, User.last_name))
        .where(Feedback.organization_id == org.id)
    )

    if days:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        query = query.where(Feedback.created_at >= cutoff)

    if resolved is not None:
        query = query.where(
            Feedback.resolved_at.isnot(None) if resolved else Feedback.resolved_at.is_(None)
        )

    if feedback_type:
        query = query.where(Feedback.feedback_type == feedback_type)

    query = query.order_by(Feedback.created_at.desc()).limit(limit)
    result = await db.execute(query)
    rows = result.all()
    return [
        FeedbackAdminRead.model_validate(fb, from_attributes=True).model_copy(
            update={"attachment_count": count}
        )
        for fb, count in rows
    ]


@admin_router.get(
    "/{feedback_id}/attachments",
    response_model=list[FeedbackAttachmentAdminRead],
)
async def list_feedback_attachments(
    feedback_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser60,
):
    require_permission(current_user, permissions.FEEDBACK_READ)
    feedback_exists = await db.scalar(
        select(Feedback.id).where(
            Feedback.id == feedback_id,
            Feedback.organization_id == org.id,
        )
    )
    if not feedback_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found",
        )

    result = await db.execute(
        select(FeedbackAttachment)
        .where(
            FeedbackAttachment.organization_id == org.id,
            FeedbackAttachment.feedback_id == feedback_id,
        )
        .order_by(FeedbackAttachment.created_at.asc())
    )
    attachments = result.scalars().all()

    response_items: list[FeedbackAttachmentAdminRead] = []
    for attachment in attachments:
        download_url = await get_presigned_url_with_headers(
            attachment.storage_key,
            disposition="attachment",
            download_name=attachment.original_filename,
        )

        preview_url = None
        if attachment.is_previewable:
            preview_content_type = _preview_content_type_from_key(attachment.storage_key)
            preview_url = await get_presigned_url_with_headers(
                attachment.storage_key,
                disposition="inline",
                download_name=attachment.original_filename,
                content_type=preview_content_type,
            )

        response_items.append(
            FeedbackAttachmentAdminRead(
                id=attachment.id,
                original_filename=attachment.original_filename,
                size_bytes=attachment.size_bytes,
                content_type=attachment.content_type,
                is_previewable=attachment.is_previewable,
                created_at=attachment.created_at,
                download_url=download_url,
                preview_url=preview_url,
            )
        )

    return response_items


@admin_router.delete(
    "/{feedback_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_feedback(
    feedback_id: UUID,
    current_admin: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser30,
):
    require_permission(current_admin, permissions.FEEDBACK_MODERATE)
    result = await db.execute(
        select(Feedback)
        .where(
            Feedback.id == feedback_id,
            Feedback.organization_id == org.id,
        )
        .with_for_update()
    )
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found",
        )

    if feedback.resolved_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_error_detail(
                "Feedback must be resolved before deletion",
                "FEEDBACK_NOT_RESOLVED",
                {"feedbackId": str(feedback_id)},
            ),
        )

    attachment_rows = await db.scalars(
        select(FeedbackAttachment.storage_key).where(
            FeedbackAttachment.organization_id == org.id,
            FeedbackAttachment.feedback_id == feedback_id,
        )
    )
    storage_keys = [key for key in attachment_rows.all() if key]

    await db.delete(feedback)
    await db.commit()

    if storage_keys:
        try:
            await delete_storage_keys(storage_keys)
        except Exception as exc:
            logger.warning(
                "feedback_attachment_cleanup_failed",
                feedback_id=str(feedback_id),
                organization_id=str(org.id),
                error=str(exc),
                key_count=len(storage_keys),
            )

    return None


@admin_router.patch("/{feedback_id}", response_model=FeedbackAdminRead)
async def update_feedback(
    feedback_id: UUID,
    payload: FeedbackUpdate,
    current_admin: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser30,
):
    require_permission(current_admin, permissions.FEEDBACK_MODERATE)
    result = await db.execute(
        select(Feedback)
        .options(selectinload(Feedback.user).load_only(User.id, User.first_name, User.last_name))
        .where(Feedback.id == feedback_id, Feedback.organization_id == org.id)
        .with_for_update()
    )
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    if payload.resolved:
        feedback.resolved_at = datetime.now(UTC)
        feedback.resolved_by_user_id = current_admin.id
    else:
        feedback.resolved_at = None
        feedback.resolved_by_user_id = None

    await db.commit()
    result = await db.execute(
        select(Feedback)
        .options(joinedload(Feedback.user).load_only(User.id, User.first_name, User.last_name))
        .where(Feedback.id == feedback.id, Feedback.organization_id == org.id)
    )
    updated = result.scalar_one()
    count = await db.scalar(
        select(func.count(FeedbackAttachment.id)).where(
            FeedbackAttachment.feedback_id == updated.id,
            FeedbackAttachment.organization_id == org.id,
        )
    )
    return FeedbackAdminRead.model_validate(updated, from_attributes=True).model_copy(
        update={"attachment_count": count or 0}
    )
