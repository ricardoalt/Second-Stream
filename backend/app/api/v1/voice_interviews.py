"""Voice interview endpoints."""

from __future__ import annotations

import io
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated, Literal, cast
from uuid import UUID

import structlog
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import AsyncDB, CurrentBulkImportUser, CurrentUser, OrganizationContext
from app.authz import permissions
from app.authz.authz import raise_org_access_denied, raise_resource_not_found, require_permission
from app.models.bulk_import import ImportRun
from app.models.company import Company
from app.models.location import Location
from app.models.voice_interview import ImportRunIdempotencyKey, VoiceInterview
from app.schemas.voice_interview import (
    VoiceInterviewAudioUrlResponse,
    VoiceInterviewCreateResponse,
    VoiceInterviewRetryResponse,
    VoiceInterviewStatusResponse,
    VoiceInterviewTranscriptResponse,
)
from app.services.idempotency import canonical_sha256
from app.services.s3_service import download_file_content, get_presigned_url, upload_file_to_s3
from app.services.storage_delete_service import delete_storage_keys
from app.services.voice_constants import (
    ALLOWED_VOICE_EXTENSIONS,
    ALLOWED_VOICE_MIME_BY_EXTENSION,
    AUDIO_RETENTION_DAYS,
    MAX_PROCESSING_ATTEMPTS,
    MAX_UPLOAD_BYTES,
    TRANSCRIPT_RETENTION_DAYS,
)
from app.services.voice_retention_service import AUDIO_PURGED_KEY
from app.services.voice_status_sync import sync_import_run_status_for_voice

router = APIRouter()
logger = structlog.get_logger(__name__)

VoiceStatusLiteral = Literal[
    "uploaded",
    "queued",
    "transcribing",
    "extracting",
    "review_ready",
    "partial_finalized",
    "finalized",
    "failed",
]


@router.post("", response_model=VoiceInterviewCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_voice_interview(
    audio_file: Annotated[UploadFile, File()],
    company_id: Annotated[UUID, Form()],
    consent_given: Annotated[bool, Form()],
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    location_id: Annotated[UUID | None, Form()] = None,
) -> VoiceInterviewCreateResponse:
    require_permission(current_user, permissions.VOICE_INTERVIEW_MANAGE)
    if not consent_given:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Consent is required")

    company = await db.get(Company, company_id)
    if company is None:
        raise_resource_not_found("Company not found", details={"company_id": str(company_id)})
    assert company is not None
    if company.organization_id != org.id:
        raise_org_access_denied(org_id=str(org.id))

    if location_id is not None:
        location = await db.get(Location, location_id)
        if location is None:
            raise_resource_not_found(
                "Location not found", details={"location_id": str(location_id)}
            )
        assert location is not None
        if location.organization_id != org.id:
            raise_org_access_denied(org_id=str(org.id))
        if location.company_id != company.id:
            raise_resource_not_found(
                "Location not found", details={"location_id": str(location_id)}
            )

    filename = _sanitize_filename(audio_file.filename or "")
    extension = Path(filename).suffix.casefold()
    content_type = (audio_file.content_type or "").casefold()
    _validate_audio_file(extension=extension, content_type=content_type)

    audio_bytes = await audio_file.read(MAX_UPLOAD_BYTES + 1)
    if len(audio_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Max size is 25MB.",
        )

    run_id = uuid.uuid4()
    interview_id = uuid.uuid4()
    audio_key = f"voice-interviews/{org.id}/{interview_id}/audio{extension}"

    try:
        await upload_file_to_s3(io.BytesIO(audio_bytes), audio_key, content_type or None)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store audio",
        ) from exc

    now = datetime.now(UTC)
    run = ImportRun(
        id=run_id,
        organization_id=org.id,
        entrypoint_type="location" if location_id else "company",
        entrypoint_id=location_id or company_id,
        source_file_path=audio_key,
        source_filename=filename,
        source_type="voice_interview",
        status="uploaded",
        processing_attempts=0,
        processing_available_at=now,
        created_by_user_id=current_user.id,
    )
    interview = VoiceInterview(
        id=interview_id,
        organization_id=org.id,
        company_id=company_id,
        location_id=location_id,
        bulk_import_run_id=run_id,
        audio_object_key=audio_key,
        status="uploaded",
        consent_at=now,
        consent_by_user_id=current_user.id,
        consent_copy_version="voice-interview-consent-v1",
        audio_retention_expires_at=now + timedelta(days=AUDIO_RETENTION_DAYS),
        transcript_retention_expires_at=now + timedelta(days=TRANSCRIPT_RETENTION_DAYS),
        created_by_user_id=current_user.id,
        processing_attempts=0,
    )
    db.add(run)
    db.add(interview)

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        try:
            await delete_storage_keys([audio_key])
        except Exception:
            logger.warning(
                "voice_upload_cleanup_failed",
                storage_key=audio_key,
                voice_interview_id=str(interview_id),
                exc_info=True,
            )
        raise

    interview.status = "queued"
    sync_import_run_status_for_voice(run=run, voice_status=interview.status)
    await db.commit()

    return VoiceInterviewCreateResponse(
        voice_interview_id=interview_id,
        bulk_import_run_id=run_id,
        status="uploaded",
    )


@router.get("/{voice_interview_id}", response_model=VoiceInterviewStatusResponse)
async def get_voice_interview(
    voice_interview_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> VoiceInterviewStatusResponse:
    interview = await _load_voice_interview(
        db=db, org_id=org.id, voice_interview_id=voice_interview_id
    )
    return VoiceInterviewStatusResponse(
        id=interview.id,
        bulk_import_run_id=interview.bulk_import_run_id,
        status=_voice_status_literal(interview.status),
        error_code=interview.error_code,
        failed_stage=_failed_stage_literal(interview.failed_stage),
        processing_attempts=interview.processing_attempts,
        audio_retention_expires_at=interview.audio_retention_expires_at,
        transcript_retention_expires_at=interview.transcript_retention_expires_at,
    )


@router.post("/{voice_interview_id}/retry", response_model=VoiceInterviewRetryResponse)
async def retry_voice_interview(
    voice_interview_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> VoiceInterviewRetryResponse:
    require_permission(current_user, permissions.VOICE_INTERVIEW_MANAGE)
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key header is required",
        )

    interview_probe = await db.get(VoiceInterview, voice_interview_id)
    if interview_probe is None:
        raise_resource_not_found(
            "Voice interview not found",
            details={"voice_interview_id": str(voice_interview_id)},
        )
    assert interview_probe is not None
    if interview_probe.organization_id != org.id:
        raise_org_access_denied(org_id=str(org.id))
    run_id = interview_probe.bulk_import_run_id

    run_result = await db.execute(select(ImportRun).where(ImportRun.id == run_id).with_for_update())
    run = run_result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    interview_result = await db.execute(
        select(VoiceInterview)
        .where(
            VoiceInterview.id == voice_interview_id,
            VoiceInterview.organization_id == org.id,
            VoiceInterview.bulk_import_run_id == run.id,
        )
        .with_for_update()
    )
    interview = interview_result.scalar_one_or_none()
    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice interview not found",
        )

    request_hash = canonical_sha256(
        {
            "voice_interview_id": str(interview.id),
            "failed_stage": interview.failed_stage,
        }
    )

    existing_result = await db.execute(
        select(ImportRunIdempotencyKey)
        .where(
            ImportRunIdempotencyKey.operation_type == "retry",
            ImportRunIdempotencyKey.run_id == run.id,
            ImportRunIdempotencyKey.idempotency_key == idempotency_key,
        )
        .with_for_update()
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        if existing.request_hash != request_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Idempotency key payload mismatch",
                    "code": "RETRY_IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
                },
            )
        replay = VoiceInterviewRetryResponse.model_validate(existing.response_json)
        return replay

    if interview.status != "failed" or interview.failed_stage not in {"transcribing", "extracting"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Interview is not retryable"
        )
    if interview.processing_attempts >= MAX_PROCESSING_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "Max attempts reached", "code": "VOICE_MAX_ATTEMPTS_REACHED"},
        )

    interview.processing_attempts += 1
    interview.status = "queued"
    interview.error_code = None
    run.processing_available_at = datetime.now(UTC)
    run.processing_error = None
    sync_import_run_status_for_voice(run=run, voice_status=interview.status)

    response = VoiceInterviewRetryResponse(
        id=interview.id,
        status=_voice_status_literal(interview.status),
        processing_attempts=interview.processing_attempts,
        failed_stage=_failed_stage_literal(interview.failed_stage),
    )

    db.add(
        ImportRunIdempotencyKey(
            operation_type="retry",
            run_id=run.id,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            response_json=response.model_dump(mode="json"),
            response_status_code=200,
        )
    )
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        replay_result = await db.execute(
            select(ImportRunIdempotencyKey).where(
                ImportRunIdempotencyKey.operation_type == "retry",
                ImportRunIdempotencyKey.run_id == run.id,
                ImportRunIdempotencyKey.idempotency_key == idempotency_key,
            )
        )
        replay_row = replay_result.scalar_one_or_none()
        if replay_row is None:
            raise
        if replay_row.request_hash != request_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Idempotency key payload mismatch",
                    "code": "RETRY_IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
                },
            ) from None
        return VoiceInterviewRetryResponse.model_validate(replay_row.response_json)
    return response


@router.get("/{voice_interview_id}/audio-url", response_model=VoiceInterviewAudioUrlResponse)
async def get_voice_audio_url(
    voice_interview_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> VoiceInterviewAudioUrlResponse:
    interview = await _load_voice_interview(
        db=db, org_id=org.id, voice_interview_id=voice_interview_id
    )
    if interview.audio_object_key == AUDIO_PURGED_KEY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not available")
    audio_url = await get_presigned_url(interview.audio_object_key, expires=600)
    return VoiceInterviewAudioUrlResponse(audio_url=audio_url, expires_in_seconds=600)


@router.get("/{voice_interview_id}/transcript", response_model=VoiceInterviewTranscriptResponse)
async def get_voice_transcript(
    voice_interview_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> VoiceInterviewTranscriptResponse:
    interview = await _load_voice_interview(
        db=db, org_id=org.id, voice_interview_id=voice_interview_id
    )
    if not interview.transcript_object_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not available"
        )

    try:
        transcript_bytes = await download_file_content(interview.transcript_object_key)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transcript temporarily unavailable",
        ) from exc
    if transcript_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not available",
        )
    transcript_text = transcript_bytes.decode("utf-8", errors="replace")
    return VoiceInterviewTranscriptResponse(transcript_text=transcript_text, segments=[])


async def _load_voice_interview(
    *, db: AsyncDB, org_id: UUID, voice_interview_id: UUID
) -> VoiceInterview:
    result = await db.execute(
        select(VoiceInterview).where(
            VoiceInterview.id == voice_interview_id,
            VoiceInterview.organization_id == org_id,
        )
    )
    interview = result.scalar_one_or_none()
    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Voice interview not found"
        )
    return interview


def _sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", Path(filename).name).strip()
    if len(cleaned) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename too long")
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")
    return cleaned


def _validate_audio_file(*, extension: str, content_type: str) -> None:
    if extension not in ALLOWED_VOICE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Use mp3, wav, or m4a.",
        )

    allowed_mimes = ALLOWED_VOICE_MIME_BY_EXTENSION[extension]
    if content_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File extension and MIME type do not match supported audio formats.",
        )


def _voice_status_literal(status_value: str) -> VoiceStatusLiteral:
    if status_value not in {
        "uploaded",
        "queued",
        "transcribing",
        "extracting",
        "review_ready",
        "partial_finalized",
        "finalized",
        "failed",
    }:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid voice status")
    return cast(VoiceStatusLiteral, status_value)


def _failed_stage_literal(stage: str | None) -> Literal["transcribing", "extracting"] | None:
    if stage is None:
        return None
    if stage not in {"transcribing", "extracting"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid failed stage")
    return cast(Literal["transcribing", "extracting"], stage)
