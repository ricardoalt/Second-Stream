"""Intake ingestion service for AI extraction and persistence."""

from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import structlog
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.document_analysis_agent import DocumentAnalysisError
from app.agents.image_analysis_agent import ImageAnalysisError, analyze_image
from app.agents.notes_analysis_agent import analyze_notes
from app.models.document_analysis_output import (
    DocumentAnalysisOutput,
    DocumentBaseProposal,
    DocumentCustomProposal,
)
from app.models.file import ProjectFile
from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.intake_unmapped_note import IntakeUnmappedNote
from app.models.notes_analysis_output import NotesAnalysisOutput
from app.models.project import Project
from app.services.intake_document_pipeline import analyze_project_file_document
from app.services.intake_field_catalog import (
    FieldRegistryItem,
    build_questionnaire_registry,
    format_catalog_for_prompt,
    normalize_field_id,
)
from app.services.s3_service import StorageError, download_file_content

logger = structlog.get_logger(__name__)

DocType = Literal["sds", "lab", "general"]
MAX_PROCESSING_ATTEMPTS = 3
LEASE_SECONDS = 300
RETRY_BASE_SECONDS = 30
RETRY_MAX_SECONDS = 600
RETRY_JITTER_PCT = 0.2
PROCESSING_ERROR_MAX_LENGTH = 500
DOCUMENT_FILE_TYPES = {"pdf", "docx", "xlsx", "csv", "txt"}
MAX_AI_ANALYSIS_PROPOSALS = 25
MAX_AI_ANALYSIS_TEXT_LENGTH = 300


def determine_doc_type(category: str | None) -> DocType:
    if category == "analysis":
        return "lab"
    if category == "regulatory":
        return "sds"
    if category in {"technical", "general"}:
        return "general"
    return "general"


def determine_image_route(category: str | None) -> Literal["image", "document"]:
    if category == "photos":
        return "image"
    if category in {"analysis", "regulatory", "technical", "general"}:
        return "document"
    return "image"


class IntakeIngestionService:
    """Ingestion service for intake panel."""

    def __init__(self, registry: dict[str, FieldRegistryItem] | None = None) -> None:
        self.registry = registry or build_questionnaire_registry()

    async def enqueue_ingestion(self, db: AsyncSession, file: ProjectFile) -> None:
        if file.processing_status == "completed" and file.file_hash:
            return
        if file.processing_status in {"queued", "processing"}:
            return
        file.processing_status = "queued"
        file.processing_available_at = datetime.now(UTC)
        file.processing_started_at = None
        file.processing_error = None
        await db.flush()

    async def claim_next_file(self, db: AsyncSession) -> ProjectFile | None:
        candidate = (
            select(ProjectFile.id)
            .where(ProjectFile.processing_status == "queued")
            .where(ProjectFile.processing_attempts < MAX_PROCESSING_ATTEMPTS)
            .where(
                (ProjectFile.processing_available_at.is_(None))
                | (ProjectFile.processing_available_at <= func.now())
            )
            .order_by(ProjectFile.processing_available_at.nullsfirst(), ProjectFile.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
            .cte("candidate")
        )
        stmt = (
            update(ProjectFile)
            .where(ProjectFile.id.in_(select(candidate.c.id)))
            .where(ProjectFile.processing_status == "queued")
            .values(
                processing_status="processing",
                processing_attempts=ProjectFile.processing_attempts + 1,
                processing_started_at=func.now(),
                processing_available_at=func.now() + text(f"INTERVAL '{LEASE_SECONDS} seconds'"),
                processing_error=None,
            )
            .returning(ProjectFile)
        )
        result = await db.execute(stmt)
        file = result.scalar_one_or_none()
        if not file:
            return None
        logger.info(
            "intake_ingestion_started",
            file_id=str(file.id),
            project_id=str(file.project_id),
            attempt=file.processing_attempts,
        )
        return file

    async def fail_exhausted_files(self, db: AsyncSession) -> int:
        result = await db.execute(
            select(ProjectFile)
            .where(ProjectFile.processing_status == "queued")
            .where(ProjectFile.processing_attempts >= MAX_PROCESSING_ATTEMPTS)
            .with_for_update(skip_locked=True)
        )
        files = result.scalars().all()
        if not files:
            return 0
        for file in files:
            await self._mark_failed(db, file, "max_attempts_reached")
            logger.warning("max_attempts_reached", file_id=str(file.id))
        return len(files)

    async def process_file(self, db: AsyncSession, file: ProjectFile) -> None:
        if self._has_processing_results(file):
            await self._mark_completed(db, file)
            return

        if file.file_hash:
            existing_stmt = (
                select(ProjectFile)
                .where(ProjectFile.file_hash == file.file_hash)
                .where(ProjectFile.organization_id == file.organization_id)
                .where(ProjectFile.project_id == file.project_id)
                .where(ProjectFile.processing_status == "completed")
                .where(ProjectFile.id != file.id)
                .order_by(ProjectFile.processed_at.desc().nullslast())
                .limit(1)
            )
            existing = await db.execute(existing_stmt)
            cached = existing.scalar_one_or_none()
            if cached and self._has_cached_results_for_reuse(cached):
                file.ai_analysis = cached.ai_analysis
                file.processed_text = cached.processed_text
                await self._clone_cached_outputs(db, file, cached)
                await self._mark_completed(db, file)
                return

        try:
            file_bytes = await download_file_content(file.file_path)
            if not file_bytes:
                raise ValueError("empty_file_bytes")
            file_type = (file.file_type or "").lower()

            if file_type in {"jpg", "jpeg", "png"}:
                await self._process_image_or_document(db, file, file_bytes)
            elif file_type in DOCUMENT_FILE_TYPES:
                await self._process_document(db, file, file_bytes)
            else:
                raise ValueError("unsupported_file_type")
        except Exception as exc:
            await self._handle_ingestion_failure(db, file, exc)

    async def analyze_notes_text(
        self,
        db: AsyncSession,
        project: Project,
        notes_updated_at: datetime,
    ) -> tuple[int, int, bool]:
        current_note = await self._get_intake_note(db, project)
        if not current_note or not current_note.text.strip():
            raise ValueError("intake_notes_missing")
        if len(current_note.text.strip()) < 20:
            raise ValueError("intake_notes_too_short")
        if current_note and not _timestamps_equal(current_note.updated_at, notes_updated_at):
            logger.info("notes_analysis_precheck_stale", project_id=str(project.id))
            return 0, 0, True

        truncated = (
            current_note.text[-8000:] if len(current_note.text) > 8000 else current_note.text
        )

        # Build field catalog for AI prompt
        field_catalog = format_catalog_for_prompt(self.registry)
        analysis = await analyze_notes(truncated, field_catalog)

        current_note = await self._get_intake_note(db, project)
        if not current_note or not _timestamps_equal(current_note.updated_at, notes_updated_at):
            logger.info("notes_analysis_postcheck_stale", project_id=str(project.id))
            return 0, 0, True

        async with db.begin_nested():
            await db.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
                {"lock_key": f"notes_analysis:{project.id}"},
            )
            await db.execute(
                delete(IntakeSuggestion)
                .where(IntakeSuggestion.project_id == project.id)
                .where(IntakeSuggestion.organization_id == project.organization_id)
                .where(IntakeSuggestion.source == "notes")
                .where(IntakeSuggestion.status == "pending")
            )
            await db.execute(
                delete(IntakeUnmappedNote)
                .where(IntakeUnmappedNote.project_id == project.id)
                .where(IntakeUnmappedNote.organization_id == project.organization_id)
                .where(IntakeUnmappedNote.source_file_id.is_(None))
                .where(IntakeUnmappedNote.source_file.is_(None))
                .where(IntakeUnmappedNote.status == "open")
            )

            # Simple direct loop: validate field_id against registry
            suggestions_count = 0
            for suggestion in analysis.suggestions:
                # Skip empty values (handles 0 correctly)
                value_str = str(suggestion.value).strip()
                if value_str == "":
                    continue

                # Normalize field_id for lookup
                field_id = normalize_field_id(suggestion.field_id)
                registry_item = self.registry.get(field_id)

                if not registry_item:
                    # Unknown field_id → goes to unmapped
                    await self._persist_unmapped_from_notes(
                        db,
                        project,
                        suggestion.value,
                        suggestion.confidence,
                    )
                    continue

                value_type = "number" if _is_number_like(suggestion.value) else "string"
                intake_suggestion = IntakeSuggestion(
                    organization_id=project.organization_id,
                    project_id=project.id,
                    source_file_id=None,
                    field_id=registry_item.field_id,
                    field_label=registry_item.field_label,
                    section_id=registry_item.section_id,
                    section_title=registry_item.section_title,
                    value=str(suggestion.value),
                    value_type=value_type,
                    unit=suggestion.unit,
                    confidence=NotesAnalysisOutput.normalize_confidence(suggestion.confidence),
                    status="pending",
                    source="notes",
                    evidence=None,
                    created_by_user_id=None,
                )
                db.add(intake_suggestion)
                suggestions_count += 1

            # Persist unmapped from AI analysis
            for unmapped in analysis.unmapped:
                await self._persist_unmapped_from_notes(
                    db,
                    project,
                    unmapped.extracted_text,
                    unmapped.confidence,
                )

        return suggestions_count, len(analysis.unmapped), False

    async def _process_image_or_document(
        self,
        db: AsyncSession,
        file: ProjectFile,
        file_bytes: bytes,
    ) -> None:
        route = determine_image_route(file.category)
        if route == "image":
            await self._process_image(db, file, file_bytes)
            return
        await self._process_document(db, file, file_bytes)

    async def _process_image(
        self,
        db: AsyncSession,
        file: ProjectFile,
        file_bytes: bytes,
    ) -> None:
        result = await analyze_image(
            image_data=file_bytes,
            filename=file.filename,
            media_type=file.mime_type or "image/jpeg",
        )

        file.ai_analysis = result.model_dump()
        file.processed_text = result.summary

        await self._delete_pending_for_source(db, file)
        await self._persist_unmapped_from_image(db, file, result.summary)
        await self._mark_completed(db, file)

    async def _persist_unmapped_from_image(
        self, db: AsyncSession, file: ProjectFile, summary: str
    ) -> None:
        if not summary:
            return

        unmapped = IntakeUnmappedNote(
            organization_id=file.organization_id,
            project_id=file.project_id,
            extracted_text=summary,
            confidence=50,
            source_file_id=file.id,
            source_file=file.filename,
            status="open",
        )
        db.add(unmapped)

    async def _process_document(
        self,
        db: AsyncSession,
        file: ProjectFile,
        file_bytes: bytes,
    ) -> None:
        doc_type = determine_doc_type(file.category)
        field_catalog = self._build_field_catalog()
        analysis = await analyze_project_file_document(
            file_bytes=file_bytes,
            filename=file.filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
            media_type=file.mime_type or "application/pdf",
        )

        await self._persist_document_analysis(db, file, analysis, doc_type)
        await self._mark_completed(db, file)

    async def _persist_document_analysis(
        self,
        db: AsyncSession,
        file: ProjectFile,
        analysis: DocumentAnalysisOutput,
        doc_type: DocType,
    ) -> None:
        file.ai_analysis = self._build_file_ai_analysis_payload(analysis, doc_type)
        file.processed_text = analysis.summary

        await self._delete_pending_for_source(db, file)

    def _build_file_ai_analysis_payload(
        self,
        analysis: DocumentAnalysisOutput,
        doc_type: DocType,
    ) -> dict[str, Any]:
        proposals_payload: list[dict[str, Any]] = []
        for proposal in analysis.proposals[:MAX_AI_ANALYSIS_PROPOSALS]:
            answer = proposal.answer.strip()
            if not answer:
                continue
            evidence_refs_payload: list[dict[str, Any]] = []
            for ref in proposal.evidence_refs:
                page = _normalize_page(ref.page)
                excerpt = (ref.excerpt or "").strip()
                evidence_ref: dict[str, Any] = {}
                if page is not None:
                    evidence_ref["page"] = page
                if excerpt:
                    evidence_ref["excerpt"] = excerpt[:MAX_AI_ANALYSIS_TEXT_LENGTH]
                if evidence_ref:
                    evidence_refs_payload.append(evidence_ref)
            if not evidence_refs_payload:
                continue
            if isinstance(proposal, DocumentBaseProposal):
                proposals_payload.append(
                    {
                        "target_kind": "base_field",
                        "base_field_id": proposal.base_field_id,
                        "answer": answer[:MAX_AI_ANALYSIS_TEXT_LENGTH],
                        "confidence": analysis.normalize_confidence(proposal.confidence),
                        "evidence_refs": evidence_refs_payload,
                    }
                )
                continue

            if not isinstance(proposal, DocumentCustomProposal):
                continue
            field_label = proposal.field_label.strip()
            if not field_label:
                continue
            proposals_payload.append(
                {
                    "target_kind": "custom_field",
                    "field_label": field_label[:MAX_AI_ANALYSIS_TEXT_LENGTH],
                    "answer": answer[:MAX_AI_ANALYSIS_TEXT_LENGTH],
                    "confidence": analysis.normalize_confidence(proposal.confidence),
                    "evidence_refs": evidence_refs_payload,
                }
            )

        return {
            "summary": analysis.summary,
            "proposals": proposals_payload,
        }

    async def _delete_pending_for_source(self, db: AsyncSession, file: ProjectFile) -> None:
        await db.execute(
            delete(IntakeSuggestion)
            .where(IntakeSuggestion.project_id == file.project_id)
            .where(IntakeSuggestion.organization_id == file.organization_id)
            .where(IntakeSuggestion.source_file_id == file.id)
            .where(IntakeSuggestion.status == "pending")
        )
        await db.execute(
            delete(IntakeUnmappedNote)
            .where(IntakeUnmappedNote.project_id == file.project_id)
            .where(IntakeUnmappedNote.organization_id == file.organization_id)
            .where(IntakeUnmappedNote.source_file_id == file.id)
            .where(IntakeUnmappedNote.status == "open")
        )

    async def _clone_cached_outputs(
        self,
        db: AsyncSession,
        file: ProjectFile,
        cached: ProjectFile,
    ) -> None:
        # No legacy row cloning here: we only clear per-file pending intake rows.
        # Applies to doc/image hash reuse paths equally.
        await self._delete_pending_for_source(db, file)
        _ = cached

    async def _mark_completed(self, db: AsyncSession, file: ProjectFile) -> None:
        file.processing_status = "completed"
        file.processing_error = None
        if not file.processed_at:
            file.processed_at = datetime.now(UTC)
        await db.flush()
        logger.info("intake_ingestion_completed", file_id=str(file.id))

    async def _mark_failed(self, db: AsyncSession, file: ProjectFile, error: str) -> None:
        file.processing_status = "failed"
        file.processing_error = error
        if not file.processed_at:
            file.processed_at = datetime.now(UTC)
        await db.flush()

    async def requeue_stale_processing_files(self, db: AsyncSession, limit: int = 100) -> int:
        stale_requeue = (
            select(ProjectFile.id)
            .where(ProjectFile.processing_status == "processing")
            .where(ProjectFile.processing_available_at < func.now())
            .where(ProjectFile.processing_attempts < MAX_PROCESSING_ATTEMPTS)
            .order_by(ProjectFile.processing_available_at)
            .limit(limit)
            .cte("stale_requeue")
        )
        requeue_stmt = (
            update(ProjectFile)
            .where(ProjectFile.id.in_(select(stale_requeue.c.id)))
            .where(ProjectFile.processing_status == "processing")
            .values(
                processing_status="queued",
                processing_error="lease_expired_requeued",
                processing_available_at=func.now(),
                processing_started_at=None,
            )
            .returning(ProjectFile.id)
        )
        requeued = await db.execute(requeue_stmt)
        requeued_ids = requeued.scalars().all()

        stale_fail = (
            select(ProjectFile.id)
            .where(ProjectFile.processing_status == "processing")
            .where(ProjectFile.processing_available_at < func.now())
            .where(ProjectFile.processing_attempts >= MAX_PROCESSING_ATTEMPTS)
            .order_by(ProjectFile.processing_available_at)
            .limit(limit)
            .cte("stale_fail")
        )
        fail_stmt = (
            update(ProjectFile)
            .where(ProjectFile.id.in_(select(stale_fail.c.id)))
            .where(ProjectFile.processing_status == "processing")
            .values(
                processing_status="failed",
                processing_error="lease_expired_max_attempts",
                processed_at=func.now(),
            )
            .returning(ProjectFile.id)
        )
        failed = await db.execute(fail_stmt)
        failed_ids = failed.scalars().all()
        return len(requeued_ids) + len(failed_ids)

    async def _handle_ingestion_failure(
        self, db: AsyncSession, file: ProjectFile, exc: Exception
    ) -> None:
        retryable, reason = self._classify_failure(exc)
        reason = self._truncate_error(reason)

        if retryable and file.processing_attempts < MAX_PROCESSING_ATTEMPTS:
            backoff_seconds = self._retry_backoff_seconds(file.id, file.processing_attempts)
            file.processing_status = "queued"
            file.processing_error = reason
            file.processing_available_at = datetime.now(UTC) + timedelta(seconds=backoff_seconds)
            file.processing_started_at = None
            await db.flush()
            logger.warning(
                "intake_ingestion_requeued",
                file_id=str(file.id),
                attempt=file.processing_attempts,
                backoff_seconds=backoff_seconds,
                reason=reason,
            )
            return

        await self._mark_failed(db, file, reason)
        logger.error(
            "intake_ingestion_failed",
            file_id=str(file.id),
            attempt=file.processing_attempts,
            reason=reason,
            exc_info=True,
        )

    def _classify_failure(self, exc: Exception) -> tuple[bool, str]:
        message = str(exc).lower()

        def is_safe_error_code(value: str) -> bool:
            return bool(re.fullmatch(r"[a-z0-9_]{1,80}", value))

        if isinstance(exc, ValueError):
            if message in {"empty_file_bytes", "unsupported_file_type"}:
                return False, message
            if is_safe_error_code(message):
                return False, message
            return True, "unknown_error"

        if isinstance(exc, (DocumentAnalysisError, ImageAnalysisError)):
            if "empty document" in message or "empty image" in message:
                return False, "empty_file_bytes"
            if "document too large" in message:
                return False, "document_too_large"
            if isinstance(exc, DocumentAnalysisError):
                return True, "document_analysis_error"
            return True, "image_analysis_error"
        if isinstance(exc, (FileNotFoundError, StorageError)):
            return False, "file_missing"
        if "no such key" in message or "not found" in message:
            return False, "file_missing"
        return True, "unknown_error"

    def _retry_backoff_seconds(self, file_id: object, attempt: int) -> int:
        """Backoff = min(30s * 2^(attempt-1), 600s) with deterministic ±20% jitter."""
        base = min(RETRY_BASE_SECONDS * (2 ** max(attempt - 1, 0)), RETRY_MAX_SECONDS)
        digest = hashlib.sha256(f"{file_id}:{attempt}".encode()).digest()
        jitter_value = int.from_bytes(digest[:8], "big") / 2**64
        jitter_factor = (jitter_value * 2.0 - 1.0) * RETRY_JITTER_PCT
        backoff = round(base * (1 + jitter_factor))
        return max(1, min(backoff, RETRY_MAX_SECONDS))

    def _truncate_error(self, error: str) -> str:
        return error[:PROCESSING_ERROR_MAX_LENGTH]

    def _has_processing_results(self, file: ProjectFile) -> bool:
        if not file.processed_at:
            return False
        file_type = (file.file_type or "").lower()
        if file_type in DOCUMENT_FILE_TYPES:
            return self._has_valid_workspace_analysis_payload(file.ai_analysis)
        return bool(file.ai_analysis or file.processed_text)

    def _has_cached_results_for_reuse(self, file: ProjectFile) -> bool:
        file_type = (file.file_type or "").lower()
        if file_type in DOCUMENT_FILE_TYPES:
            return self._has_valid_workspace_analysis_payload(file.ai_analysis)
        return bool(file.ai_analysis or file.processed_text)

    def _has_valid_workspace_analysis_payload(self, payload: object) -> bool:
        if not isinstance(payload, dict):
            return False
        payload_map: dict[str, object] = {
            str(key): value for key, value in payload.items() if isinstance(key, str)
        }
        raw_proposals = payload_map.get("proposals")
        if not isinstance(raw_proposals, list):
            return False
        try:
            DocumentAnalysisOutput.model_validate(payload_map)
        except Exception:
            return False
        return True

    def _build_field_catalog(self) -> str:
        """Build field catalog for prompts using the new formatter.

        Deprecated: Use format_catalog_for_prompt() directly from intake_field_catalog module.
        Kept for backward compatibility.
        """
        return format_catalog_for_prompt(self.registry)

    async def _persist_unmapped_from_notes(
        self,
        db: AsyncSession,
        project: Project,
        text: str,
        confidence: int,
    ) -> None:
        unmapped = IntakeUnmappedNote(
            organization_id=project.organization_id,
            project_id=project.id,
            extracted_text=text,
            confidence=NotesAnalysisOutput.normalize_confidence(confidence),
            source_file_id=None,
            source_file=None,
            status="open",
        )
        db.add(unmapped)

    async def _get_intake_note(self, db: AsyncSession, project: Project) -> IntakeNote | None:
        result = await db.execute(
            select(IntakeNote).where(
                IntakeNote.project_id == project.id,
                IntakeNote.organization_id == project.organization_id,
            )
        )
        return result.scalar_one_or_none()


def _is_number_like(value: str) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def _normalize_page(page: int | None) -> int | None:
    if not page or page < 1:
        return None
    return page


def _timestamps_equal(db_ts: datetime, request_ts: datetime) -> bool:
    """Compare timestamps floored to milliseconds.

    Invariant: both timestamps must be timezone-aware UTC.
    """
    if db_ts.tzinfo is None or request_ts.tzinfo is None:
        raise ValueError("Timestamps must be timezone-aware")

    def floor_to_ms(dt: datetime) -> datetime:
        return dt.replace(microsecond=(dt.microsecond // 1000) * 1000)

    db_utc = db_ts.astimezone(UTC)
    request_utc = request_ts.astimezone(UTC)
    return floor_to_ms(db_utc) == floor_to_ms(request_utc)
