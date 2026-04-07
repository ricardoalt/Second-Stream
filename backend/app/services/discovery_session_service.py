"""Discovery session orchestration service."""

from __future__ import annotations

import io
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid4

import structlog
from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.authz.authz import raise_org_access_denied, raise_resource_not_found
from app.core.config import settings
from app.models.bulk_import import ImportItem, ImportRun
from app.models.company import Company
from app.models.discovery_session import DiscoverySession, DiscoverySource
from app.models.user import User
from app.models.voice_interview import VoiceInterview
from app.schemas.discovery_session import (
    DiscoverySessionResponse,
    DiscoverySessionStatus,
    DiscoverySessionSummaryResponse,
    DiscoverySourceResponse,
    DiscoverySourceStatus,
    DiscoverySourceType,
)
from app.services.bulk_import_ai_extractor import bulk_import_ai_extractor
from app.services.bulk_import_service import (
    MAX_IMPORT_FILE_BYTES,
    MAX_IMPORT_ITEMS,
    MAX_PROCESSING_ATTEMPTS,
    BulkImportService,
    ParserLimitError,
    _dedupe_backoff_seconds,
)
from app.services.s3_service import upload_file_to_s3
from app.services.voice_constants import (
    ALLOWED_VOICE_EXTENSIONS,
    ALLOWED_VOICE_MIME_BY_EXTENSION,
    AUDIO_RETENTION_DAYS,
    MAX_UPLOAD_BYTES,
    TRANSCRIPT_RETENTION_DAYS,
)
from app.services.voice_status_sync import sync_import_run_status_for_voice

logger = structlog.get_logger(__name__)

MAX_DISCOVERY_FILES_PER_SESSION = 10
MAX_DISCOVERY_AUDIO_PER_SESSION = 3
MAX_DISCOVERY_TEXT_SOURCES_PER_SESSION = 5
MIN_DISCOVERY_TEXT_LENGTH = 20
MAX_DISCOVERY_TEXT_LENGTH = 8000
TEXT_PREVIEW_MAX_LENGTH = 180
PROCESSING_ERROR_MAX_LENGTH = 500
TEXT_SOURCE_LEASE_SECONDS = 300
TEXT_SOURCE_MAX_ATTEMPTS = MAX_PROCESSING_ATTEMPTS

ALLOWED_BULK_IMPORT_EXTENSIONS = {
    (ext if ext.startswith(".") else f".{ext}").casefold()
    for ext in settings.bulk_import_allowed_extensions_list
}


def _truncate_error(error_message: str) -> str:
    return error_message[:PROCESSING_ERROR_MAX_LENGTH]


def _sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", Path(filename).name).strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")
    if len(cleaned) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename too long")
    return cleaned


def _normalize_location_fingerprint_token(value: object) -> str:
    if not isinstance(value, str):
        return ""
    normalized = " ".join(value.strip().casefold().split())
    return normalized


def _map_run_status_to_source_status(run_status: str) -> str:
    if run_status in {"uploaded", "processing", "finalizing"}:
        return "processing"
    if run_status in {"review_ready", "completed", "no_data"}:
        return "review_ready"
    if run_status == "failed":
        return "failed"
    return "processing"


def _session_status_literal(status_value: str) -> DiscoverySessionStatus:
    valid_statuses: dict[str, DiscoverySessionStatus] = {
        "draft": "draft",
        "uploading": "uploading",
        "processing": "processing",
        "review_ready": "review_ready",
        "partial_failure": "partial_failure",
        "failed": "failed",
    }
    if status_value in valid_statuses:
        return valid_statuses[status_value]
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid discovery status")


def _source_status_literal(status_value: str) -> DiscoverySourceStatus:
    valid_statuses: dict[str, DiscoverySourceStatus] = {
        "uploaded": "uploaded",
        "processing": "processing",
        "review_ready": "review_ready",
        "failed": "failed",
    }
    if status_value in valid_statuses:
        return valid_statuses[status_value]
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail="Invalid discovery source status"
    )


class DiscoverySessionService:
    """Coordinates discovery wizard sessions and source fan-out."""

    def __init__(self) -> None:
        self._bulk_import_service = BulkImportService()

    async def create_session(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        company_id: UUID,
        user_id: UUID,
        assigned_owner_user_id: UUID | None,
    ) -> DiscoverySession:
        await self._load_company_in_scope(
            db, organization_id=organization_id, company_id=company_id
        )
        resolved_owner_id = await self._resolve_assigned_owner_user_id(
            db,
            organization_id=organization_id,
            requesting_user_id=user_id,
            assigned_owner_user_id=assigned_owner_user_id,
        )
        session = DiscoverySession(
            organization_id=organization_id,
            company_id=company_id,
            status="draft",
            created_by_user_id=user_id,
            assigned_owner_user_id=resolved_owner_id,
        )
        db.add(session)
        await db.flush()
        return session

    async def _resolve_assigned_owner_user_id(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        requesting_user_id: UUID,
        assigned_owner_user_id: UUID | None,
    ) -> UUID | None:
        requester = await db.get(User, requesting_user_id)
        if requester is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        if not requester.is_superuser and requester.organization_id != organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        requester_can_assign = bool(
            requester.is_superuser or requester.role == "org_admin"
        )
        if assigned_owner_user_id is None:
            return None

        if not requester_can_assign:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only org admins can assign owner",
            )

        owner = await db.get(User, assigned_owner_user_id)
        if owner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned owner not found",
            )
        if owner.organization_id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Assigned owner must belong to your organization",
            )
        if not owner.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Assigned owner must be active",
            )
        if owner.role not in {"org_admin", "field_agent"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Assigned owner role is not allowed",
            )
        return owner.id

    async def get_session(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        session_id: UUID,
        for_update: bool = False,
    ) -> DiscoverySession:
        query = (
            select(DiscoverySession)
            .options(selectinload(DiscoverySession.sources))
            .where(DiscoverySession.id == session_id)
        )
        if for_update:
            query = query.with_for_update()
        result = await db.execute(query)
        session = result.scalar_one_or_none()
        if session is None:
            raise_resource_not_found(
                "Discovery session not found",
                details={"session_id": str(session_id)},
            )
        assert session is not None
        if session.organization_id != organization_id:
            raise_org_access_denied(org_id=str(organization_id))
        return session

    async def add_file_source(
        self,
        db: AsyncSession,
        *,
        session: DiscoverySession,
        file_name: str,
        content_type: str | None,
        file_bytes: bytes,
    ) -> DiscoverySource:
        self._assert_session_mutable(session)
        self._assert_source_limit(session, source_type="file")

        sanitized_file_name = _sanitize_filename(file_name)
        extension = Path(sanitized_file_name).suffix.casefold()
        if extension == ".xls":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Legacy .xls is not supported. Use .xlsx instead.",
            )
        if extension not in ALLOWED_BULK_IMPORT_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {extension or 'unknown'}",
            )
        if len(file_bytes) > MAX_IMPORT_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Max size is 10MB.",
            )

        source_id = uuid4()
        storage_key = f"imports/discovery-sessions/{session.id}/files/{source_id}{extension}"
        await upload_file_to_s3(io.BytesIO(file_bytes), storage_key, content_type)

        source = DiscoverySource(
            id=source_id,
            organization_id=session.organization_id,
            session_id=session.id,
            source_type="file",
            status="uploaded",
            source_filename=sanitized_file_name,
            source_storage_key=storage_key,
            content_type=content_type,
            size_bytes=len(file_bytes),
        )
        source.session = session
        db.add(source)
        if session.status == "draft":
            session.status = "uploading"
        await db.flush()
        return source

    async def add_audio_source(
        self,
        db: AsyncSession,
        *,
        session: DiscoverySession,
        file_name: str,
        content_type: str | None,
        file_bytes: bytes,
    ) -> DiscoverySource:
        self._assert_session_mutable(session)
        self._assert_source_limit(session, source_type="audio")

        sanitized_file_name = _sanitize_filename(file_name)
        extension = Path(sanitized_file_name).suffix.casefold()
        normalized_content_type = (content_type or "").casefold()
        self._validate_audio_file(extension=extension, content_type=normalized_content_type)

        if len(file_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Max size is 25MB.",
            )

        source_id = uuid4()
        storage_key = (
            f"voice-interviews/discovery/{session.organization_id}/{source_id}/audio{extension}"
        )
        await upload_file_to_s3(io.BytesIO(file_bytes), storage_key, content_type)

        source = DiscoverySource(
            id=source_id,
            organization_id=session.organization_id,
            session_id=session.id,
            source_type="audio",
            status="uploaded",
            source_filename=sanitized_file_name,
            source_storage_key=storage_key,
            content_type=content_type,
            size_bytes=len(file_bytes),
        )
        source.session = session
        db.add(source)
        if session.status == "draft":
            session.status = "uploading"
        await db.flush()
        return source

    async def add_text_source(
        self,
        db: AsyncSession,
        *,
        session: DiscoverySession,
        text: str,
    ) -> DiscoverySource:
        self._assert_session_mutable(session)
        self._assert_source_limit(session, source_type="text")

        trimmed_text = text.strip()
        if len(trimmed_text) < MIN_DISCOVERY_TEXT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Text too short. Provide at least {MIN_DISCOVERY_TEXT_LENGTH} characters."
                ),
            )
        if len(trimmed_text) > MAX_DISCOVERY_TEXT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Text too long. Max length is {MAX_DISCOVERY_TEXT_LENGTH} characters.",
            )

        source = DiscoverySource(
            organization_id=session.organization_id,
            session_id=session.id,
            source_type="text",
            status="uploaded",
            text_content=trimmed_text,
            text_length=len(trimmed_text),
            text_preview=trimmed_text[:TEXT_PREVIEW_MAX_LENGTH],
        )
        source.session = session
        db.add(source)
        if session.status == "draft":
            session.status = "uploading"
        await db.flush()
        return source

    async def start_session(
        self,
        db: AsyncSession,
        *,
        session: DiscoverySession,
        current_user: User,
    ) -> DiscoverySession:
        if not session.sources:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot start session without at least one source",
            )

        if session.started_at is not None:
            await self.sync_session_status(db, session=session)
            await db.flush()
            return session

        started_at = datetime.now(UTC)
        session.started_at = started_at
        session.started_by_user_id = current_user.id
        session.status = "processing"
        session.processing_error = None
        run_owner_user_id = session.assigned_owner_user_id or current_user.id

        for source in session.sources:
            if source.import_run_id is not None:
                continue
            source.started_at = started_at
            if source.source_type == "file":
                try:
                    run = self._build_file_run(
                        session=session,
                        source=source,
                        user_id=run_owner_user_id,
                        started_at=started_at,
                    )
                except ValueError as exc:
                    source.status = "failed"
                    source.processing_error = _truncate_error(str(exc))
                    source.completed_at = started_at
                    continue
                db.add(run)
                source.import_run_id = run.id
                source.status = "processing"
                continue

            if source.source_type == "audio":
                try:
                    run, voice_interview = self._build_audio_run(
                        session=session,
                        source=source,
                        user_id=run_owner_user_id,
                        started_at=started_at,
                    )
                except ValueError as exc:
                    source.status = "failed"
                    source.processing_error = _truncate_error(str(exc))
                    source.completed_at = started_at
                    continue
                db.add(run)
                db.add(voice_interview)
                source.import_run_id = run.id
                source.voice_interview_id = voice_interview.id
                source.status = "processing"
                continue

            if source.source_type == "text":
                if not source.text_content:
                    source.status = "failed"
                    source.processing_error = "Text source is empty"
                    source.completed_at = started_at
                    continue
                storage_key = f"imports/discovery-sessions/{session.id}/texts/{source.id}.txt"

                run = ImportRun(
                    id=uuid4(),
                    organization_id=session.organization_id,
                    entrypoint_type="company",
                    entrypoint_id=session.company_id,
                    source_file_path=storage_key,
                    source_filename=f"discovery-session-{source.id}.txt",
                    source_type="bulk_import",
                    status="uploaded",
                    progress_step="discovery_text_pending",
                    processing_attempts=0,
                    processing_available_at=started_at,
                    created_by_user_id=run_owner_user_id,
                )
                db.add(run)
                source.import_run_id = run.id
                source.source_storage_key = storage_key
                source.status = "uploaded"

        await db.commit()
        logger.info(
            "discovery_session_started",
            session_id=str(session.id),
            file_sources=sum(1 for item in session.sources if item.source_type == "file"),
            audio_sources=sum(1 for item in session.sources if item.source_type == "audio"),
            text_sources=sum(1 for item in session.sources if item.source_type == "text"),
        )

        refreshed = await self.get_session(
            db,
            organization_id=session.organization_id,
            session_id=session.id,
            for_update=True,
        )
        await self.sync_session_status(db, session=refreshed)
        await db.commit()
        return refreshed

    async def sync_session_status(self, db: AsyncSession, *, session: DiscoverySession) -> None:
        run_ids = [
            source.import_run_id for source in session.sources if source.import_run_id is not None
        ]
        runs_by_id: dict[UUID, ImportRun] = {}
        if run_ids:
            result = await db.execute(select(ImportRun).where(ImportRun.id.in_(run_ids)))
            runs = result.scalars().all()
            runs_by_id = {run.id: run for run in runs}

        now = datetime.now(UTC)
        for source in session.sources:
            if source.import_run_id is None:
                continue
            run = runs_by_id.get(source.import_run_id)
            if run is None:
                continue

            if source.source_type == "text":
                if run.status == "failed":
                    source.status = "failed"
                    source.processing_error = _truncate_error(
                        run.processing_error or "Source processing failed"
                    )
                    source.completed_at = source.completed_at or now
                    continue
                if run.status in {"review_ready", "completed", "no_data"}:
                    source.status = "review_ready"
                    source.processing_error = None
                    source.completed_at = source.completed_at or now
                continue

            mapped_status = _map_run_status_to_source_status(run.status)
            source.status = mapped_status
            if mapped_status == "failed":
                source.processing_error = _truncate_error(
                    run.processing_error or "Source processing failed"
                )
                source.completed_at = source.completed_at or now
                continue
            if mapped_status == "review_ready":
                source.processing_error = None
                source.completed_at = source.completed_at or now

        session.status = self._derive_session_status(session)
        if session.status in {"review_ready", "partial_failure", "failed"}:
            session.completed_at = session.completed_at or now
        else:
            session.completed_at = None

        failed_errors = [
            source.processing_error for source in session.sources if source.status == "failed"
        ]
        if session.status in {"partial_failure", "failed"} and failed_errors:
            first_error = failed_errors[0]
            if first_error is not None:
                session.processing_error = first_error
        elif session.status in {"review_ready", "draft", "uploading", "processing"}:
            session.processing_error = None

        summary = await self._build_summary(db, session=session)
        session.summary_data = summary.model_dump(mode="json")

    async def sync_session_for_source(
        self,
        db: AsyncSession,
        *,
        source: DiscoverySource,
    ) -> DiscoverySession | None:
        result = await db.execute(
            select(DiscoverySession)
            .options(selectinload(DiscoverySession.sources))
            .where(DiscoverySession.id == source.session_id)
            .with_for_update()
        )
        session = result.scalar_one_or_none()
        if session is None:
            return None
        await self.sync_session_status(db, session=session)
        await db.flush()
        return session

    async def sync_session_for_import_run(
        self,
        db: AsyncSession,
        *,
        import_run_id: UUID,
    ) -> DiscoverySession | None:
        result = await db.execute(
            select(DiscoverySource).where(DiscoverySource.import_run_id == import_run_id).limit(1)
        )
        source = result.scalar_one_or_none()
        if source is None:
            return None
        return await self.sync_session_for_source(db, source=source)

    async def build_response(
        self,
        db: AsyncSession,
        *,
        session: DiscoverySession,
    ) -> DiscoverySessionResponse:
        await self.sync_session_status(db, session=session)
        summary = await self._build_summary(db, session=session)
        ordered_sources = sorted(session.sources, key=lambda source: source.created_at)
        response_sources = [
            DiscoverySourceResponse(
                id=source.id,
                source_type=source.source_type,
                status=_source_status_literal(source.status),
                source_filename=source.source_filename,
                content_type=source.content_type,
                size_bytes=source.size_bytes,
                text_length=source.text_length,
                text_preview=source.text_preview,
                import_run_id=source.import_run_id,
                voice_interview_id=source.voice_interview_id,
                processing_error=source.processing_error,
                created_at=source.created_at,
                updated_at=source.updated_at,
            )
            for source in ordered_sources
        ]
        return DiscoverySessionResponse(
            id=session.id,
            company_id=session.company_id,
            assigned_owner_user_id=session.assigned_owner_user_id,
            status=_session_status_literal(session.status),
            started_at=session.started_at,
            completed_at=session.completed_at,
            processing_error=session.processing_error,
            sources=response_sources,
            summary=summary,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    async def claim_next_text_source(self, db: AsyncSession) -> DiscoverySource | None:
        result = await db.execute(
            select(DiscoverySource)
            .join(ImportRun, ImportRun.id == DiscoverySource.import_run_id)
            .where(DiscoverySource.source_type == "text")
            .where(DiscoverySource.status == "uploaded")
            .where(DiscoverySource.import_run_id.is_not(None))
            .where(ImportRun.status == "uploaded")
            .where(ImportRun.progress_step == "discovery_text_pending")
            .where(
                (ImportRun.processing_available_at.is_(None))
                | (ImportRun.processing_available_at <= func.now())
            )
            .order_by(DiscoverySource.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        source = result.scalar_one_or_none()
        if source is None:
            return None

        now = datetime.now(UTC)
        if source.import_run_id is None:
            source.status = "failed"
            source.processing_error = "Text source missing import run"
            source.completed_at = now
            return None

        run_result = await db.execute(
            select(ImportRun).where(ImportRun.id == source.import_run_id).with_for_update()
        )
        run = run_result.scalar_one_or_none()
        if run is None:
            source.status = "failed"
            source.processing_error = "Import run missing for text source"
            source.completed_at = now
            return None

        if run.processing_attempts >= TEXT_SOURCE_MAX_ATTEMPTS:
            source.status = "failed"
            source.processing_error = "max_attempts_reached"
            source.completed_at = now
            run.status = "failed"
            run.progress_step = None
            run.processing_error = "max_attempts_reached"
            run.processing_available_at = None
            return None

        source.status = "processing"
        source.processing_error = None
        source.started_at = now
        run.processing_attempts += 1
        run.status = "processing"
        run.progress_step = "discovery_text_extracting"
        run.processing_started_at = now
        run.processing_available_at = now + timedelta(seconds=TEXT_SOURCE_LEASE_SECONDS)
        run.processing_error = None
        return source

    async def requeue_stale_text_sources(self, db: AsyncSession, limit: int = 100) -> int:
        cutoff = datetime.now(UTC) - timedelta(seconds=TEXT_SOURCE_LEASE_SECONDS)
        result = await db.execute(
            select(DiscoverySource)
            .where(DiscoverySource.source_type == "text")
            .where(DiscoverySource.status == "processing")
            .where(DiscoverySource.updated_at < cutoff)
            .order_by(DiscoverySource.updated_at)
            .with_for_update(skip_locked=True)
            .limit(limit)
        )
        sources = list(result.scalars().all())
        if not sources:
            return 0

        now = datetime.now(UTC)
        for source in sources:
            if source.import_run_id is not None:
                run_result = await db.execute(
                    select(ImportRun).where(ImportRun.id == source.import_run_id).with_for_update()
                )
                run = run_result.scalar_one_or_none()
                if run is not None:
                    if run.processing_attempts >= TEXT_SOURCE_MAX_ATTEMPTS:
                        source.status = "failed"
                        source.processing_error = "max_attempts_reached"
                        source.completed_at = now
                        run.status = "failed"
                        run.progress_step = None
                        run.processing_started_at = None
                        run.processing_available_at = None
                        run.processing_error = "max_attempts_reached"
                        await self.sync_session_for_source(db, source=source)
                        continue

                    run.status = "uploaded"
                    run.progress_step = "discovery_text_pending"
                    run.processing_started_at = None
                    run.processing_available_at = now
                    run.processing_error = "lease_expired_requeued"

            source.status = "uploaded"
            source.processing_error = "lease_expired_requeued"
            source.completed_at = None

        return len(sources)

    async def process_text_source(self, db: AsyncSession, *, source_id: UUID) -> None:
        try:
            source_result = await db.execute(
                select(DiscoverySource).where(DiscoverySource.id == source_id).with_for_update()
            )
            source = source_result.scalar_one_or_none()
            if source is None or source.import_run_id is None:
                return
            if source.status != "processing":
                return

            run_result = await db.execute(
                select(ImportRun).where(ImportRun.id == source.import_run_id).with_for_update()
            )
            run = run_result.scalar_one_or_none()
            if run is None:
                source.status = "failed"
                source.processing_error = "Import run missing for text source"
                source.completed_at = datetime.now(UTC)
                await db.commit()
                return

            extracted_text = (source.text_content or "").strip()
            if len(extracted_text) < MIN_DISCOVERY_TEXT_LENGTH:
                raise ValueError("Text too short to process")

            extraction = await bulk_import_ai_extractor.extract_parsed_rows_from_text(
                extracted_text=extracted_text,
                filename=run.source_filename,
                source_type="bulk_import",
            )
            await db.execute(delete(ImportItem).where(ImportItem.run_id == run.id))
            staged_items = await self._bulk_import_service.build_items_for_parsed_rows(
                db,
                run=run,
                parsed_rows=extraction.rows,
            )

            if len(staged_items) > MAX_IMPORT_ITEMS:
                raise ParserLimitError("max_items_exceeded")

            if staged_items:
                db.add_all(staged_items)
                await db.flush()
                await self._bulk_import_service.refresh_run_counters(db, run)
                run.status = "review_ready"
            else:
                run.status = "no_data"
                run.total_items = 0
                run.accepted_count = 0
                run.rejected_count = 0
                run.amended_count = 0
                run.invalid_count = 0
                run.duplicate_count = 0

            run.progress_step = None
            run.processing_error = None
            source.status = "review_ready"
            source.processing_error = None
            source.completed_at = datetime.now(UTC)
            await self.sync_session_for_source(db, source=source)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            await self._handle_text_processing_failure(db, source_id=source_id, exc=exc)

    async def _handle_text_processing_failure(
        self,
        db: AsyncSession,
        *,
        source_id: UUID,
        exc: Exception,
    ) -> None:
        retryable = not isinstance(exc, (ParserLimitError, ValueError))
        reason = _truncate_error(str(exc) or "processing_failed")

        result = await db.execute(
            select(DiscoverySource).where(DiscoverySource.id == source_id).with_for_update()
        )
        source = result.scalar_one_or_none()
        if source is None:
            return

        run: ImportRun | None = None
        if source.import_run_id is not None:
            run_result = await db.execute(
                select(ImportRun).where(ImportRun.id == source.import_run_id).with_for_update()
            )
            run = run_result.scalar_one_or_none()

        now = datetime.now(UTC)
        if retryable and run is not None and run.processing_attempts < TEXT_SOURCE_MAX_ATTEMPTS:
            source.status = "uploaded"
            source.processing_error = reason
            source.completed_at = None

            run.status = "uploaded"
            run.progress_step = "discovery_text_pending"
            run.processing_error = reason
            run.processing_started_at = None
            run.processing_available_at = now + timedelta(
                seconds=_dedupe_backoff_seconds(run.id, run.processing_attempts)
            )
            await self.sync_session_for_source(db, source=source)
            await db.commit()
            logger.warning(
                "discovery_source_requeued",
                source_id=str(source_id),
                run_id=str(run.id),
                attempt=run.processing_attempts,
                error=reason,
            )
            return

        source.status = "failed"
        source.processing_error = reason
        source.completed_at = now
        if run is not None:
            run.status = "failed"
            run.progress_step = None
            run.processing_error = reason
            run.processing_started_at = None
            run.processing_available_at = None
        await self.sync_session_for_source(db, source=source)
        await db.commit()
        logger.warning("discovery_source_failed", source_id=str(source_id), error=reason)

    async def _build_summary(
        self,
        db: AsyncSession,
        *,
        session: DiscoverySession,
    ) -> DiscoverySessionSummaryResponse:
        run_ids = [
            source.import_run_id for source in session.sources if source.import_run_id is not None
        ]
        locations_found = 0
        waste_streams_found = 0
        drafts_needing_confirmation = 0
        if run_ids:
            project_draft_result = await db.execute(
                select(ImportItem.id, ImportItem.parent_item_id)
                .where(ImportItem.run_id.in_(run_ids))
                .where(ImportItem.item_type == "project")
                .where(ImportItem.created_project_id.is_(None))
                .where(ImportItem.status.in_(("pending_review", "accepted", "amended")))
            )
            project_draft_rows = project_draft_result.all()
            project_parent_item_ids: list[UUID] = []
            for _, parent_item_id in project_draft_rows:
                if isinstance(parent_item_id, UUID):
                    project_parent_item_ids.append(parent_item_id)

            waste_streams_found = len(project_draft_rows)
            drafts_needing_confirmation = waste_streams_found

            unique_parent_item_ids = list(dict.fromkeys(project_parent_item_ids))
            if unique_parent_item_ids:
                location_rows_result = await db.execute(
                    select(ImportItem.normalized_data)
                    .where(ImportItem.id.in_(unique_parent_item_ids))
                    .where(ImportItem.item_type == "location")
                )
                location_fingerprints: set[str] = set()
                for normalized_data in location_rows_result.scalars().all():
                    if not isinstance(normalized_data, dict):
                        continue
                    name_token = _normalize_location_fingerprint_token(normalized_data.get("name"))
                    city_token = _normalize_location_fingerprint_token(normalized_data.get("city"))
                    state_token = _normalize_location_fingerprint_token(
                        normalized_data.get("state")
                    )
                    if not (name_token or city_token or state_token):
                        continue
                    location_fingerprints.add(f"{name_token}|{city_token}|{state_token}")

                locations_found = len(location_fingerprints)

        return DiscoverySessionSummaryResponse(
            total_sources=len(session.sources),
            file_sources=sum(1 for source in session.sources if source.source_type == "file"),
            audio_sources=sum(1 for source in session.sources if source.source_type == "audio"),
            text_sources=sum(1 for source in session.sources if source.source_type == "text"),
            locations_found=locations_found,
            waste_streams_found=waste_streams_found,
            drafts_needing_confirmation=drafts_needing_confirmation,
            failed_sources=sum(1 for source in session.sources if source.status == "failed"),
        )

    def _derive_session_status(self, session: DiscoverySession) -> str:
        if session.started_at is None:
            if not session.sources:
                return "draft"
            return "uploading"

        source_statuses = [source.status for source in session.sources]
        if any(item in {"uploaded", "processing"} for item in source_statuses):
            return "processing"

        failed_sources = sum(1 for item in source_statuses if item == "failed")
        ready_sources = sum(1 for item in source_statuses if item == "review_ready")

        if ready_sources > 0 and failed_sources > 0:
            return "partial_failure"
        if ready_sources > 0:
            return "review_ready"
        if failed_sources > 0:
            return "failed"
        return "processing"

    def _assert_session_mutable(self, session: DiscoverySession) -> None:
        if session.started_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Session already started. Sources are immutable now.",
            )

    def _assert_source_limit(
        self, session: DiscoverySession, *, source_type: DiscoverySourceType
    ) -> None:
        source_count = sum(1 for source in session.sources if source.source_type == source_type)
        if source_type == "file" and source_count >= MAX_DISCOVERY_FILES_PER_SESSION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Too many files. Max is {MAX_DISCOVERY_FILES_PER_SESSION}.",
            )
        if source_type == "audio" and source_count >= MAX_DISCOVERY_AUDIO_PER_SESSION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Too many audio files. Max is {MAX_DISCOVERY_AUDIO_PER_SESSION}.",
            )
        if source_type == "text" and source_count >= MAX_DISCOVERY_TEXT_SOURCES_PER_SESSION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Too many text entries. Max is {MAX_DISCOVERY_TEXT_SOURCES_PER_SESSION}.",
            )

    def _validate_audio_file(self, *, extension: str, content_type: str) -> None:
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

    async def _load_company_in_scope(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        company_id: UUID,
    ) -> Company:
        company = await db.get(Company, company_id)
        if company is None:
            raise_resource_not_found(
                "Company not found",
                details={"company_id": str(company_id)},
            )
        assert company is not None
        if company.organization_id != organization_id:
            raise_org_access_denied(org_id=str(organization_id))
        if company.archived_at is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company is archived")
        return company

    def _build_file_run(
        self,
        *,
        session: DiscoverySession,
        source: DiscoverySource,
        user_id: UUID,
        started_at: datetime,
    ) -> ImportRun:
        if source.source_storage_key is None or source.source_filename is None:
            raise ValueError("file_source_missing_storage")
        return ImportRun(
            id=uuid4(),
            organization_id=session.organization_id,
            entrypoint_type="company",
            entrypoint_id=session.company_id,
            source_file_path=source.source_storage_key,
            source_filename=source.source_filename,
            source_type="bulk_import",
            status="uploaded",
            processing_attempts=0,
            processing_available_at=started_at,
            created_by_user_id=user_id,
        )

    def _build_audio_run(
        self,
        *,
        session: DiscoverySession,
        source: DiscoverySource,
        user_id: UUID,
        started_at: datetime,
    ) -> tuple[ImportRun, VoiceInterview]:
        if source.source_storage_key is None or source.source_filename is None:
            raise ValueError("audio_source_missing_storage")

        run = ImportRun(
            id=uuid4(),
            organization_id=session.organization_id,
            entrypoint_type="company",
            entrypoint_id=session.company_id,
            source_file_path=source.source_storage_key,
            source_filename=source.source_filename,
            source_type="voice_interview",
            status="uploaded",
            processing_attempts=0,
            processing_available_at=started_at,
            created_by_user_id=user_id,
        )
        voice_interview = VoiceInterview(
            id=uuid4(),
            organization_id=session.organization_id,
            company_id=session.company_id,
            location_id=None,
            bulk_import_run_id=run.id,
            audio_object_key=source.source_storage_key,
            status="queued",
            processing_attempts=0,
            consent_at=started_at,
            consent_by_user_id=user_id,
            consent_copy_version="discovery-wizard-consent-v1",
            audio_retention_expires_at=started_at + timedelta(days=AUDIO_RETENTION_DAYS),
            transcript_retention_expires_at=started_at + timedelta(days=TRANSCRIPT_RETENTION_DAYS),
            created_by_user_id=user_id,
        )
        sync_import_run_status_for_voice(run=run, voice_status=voice_interview.status)
        return run, voice_interview
