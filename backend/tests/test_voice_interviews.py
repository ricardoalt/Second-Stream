import asyncio
import io
import json
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select

from app.api.v1 import voice_interviews as voice_api
from app.models.bulk_import import ImportItem, ImportRun
from app.models.intake_suggestion import IntakeSuggestion
from app.models.location import Location
from app.models.project import Project
from app.models.timeline import TimelineEvent
from app.models.user import UserRole
from app.models.voice_interview import VoiceInterview
from app.services.bulk_import_service import BulkImportService
from app.services.voice_constants import MAX_PROCESSING_ATTEMPTS
from app.services.voice_retention_service import AUDIO_PURGED_KEY, voice_retention_service


@pytest.mark.asyncio
async def test_voice_upload_rejects_unsupported_format(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Org", "voice-org")
    user = await create_user(
        db_session,
        email=f"voice-user-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Co")
    set_current_user(user)

    response = await client.post(
        "/api/v1/voice-interviews",
        data={"company_id": str(company.id), "consent_given": "true"},
        files={"audio_file": ("clip.mp4", b"fake", "audio/mp4")},
    )

    assert response.status_code == 400
    assert "Unsupported format" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_voice_upload_creates_interview_and_run(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Voice Org 2", "voice-org-2")
    user = await create_user(
        db_session,
        email=f"voice-user-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Co 2")
    set_current_user(user)

    async def _fake_upload(
        _stream: io.BytesIO, _storage_key: str, _content_type: str | None
    ) -> str:
        return "ok"

    monkeypatch.setattr(voice_api, "upload_file_to_s3", _fake_upload)

    response = await client.post(
        "/api/v1/voice-interviews",
        data={"company_id": str(company.id), "consent_given": "true"},
        files={"audio_file": ("clip.wav", b"fake-audio", "audio/wav")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["status"] == "uploaded"

    run_id = payload["bulkImportRunId"]
    interview_id = payload["voiceInterviewId"]

    run = await db_session.get(ImportRun, run_id)
    interview = await db_session.get(VoiceInterview, interview_id)
    assert run is not None
    assert interview is not None
    assert run.source_type == "voice_interview"
    assert interview.status == "queued"


@pytest.mark.asyncio
async def test_retry_rejects_idempotency_payload_mismatch(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Org 3", "voice-org-3")
    user = await create_user(
        db_session,
        email=f"voice-user-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Co 3")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/fake/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="failed",
        processing_attempts=1,
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/fake/audio.wav",
        transcript_object_key=None,
        status="failed",
        error_code="extract_failed",
        failed_stage="extracting",
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(interview)
    await db_session.commit()

    first = await client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "same-key"},
    )
    assert first.status_code == 200

    interview.failed_stage = "transcribing"
    await db_session.commit()

    second = await client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "same-key"},
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "RETRY_IDEMPOTENCY_KEY_PAYLOAD_MISMATCH"

    stored = await db_session.execute(
        select(VoiceInterview).where(VoiceInterview.id == interview.id)
    )
    assert stored.scalar_one().processing_attempts >= 2


@pytest.mark.asyncio
async def test_retry_replays_same_key_after_first_commit(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Retry Replay Org", "voice-retry-replay-org")
    user = await create_user(
        db_session,
        email=f"voice-retry-replay-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Retry Replay Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/retry-replay/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="failed",
        processing_attempts=1,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/retry-replay/audio.wav",
        transcript_object_key=None,
        status="failed",
        error_code="extract_failed",
        failed_stage="extracting",
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    first = await client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "retry-replay-k1"},
    )
    assert first.status_code == 200
    assert first.json()["status"] == "queued"

    second = await client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "retry-replay-k1"},
    )
    assert second.status_code == 200
    assert second.json() == first.json()


@pytest.mark.asyncio
async def test_retry_replay_precedes_state_or_attempt_rejects(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(
        db_session, "Voice Retry Replay Guard Org", "voice-retry-replay-guard-org"
    )
    user = await create_user(
        db_session,
        email=f"voice-retry-replay-guard-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Retry Replay Guard Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/retry-replay-guard/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="failed",
        processing_attempts=1,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/retry-replay-guard/audio.wav",
        transcript_object_key=None,
        status="failed",
        error_code="extract_failed",
        failed_stage="extracting",
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    first = await client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "retry-replay-guard-k1"},
    )
    assert first.status_code == 200

    run.processing_attempts = MAX_PROCESSING_ATTEMPTS
    interview.processing_attempts = MAX_PROCESSING_ATTEMPTS
    interview.status = "failed"
    interview.failed_stage = "extracting"
    await db_session.commit()

    replay = await client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "retry-replay-guard-k1"},
    )
    assert replay.status_code == 200
    assert replay.json() == first.json()


@pytest.mark.asyncio
async def test_voice_finalize_partial_replay_and_payload_mismatch(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Finalize Org", "voice-finalize-org")
    user = await create_user(
        db_session,
        email=f"voice-finalize-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Finalize Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/finalize/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/finalize/audio.wav",
        transcript_object_key="voice-interviews/finalize/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(interview)
    await db_session.flush()

    location_group_a = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=95,
        extracted_data={},
        normalized_data={"name": "Plant A", "city": "MTY", "state": "NL", "address": "A"},
        confirm_create_new=False,
        group_id="grp_a",
    )
    db_session.add(location_group_a)
    await db_session.flush()
    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="accepted",
            needs_review=False,
            confidence=91,
            extracted_data={},
            normalized_data={
                "name": "Waste A",
                "category": "plastic",
                "project_type": "Assessment",
                "description": "desc",
                "sector": "industrial",
                "subsector": "other",
            },
            parent_item_id=location_group_a.id,
            confirm_create_new=False,
            group_id="grp_a",
        )
    )
    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="location",
            status="pending_review",
            needs_review=True,
            confidence=60,
            extracted_data={},
            normalized_data={"name": "Plant B", "city": "MTY", "state": "NL", "address": "B"},
            confirm_create_new=False,
            group_id="grp_b",
        )
    )
    await db_session.commit()

    payload = {"resolved_group_ids": ["grp_a"], "idempotency_key": "voice-finalize-k1"}
    first = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize", json=payload)
    assert first.status_code == 200
    assert first.json()["status"] == "review_ready"

    await db_session.refresh(run)
    await db_session.refresh(interview)
    assert run.status == "review_ready"
    assert interview.status == "partial_finalized"

    run.status = "failed"
    await db_session.commit()

    replay = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize", json=payload)
    assert replay.status_code == 200
    assert replay.json()["status"] == first.json()["status"]
    assert replay.json()["summary"] == first.json()["summary"]

    mismatch = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={"resolved_group_ids": ["grp_b"], "idempotency_key": "voice-finalize-k1"},
    )
    assert mismatch.status_code == 409
    assert mismatch.json()["error"]["code"] == "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH"


@pytest.mark.asyncio
async def test_voice_finalize_creates_pending_intake_suggestions(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Suggest Org", "voice-suggest-org")
    user = await create_user(
        db_session,
        email=f"voice-suggest-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Suggest Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/suggest/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/suggest/audio.wav",
        transcript_object_key="voice-interviews/suggest/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(interview)
    await db_session.flush()

    location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=95,
        extracted_data={},
        normalized_data={"name": "Plant S", "city": "MTY", "state": "NL", "address": "S"},
        confirm_create_new=False,
        group_id="grp_s",
    )
    db_session.add(location_item)
    await db_session.flush()

    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="accepted",
            needs_review=False,
            confidence=88,
            extracted_data={
                "stream_metadata": json.dumps(
                    {
                        "questionnaire_hints": [
                            {
                                "field_id": "waste-types",
                                "value": "PET",
                                "confidence": 87,
                            }
                        ]
                    }
                )
            },
            normalized_data={
                "name": "Waste S",
                "category": "plastic",
                "project_type": "Assessment",
                "description": "desc",
                "sector": "industrial",
                "subsector": "other",
            },
            parent_item_id=location_item.id,
            confirm_create_new=False,
            group_id="grp_s",
        )
    )
    await db_session.commit()

    response = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={"resolved_group_ids": ["grp_s"], "idempotency_key": "voice-finalize-suggest"},
    )
    assert response.status_code == 200

    created_project_item_result = await db_session.execute(
        select(ImportItem)
        .where(ImportItem.run_id == run.id)
        .where(ImportItem.item_type == "project")
    )
    created_project_item = created_project_item_result.scalar_one()
    assert created_project_item.created_project_id is not None

    suggestions_result = await db_session.execute(
        select(IntakeSuggestion)
        .where(IntakeSuggestion.project_id == created_project_item.created_project_id)
        .where(IntakeSuggestion.organization_id == org.id)
    )
    suggestions = suggestions_result.scalars().all()
    assert len(suggestions) == 1
    assert suggestions[0].status == "pending"
    assert suggestions[0].field_id == "waste-types"


@pytest.mark.asyncio
async def test_dashboard_returns_voice_review_draft_rows(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Dashboard Org", "voice-dashboard-org")
    user = await create_user(
        db_session,
        email=f"voice-dashboard-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Dashboard Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/dashboard/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/dashboard/audio.wav",
        transcript_object_key="voice-interviews/dashboard/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(interview)
    await db_session.flush()
    location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=95,
        extracted_data={},
        normalized_data={"name": "Voice Plant", "city": "MTY", "state": "NL", "address": "A"},
        confirm_create_new=False,
        group_id="voice_dashboard_grp",
    )
    db_session.add(location_item)
    await db_session.flush()
    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="pending_review",
            needs_review=True,
            confidence=72,
            extracted_data={},
            normalized_data={
                "name": "Voice Draft Stream",
                "estimated_volume": "12 tons/month",
                "project_type": "Assessment",
            },
            parent_item_id=location_item.id,
            confirm_create_new=False,
            group_id="voice_dashboard_grp",
        )
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/projects/dashboard?bucket=needs_confirmation&search=Voice Draft"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["counts"]["total"] == 0
    assert payload["counts"]["needsConfirmation"] == 0
    assert payload["total"] == 0
    assert payload["items"] == []


@pytest.mark.asyncio
async def test_voice_retention_jobs_purge_audio_and_transcript(db_session, monkeypatch) -> None:
    org = await create_org(db_session, "Voice Retention Org", "voice-retention-org")
    user = await create_user(
        db_session,
        email=f"voice-retention-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Retention Co")

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/retention/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/retention/audio.wav",
        transcript_object_key="voice-interviews/retention/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) - timedelta(days=1),
        transcript_retention_expires_at=datetime.now(UTC) - timedelta(days=1),
        created_by_user_id=user.id,
    )
    db_session.add(interview)
    await db_session.commit()

    deleted: list[str] = []

    import app.services.voice_retention_service as retention_module

    async def _fake_delete(keys: list[str]) -> None:
        deleted.extend(keys)

    monkeypatch.setattr(retention_module, "delete_storage_keys", _fake_delete)

    audio_purged = await voice_retention_service.purge_expired_audio(db_session)
    transcript_purged = await voice_retention_service.purge_expired_transcripts(db_session)
    await db_session.commit()

    await db_session.refresh(interview)
    assert audio_purged == 1
    assert transcript_purged == 1
    assert interview.audio_object_key == AUDIO_PURGED_KEY
    assert interview.transcript_object_key is None
    assert "voice-interviews/retention/audio.wav" in deleted
    assert "voice-interviews/retention/transcript.txt" in deleted


@pytest.mark.asyncio
async def test_voice_retention_job_purges_old_voice_audit_events(db_session) -> None:
    org = await create_org(db_session, "Voice Audit Org", "voice-audit-org")
    user = await create_user(
        db_session,
        email=f"voice-audit-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Audit Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Voice Audit Location",
        created_by_user_id=user.id,
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Voice Audit Project",
    )

    old_event = TimelineEvent(
        organization_id=org.id,
        project_id=project.id,
        event_type="voice_uploaded",
        title="Voice uploaded",
        description="old",
        actor=user.email,
    )
    recent_event = TimelineEvent(
        organization_id=org.id,
        project_id=project.id,
        event_type="voice_uploaded",
        title="Voice uploaded",
        description="recent",
        actor=user.email,
    )
    db_session.add(old_event)
    db_session.add(recent_event)
    await db_session.flush()
    old_event.created_at = datetime.now(UTC) - timedelta(days=740)
    recent_event.created_at = datetime.now(UTC)
    await db_session.commit()

    purged = await voice_retention_service.purge_expired_audit_events(db_session)
    await db_session.commit()

    assert purged == 1
    old_row = await db_session.get(TimelineEvent, old_event.id)
    recent_row = await db_session.get(TimelineEvent, recent_event.id)
    assert old_row is None
    assert recent_row is not None


@pytest.mark.asyncio
async def test_voice_audio_and_transcript_endpoints_enforce_rbac(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Voice RBAC Org", "voice-rbac-org")
    user = await create_user(
        db_session,
        email=f"voice-rbac-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    outsider_org = await create_org(db_session, "Voice RBAC Other", "voice-rbac-other")
    outsider = await create_user(
        db_session,
        email=f"voice-rbac-out-{uuid.uuid4().hex[:6]}@example.com",
        org_id=outsider_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice RBAC Co")

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/rbac/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/rbac/audio.wav",
        transcript_object_key="voice-interviews/rbac/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(interview)
    await db_session.commit()

    async def _fake_url(_key: str, expires: int = 600) -> str:
        return f"https://example.com/audio?exp={expires}"

    async def _fake_download(_key: str) -> bytes:
        return b"hello transcript"

    monkeypatch.setattr(voice_api, "get_presigned_url", _fake_url)
    monkeypatch.setattr(voice_api, "download_file_content", _fake_download)

    set_current_user(user)
    ok_audio = await client.get(f"/api/v1/voice-interviews/{interview.id}/audio-url")
    ok_transcript = await client.get(f"/api/v1/voice-interviews/{interview.id}/transcript")
    assert ok_audio.status_code == 200
    assert ok_transcript.status_code == 200

    set_current_user(outsider)
    denied_audio = await client.get(f"/api/v1/voice-interviews/{interview.id}/audio-url")
    denied_transcript = await client.get(f"/api/v1/voice-interviews/{interview.id}/transcript")
    assert denied_audio.status_code == 404
    assert denied_transcript.status_code == 404


@pytest.mark.asyncio
async def test_voice_finalize_empty_extraction_requires_review_ready_status(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Empty Org", "voice-empty-org")
    user = await create_user(
        db_session,
        email=f"voice-empty-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Empty Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/empty/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="uploaded",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/empty/audio.wav",
        transcript_object_key=None,
        status="queued",
        error_code=None,
        failed_stage=None,
        processing_attempts=0,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={"close_reason": "empty_extraction"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_retry_returns_voice_max_attempts_reached(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Retry Max Org", "voice-retry-max-org")
    user = await create_user(
        db_session,
        email=f"voice-retry-max-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Retry Max Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/retry-max/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="failed",
        processing_attempts=MAX_PROCESSING_ATTEMPTS,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/retry-max/audio.wav",
        transcript_object_key=None,
        status="failed",
        error_code="extract_failed",
        failed_stage="extracting",
        processing_attempts=MAX_PROCESSING_ATTEMPTS,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "retry-max-k1"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "VOICE_MAX_ATTEMPTS_REACHED"


def test_voice_transcript_too_long_raises_limit_error(monkeypatch) -> None:
    service = BulkImportService()
    monkeypatch.setattr("app.services.bulk_import_service.VOICE_CHUNK_TOKENS", 4)
    monkeypatch.setattr("app.services.bulk_import_service.VOICE_CHUNK_OVERLAP_TOKENS", 0)
    monkeypatch.setattr("app.services.bulk_import_service.VOICE_MAX_CHUNKS", 1)

    with pytest.raises(ValueError, match="VOICE_TRANSCRIPT_TOO_LONG"):
        service._chunk_transcript("one two three four five six")


@pytest.mark.asyncio
async def test_voice_status_sync_in_claim_requeue_and_fail_exhausted(db_session) -> None:
    org = await create_org(db_session, "Voice Sync Org", "voice-sync-org")
    user = await create_user(
        db_session,
        email=f"voice-sync-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Sync Co")

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/sync/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="uploaded",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/sync/audio.wav",
        transcript_object_key=None,
        status="queued",
        error_code=None,
        failed_stage=None,
        processing_attempts=0,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    service = BulkImportService()

    claimed = await service.claim_next_run(db_session)
    assert claimed is not None
    await db_session.flush()
    await db_session.refresh(run)
    await db_session.refresh(interview)
    assert run.status == "processing"
    assert interview.status == "transcribing"

    run.processing_available_at = datetime.now(UTC) - timedelta(minutes=10)
    await db_session.flush()
    requeued = await service.requeue_stale_runs(db_session)
    assert requeued == 1
    await db_session.flush()
    await db_session.refresh(run)
    await db_session.refresh(interview)
    assert run.status == "uploaded"
    assert interview.status == "queued"

    run.processing_attempts = MAX_PROCESSING_ATTEMPTS
    run.status = "uploaded"
    interview.status = "queued"
    await db_session.flush()
    failed = await service.fail_exhausted_runs(db_session)
    assert failed == 1
    await db_session.flush()
    await db_session.refresh(run)
    await db_session.refresh(interview)
    assert run.status == "failed"
    assert interview.status == "failed"


@pytest.mark.asyncio
async def test_voice_finalize_group_resolver_map_create_reject(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Resolve Org", "voice-resolve-org")
    user = await create_user(
        db_session,
        email=f"voice-resolve-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Resolve Co")
    set_current_user(user)

    existing_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Existing Plant",
        created_by_user_id=user.id,
    )
    existing_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=existing_location.id,
        name="Existing Stream",
    )

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/resolve/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/resolve/audio.wav",
        transcript_object_key="voice-interviews/resolve/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.flush()

    map_location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=95,
        extracted_data={},
        normalized_data={"name": "Existing Plant", "city": "", "state": "", "address": ""},
        duplicate_candidates=[{"id": str(existing_location.id), "name": "Existing Plant"}],
        confirm_create_new=False,
        group_id="grp_map",
    )
    db_session.add(map_location_item)
    await db_session.flush()
    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="accepted",
            needs_review=False,
            confidence=90,
            extracted_data={},
            normalized_data={
                "name": "Existing Stream",
                "category": "plastic",
                "project_type": "Assessment",
                "description": "desc",
                "sector": "industrial",
                "subsector": "other",
            },
            duplicate_candidates=[{"id": str(existing_project.id), "name": "Existing Stream"}],
            parent_item_id=map_location_item.id,
            confirm_create_new=False,
            group_id="grp_map",
        )
    )

    create_location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=91,
        extracted_data={},
        normalized_data={"name": "New Plant", "city": "MTY", "state": "NL", "address": "A"},
        confirm_create_new=True,
        group_id="grp_create",
    )
    db_session.add(create_location_item)
    await db_session.flush()
    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="accepted",
            needs_review=False,
            confidence=89,
            extracted_data={},
            normalized_data={
                "name": "New Stream",
                "category": "plastic",
                "project_type": "Assessment",
                "description": "desc",
                "sector": "industrial",
                "subsector": "other",
            },
            parent_item_id=create_location_item.id,
            confirm_create_new=True,
            group_id="grp_create",
        )
    )

    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="location",
            status="rejected",
            needs_review=False,
            confidence=70,
            extracted_data={},
            normalized_data={"name": "Reject Plant", "city": "MTY", "state": "NL", "address": "R"},
            confirm_create_new=False,
            group_id="grp_reject",
        )
    )
    await db_session.commit()

    response = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={
            "resolved_group_ids": ["grp_map", "grp_create", "grp_reject"],
            "idempotency_key": "voice-resolve-k1",
        },
    )
    assert response.status_code == 200

    project_count = await db_session.execute(
        select(Project).where(Project.organization_id == org.id)
    )
    location_count = await db_session.execute(
        select(Location).where(Location.organization_id == org.id)
    )
    assert len(project_count.scalars().all()) == 2
    assert len(location_count.scalars().all()) == 2


@pytest.mark.asyncio
async def test_voice_finalize_creates_location_without_zip(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Zip Org", "voice-zip-org")
    user = await create_user(
        db_session,
        email=f"voice-zip-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Zip Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/zip/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/zip/audio.wav",
        transcript_object_key="voice-interviews/zip/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.flush()

    location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=90,
        extracted_data={},
        normalized_data={"name": "Voice Zip Plant", "city": "MTY", "state": "NL"},
        confirm_create_new=True,
        group_id="grp_zip",
    )
    db_session.add(location_item)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={"resolved_group_ids": ["grp_zip"], "idempotency_key": "voice-zip-k1"},
    )
    assert response.status_code == 200

    created_location = await db_session.scalar(
        select(Location).where(
            Location.organization_id == org.id, Location.name == "Voice Zip Plant"
        )
    )
    assert created_location is not None
    assert created_location.zip_code is None


@pytest.mark.asyncio
async def test_voice_accept_location_with_duplicates_and_confirm_create_new_false_allowed(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Accept Loc Org", "voice-accept-loc-org")
    user = await create_user(
        db_session,
        email=f"voice-accept-loc-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Accept Loc Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/accept-loc/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/accept-loc/audio.wav",
        transcript_object_key="voice-interviews/accept-loc/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.flush()

    location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="pending_review",
        needs_review=True,
        confidence=80,
        extracted_data={},
        normalized_data={"name": "Plant A", "city": "MTY", "state": "NL", "address": "A"},
        duplicate_candidates=[
            {"id": str(uuid.uuid4()), "name": "Plant A"},
            {"id": str(uuid.uuid4()), "name": "Plant A Annex"},
        ],
        confirm_create_new=False,
        group_id="grp_loc",
    )
    db_session.add(location_item)
    await db_session.commit()

    response = await client.patch(
        f"/api/v1/bulk-import/items/{location_item.id}",
        json={"action": "accept", "confirm_create_new": False},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_voice_accept_project_with_duplicates_and_confirm_create_new_false_allowed(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Accept Proj Org", "voice-accept-proj-org")
    user = await create_user(
        db_session,
        email=f"voice-accept-proj-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Accept Proj Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/accept-proj/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/accept-proj/audio.wav",
        transcript_object_key="voice-interviews/accept-proj/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.flush()

    location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=95,
        extracted_data={},
        normalized_data={"name": "Plant B", "city": "MTY", "state": "NL", "address": "B"},
        duplicate_candidates=[{"id": str(uuid.uuid4()), "name": "Plant B"}],
        confirm_create_new=False,
        group_id="grp_proj",
    )
    db_session.add(location_item)
    await db_session.flush()

    project_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="project",
        status="pending_review",
        needs_review=True,
        confidence=84,
        extracted_data={},
        normalized_data={
            "name": "Stream B",
            "category": "plastic",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "other",
        },
        duplicate_candidates=[
            {"id": str(uuid.uuid4()), "name": "Stream B"},
            {"id": str(uuid.uuid4()), "name": "Stream B 2"},
        ],
        parent_item_id=location_item.id,
        confirm_create_new=False,
        group_id="grp_proj",
    )
    db_session.add(project_item)
    await db_session.commit()

    response = await client.patch(
        f"/api/v1/bulk-import/items/{project_item.id}",
        json={"action": "accept", "confirm_create_new": False},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_voice_finalize_with_ambiguous_duplicates_returns_409(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Finalize Dup Org", "voice-finalize-dup-org")
    user = await create_user(
        db_session,
        email=f"voice-finalize-dup-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Finalize Dup Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/finalize-dup/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/finalize-dup/audio.wav",
        transcript_object_key="voice-interviews/finalize-dup/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.flush()

    location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=90,
        extracted_data={},
        normalized_data={"name": "Plant C", "city": "MTY", "state": "NL", "address": "C"},
        duplicate_candidates=[
            {"id": str(uuid.uuid4()), "name": "Plant C"},
            {"id": str(uuid.uuid4()), "name": "Plant C Annex"},
        ],
        confirm_create_new=False,
        group_id="grp_ambiguous",
    )
    db_session.add(location_item)
    await db_session.flush()

    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="accepted",
            needs_review=False,
            confidence=86,
            extracted_data={},
            normalized_data={
                "name": "Stream C",
                "category": "plastic",
                "project_type": "Assessment",
                "description": "desc",
                "sector": "industrial",
                "subsector": "other",
            },
            duplicate_candidates=[
                {"id": str(uuid.uuid4()), "name": "Stream C"},
                {"id": str(uuid.uuid4()), "name": "Stream C Alt"},
            ],
            parent_item_id=location_item.id,
            confirm_create_new=False,
            group_id="grp_ambiguous",
        )
    )
    await db_session.commit()

    response = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={"resolved_group_ids": ["grp_ambiguous"], "idempotency_key": "voice-dup-409-k1"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_voice_retry_idempotent_under_parallel_requests(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Retry Race Org", "voice-retry-race-org")
    user = await create_user(
        db_session,
        email=f"voice-retry-race-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Retry Race Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/retry-race/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="failed",
        processing_attempts=1,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/retry-race/audio.wav",
        transcript_object_key=None,
        status="failed",
        error_code="extract_failed",
        failed_stage="extracting",
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    req_a = client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "retry-race-k1"},
    )
    req_b = client.post(
        f"/api/v1/voice-interviews/{interview.id}/retry",
        headers={"Idempotency-Key": "retry-race-k1"},
    )
    resp_a, resp_b = await asyncio.gather(req_a, req_b)
    assert resp_a.status_code == 200
    assert resp_b.status_code == 200
    assert resp_a.json()["status"] == "queued"
    assert resp_b.json()["status"] == "queued"


@pytest.mark.asyncio
async def test_voice_finalize_idempotent_under_parallel_requests(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Finalize Race Org", "voice-finalize-race-org")
    user = await create_user(
        db_session,
        email=f"voice-finalize-race-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Finalize Race Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/finalize-race/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/finalize-race/audio.wav",
        transcript_object_key="voice-interviews/finalize-race/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.flush()

    location_item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="accepted",
        needs_review=False,
        confidence=95,
        extracted_data={},
        normalized_data={"name": "Race Plant", "city": "MTY", "state": "NL", "address": "R"},
        confirm_create_new=True,
        group_id="grp_race",
    )
    db_session.add(location_item)
    await db_session.flush()
    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="accepted",
            needs_review=False,
            confidence=90,
            extracted_data={},
            normalized_data={
                "name": "Race Stream",
                "category": "plastic",
                "project_type": "Assessment",
                "description": "desc",
                "sector": "industrial",
                "subsector": "other",
            },
            parent_item_id=location_item.id,
            confirm_create_new=True,
            group_id="grp_race",
        )
    )
    await db_session.commit()

    payload = {"resolved_group_ids": ["grp_race"], "idempotency_key": "finalize-race-k1"}
    req_a = client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize", json=payload)
    req_b = client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize", json=payload)
    resp_a, resp_b = await asyncio.gather(req_a, req_b)
    assert resp_a.status_code == 200
    assert resp_b.status_code == 200


@pytest.mark.asyncio
async def test_voice_finalize_invalid_state_returns_409(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Voice Finalize State Org", "voice-finalize-state-org")
    user = await create_user(
        db_session,
        email=f"voice-finalize-state-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Finalize State Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/finalize-state/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="uploaded",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/finalize-state/audio.wav",
        transcript_object_key="voice-interviews/finalize-state/transcript.txt",
        status="queued",
        error_code=None,
        failed_stage=None,
        processing_attempts=0,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={"resolved_group_ids": ["grp_x"], "idempotency_key": "voice-state-k1"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_voice_get_transcript_storage_miss_returns_404(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Voice Transcript Miss Org", "voice-transcript-miss-org")
    user = await create_user(
        db_session,
        email=f"voice-transcript-miss-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Transcript Miss Co")
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/transcript-miss/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/transcript-miss/audio.wav",
        transcript_object_key="voice-interviews/transcript-miss/transcript.txt",
        status="review_ready",
        error_code=None,
        failed_stage=None,
        processing_attempts=0,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    async def _missing(_key: str) -> bytes | None:
        return None

    monkeypatch.setattr(voice_api, "download_file_content", _missing)

    response = await client.get(f"/api/v1/voice-interviews/{interview.id}/transcript")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_voice_no_data_path_uses_status_sync_and_not_no_data(db_session, monkeypatch) -> None:
    org = await create_org(db_session, "Voice No Data Org", "voice-no-data-org")
    user = await create_user(
        db_session,
        email=f"voice-no-data-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice No Data Co")

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/no-data/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="processing",
        processing_attempts=1,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/no-data/audio.wav",
        transcript_object_key=None,
        status="transcribing",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_key: str) -> bytes:
        return b"audio"

    class _FakeTranscription:
        text = "hello world"
        model = "fake"

    async def _fake_transcribe(*, audio_bytes: bytes, filename: str, content_type: str):
        return _FakeTranscription()

    extract_calls: list[dict[str, str]] = []

    async def _fake_extract_text(*, extracted_text: str, filename: str, source_type: str):
        extract_calls.append(
            {
                "extracted_text": extracted_text,
                "filename": filename,
                "source_type": source_type,
            }
        )
        return SimpleNamespace(rows=[])

    async def _fake_upload(_stream, _key: str, _content_type: str | None):
        return "ok"

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.voice_transcription_service,
        "transcribe_audio",
        _fake_transcribe,
    )
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows_from_text",
        _fake_extract_text,
    )
    monkeypatch.setattr(bulk_import_module, "upload_file_to_s3", _fake_upload)

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)
    await db_session.refresh(interview)

    assert interview.status == "review_ready"
    assert run.status == "review_ready"
    assert run.status != "no_data"
    assert len(extract_calls) == 1
    assert extract_calls[0]["source_type"] == "voice_interview"


@pytest.mark.asyncio
async def test_voice_import_orphan_projects_is_blocked(db_session, set_current_user) -> None:
    org = await create_org(db_session, "Voice Orphan Sync Org", "voice-orphan-sync-org")
    user = await create_user(
        db_session,
        email=f"voice-orphan-sync-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Voice Orphan Sync Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant Sync",
    )
    set_current_user(user)

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/sync/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="review_ready",
        processing_attempts=0,
        created_by_user_id=user.id,
    )
    interview = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/sync/audio.wav",
        transcript_object_key="voice-interviews/sync/transcript.txt",
        status="partial_finalized",
        error_code=None,
        failed_stage=None,
        processing_attempts=1,
        consent_at=datetime.now(UTC),
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=datetime.now(UTC) + timedelta(days=180),
        transcript_retention_expires_at=datetime.now(UTC) + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(interview)
    await db_session.flush()

    item = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="project",
        status="invalid",
        needs_review=False,
        confidence=82,
        extracted_data={},
        normalized_data={
            "name": "Unmapped Stream",
            "category": "paper",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "other",
            "estimated_volume": "",
        },
        review_notes="Project row missing location context",
        confirm_create_new=False,
    )
    db_session.add(item)
    await db_session.commit()

    service = BulkImportService()
    with pytest.raises(HTTPException) as exc_info:
        await service.import_orphan_projects(
            db_session,
            organization_id=org.id,
            run_id=run.id,
            location_id=location.id,
            item_ids=[item.id],
            user_id=user.id,
        )

    assert exc_info.value.status_code == 409
    assert "Resolve from Needs Confirmation" in str(exc_info.value.detail)

    await db_session.refresh(run)
    await db_session.refresh(interview)
    await db_session.refresh(item)

    assert item.created_project_id is None
    assert interview.status == "partial_finalized"
    assert run.status == "review_ready"
