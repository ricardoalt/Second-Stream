"""Single-writer status sync for voice interview runs."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.models.bulk_import import ImportRun

VOICE_TO_RUN_STATUS: dict[str, str] = {
    "uploaded": "uploaded",
    "queued": "uploaded",
    "transcribing": "processing",
    "extracting": "processing",
    "review_ready": "review_ready",
    "partial_finalized": "review_ready",
    "finalized": "completed",
    "failed": "failed",
}


def map_voice_status_to_run_status(voice_status: str) -> str:
    run_status = VOICE_TO_RUN_STATUS.get(voice_status)
    if run_status is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unsupported voice status: {voice_status}",
        )
    return run_status


def sync_import_run_status_for_voice(*, run: ImportRun, voice_status: str) -> str:
    if run.source_type != "voice_interview":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Status sync is voice-only",
        )

    run_status = map_voice_status_to_run_status(voice_status)
    run.status = run_status
    return run_status
