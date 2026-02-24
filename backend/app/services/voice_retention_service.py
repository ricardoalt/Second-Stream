"""Retention enforcement for voice interview artifacts."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.timeline import TimelineEvent
from app.models.voice_interview import VoiceInterview
from app.services.storage_delete_service import delete_storage_keys

logger = structlog.get_logger(__name__)

AUDIO_PURGED_KEY = "voice-interviews/purged"
AUDIT_RETENTION_DAYS = 730


class VoiceRetentionService:
    async def purge_expired_audio(self, db: AsyncSession, limit: int = 100) -> int:
        now = datetime.now(UTC)
        result = await db.execute(
            select(VoiceInterview)
            .where(VoiceInterview.audio_retention_expires_at <= now)
            .where(VoiceInterview.audio_object_key != AUDIO_PURGED_KEY)
            .order_by(VoiceInterview.audio_retention_expires_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        interviews = result.scalars().all()
        if not interviews:
            return 0

        purged = 0
        for interview in interviews:
            try:
                await delete_storage_keys([interview.audio_object_key])
            except Exception:
                logger.warning(
                    "voice_audio_retention_delete_failed",
                    voice_interview_id=str(interview.id),
                    exc_info=True,
                )
                continue
            interview.audio_object_key = AUDIO_PURGED_KEY
            purged += 1
        return purged

    async def purge_expired_transcripts(self, db: AsyncSession, limit: int = 100) -> int:
        now = datetime.now(UTC)
        result = await db.execute(
            select(VoiceInterview)
            .where(VoiceInterview.transcript_retention_expires_at <= now)
            .where(VoiceInterview.transcript_object_key.is_not(None))
            .order_by(VoiceInterview.transcript_retention_expires_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        interviews = result.scalars().all()
        if not interviews:
            return 0

        purged = 0
        for interview in interviews:
            transcript_key = interview.transcript_object_key
            if transcript_key is None:
                continue
            try:
                await delete_storage_keys([transcript_key])
            except Exception:
                logger.warning(
                    "voice_transcript_retention_delete_failed",
                    voice_interview_id=str(interview.id),
                    exc_info=True,
                )
                continue
            interview.transcript_object_key = None
            purged += 1
        return purged

    async def purge_expired_audit_events(self, db: AsyncSession, limit: int = 500) -> int:
        cutoff = datetime.now(UTC) - timedelta(days=AUDIT_RETENTION_DAYS)
        ids_result = await db.execute(
            select(TimelineEvent.id)
            .where(TimelineEvent.event_type.like("voice_%"))
            .where(TimelineEvent.created_at < cutoff)
            .order_by(TimelineEvent.created_at)
            .limit(limit)
        )
        event_ids = ids_result.scalars().all()
        if not event_ids:
            return 0

        await db.execute(delete(TimelineEvent).where(TimelineEvent.id.in_(event_ids)))
        return len(event_ids)


voice_retention_service = VoiceRetentionService()
