"""Polling worker for bulk import processing."""

from __future__ import annotations

import asyncio
import random
import signal
import time
from contextlib import suppress

import structlog

from app.core.database import AsyncSessionLocal
from app.services.bulk_import_service import BulkImportService
from app.services.discovery_session_service import DiscoverySessionService
from app.services.voice_retention_service import voice_retention_service

logger = structlog.get_logger(__name__)

_shutdown_event: asyncio.Event | None = None

POLL_BASE_SECONDS = 2.0
POLL_MAX_SECONDS = 60.0
POLL_JITTER_PCT = 0.2
REAPER_INTERVAL_SECONDS = 60.0
LOOP_ERROR_BACKOFF_BASE_SECONDS = 1.0
LOOP_ERROR_BACKOFF_MAX_SECONDS = 15.0


def _final_status(value: str) -> str:
    if value == "failed":
        return "failed"
    if value == "uploaded":
        return "retrying"
    return "success"


def _handle_signal(signum: int) -> None:
    logger.info("shutdown_signal_received", signal=signal.Signals(signum).name)
    if _shutdown_event:
        _shutdown_event.set()


async def run_worker() -> None:
    global _shutdown_event
    _shutdown_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    try:
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _handle_signal, sig)
    except (NotImplementedError, RuntimeError):
        logger.warning("signal_handlers_unavailable")

    service = BulkImportService()
    discovery_service = DiscoverySessionService()
    idle_backoff = POLL_BASE_SECONDS
    loop_error_backoff = LOOP_ERROR_BACKOFF_BASE_SECONDS
    last_reaper = 0.0

    while not _shutdown_event.is_set():
        async with AsyncSessionLocal() as db:
            try:
                now = time.monotonic()
                if now - last_reaper >= REAPER_INTERVAL_SECONDS:
                    await service.requeue_stale_runs(db)
                    await service.fail_exhausted_runs(db)
                    await service.purge_expired_artifacts(db)
                    await discovery_service.requeue_stale_text_sources(db)
                    await voice_retention_service.purge_expired_audio(db)
                    await voice_retention_service.purge_expired_transcripts(db)
                    await voice_retention_service.purge_expired_audit_events(db)
                    await db.commit()
                    last_reaper = now

                discovery_text_source = await discovery_service.claim_next_text_source(db)
                if discovery_text_source is not None:
                    source_id = str(discovery_text_source.id)
                    run_id = (
                        str(discovery_text_source.import_run_id)
                        if discovery_text_source.import_run_id is not None
                        else None
                    )
                    await db.commit()
                    logger.info(
                        "discovery_text_start",
                        source_id=source_id,
                        run_id=run_id,
                    )
                    processing_started = time.perf_counter()
                    await discovery_service.process_text_source(
                        db, source_id=discovery_text_source.id
                    )
                    duration_ms = round((time.perf_counter() - processing_started) * 1000, 2)
                    logger.info(
                        "discovery_text_end",
                        source_id=source_id,
                        run_id=run_id,
                        duration_ms=duration_ms,
                    )
                    idle_backoff = POLL_BASE_SECONDS
                    continue
                if db.new or db.dirty or db.deleted:
                    await db.commit()

                run = await service.claim_next_run(db)
                if run is None:
                    await db.rollback()
                    sleep_seconds = idle_backoff * (
                        1 + random.uniform(-POLL_JITTER_PCT, POLL_JITTER_PCT)
                    )
                    sleep_seconds = max(0.0, min(sleep_seconds, POLL_MAX_SECONDS))
                    idle_backoff = min(idle_backoff * 2, POLL_MAX_SECONDS)
                    with suppress(TimeoutError):
                        await asyncio.wait_for(_shutdown_event.wait(), timeout=sleep_seconds)
                    continue

                run_id = str(run.id)
                filename = run.source_filename
                logger.info(
                    "bulk_import_start",
                    run_id=run_id,
                    filename=filename,
                )
                await db.commit()
                try:
                    run_started = time.perf_counter()
                    await service.process_run(db, run)
                    final_run_status = run.status
                    final_status = _final_status(run.status)
                    final_error_code = run.processing_error
                    await db.commit()
                    total_duration_ms = round((time.perf_counter() - run_started) * 1000, 2)
                    logger.info(
                        "bulk_import_end",
                        run_id=run_id,
                        filename=filename,
                        status=final_status,
                        run_status=final_run_status,
                        duration_ms=total_duration_ms,
                        error_code=final_error_code,
                    )
                    idle_backoff = POLL_BASE_SECONDS
                except Exception:
                    await db.rollback()
                    logger.error(
                        "bulk_import_end",
                        run_id=run_id,
                        filename=filename,
                        status="failed",
                        run_status=run.status,
                        error_code="worker_unexpected_error",
                        exc_info=True,
                    )
                loop_error_backoff = LOOP_ERROR_BACKOFF_BASE_SECONDS
            except Exception:
                await db.rollback()
                logger.error("bulk_import_worker_loop_error", exc_info=True)
                sleep_seconds = loop_error_backoff * (
                    1 + random.uniform(-POLL_JITTER_PCT, POLL_JITTER_PCT)
                )
                sleep_seconds = max(0.0, min(sleep_seconds, LOOP_ERROR_BACKOFF_MAX_SECONDS))
                loop_error_backoff = min(
                    loop_error_backoff * 2,
                    LOOP_ERROR_BACKOFF_MAX_SECONDS,
                )
                with suppress(TimeoutError):
                    await asyncio.wait_for(_shutdown_event.wait(), timeout=sleep_seconds)

    logger.info("bulk_import_worker_stopped")


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
