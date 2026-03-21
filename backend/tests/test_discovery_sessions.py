import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from conftest import create_company, create_org, create_user
from httpx import AsyncClient
from sqlalchemy import select

import app.services.bulk_import_service as bulk_import_module
import app.services.discovery_session_service as discovery_service_module
from app.models.bulk_import import ImportItem, ImportRun
from app.models.discovery_session import DiscoverySession, DiscoverySource
from app.models.user import UserRole
from app.models.voice_interview import VoiceInterview
from app.services.bulk_import_ai_extractor import ParsedRow


async def _attach_discovery_file_source(
    db_session, *, session: DiscoverySession, run: ImportRun
) -> None:
    source = DiscoverySource(
        organization_id=session.organization_id,
        session_id=session.id,
        source_type="file",
        status="processing",
        source_filename=run.source_filename,
        source_storage_key=run.source_file_path,
        import_run_id=run.id,
        started_at=datetime.now(UTC),
    )
    db_session.add(source)
    await db_session.flush()


async def _attach_discovery_audio_source(
    db_session,
    *,
    session: DiscoverySession,
    run: ImportRun,
    voice: VoiceInterview,
) -> None:
    source = DiscoverySource(
        organization_id=session.organization_id,
        session_id=session.id,
        source_type="audio",
        status="processing",
        source_filename=run.source_filename,
        source_storage_key=run.source_file_path,
        import_run_id=run.id,
        voice_interview_id=voice.id,
        started_at=datetime.now(UTC),
    )
    db_session.add(source)
    await db_session.flush()


async def _create_session_with_discovery_run(
    db_session,
    *,
    org_id,
    company_id,
    user_id,
    source_type: str = "file",
) -> tuple[DiscoverySession, ImportRun, DiscoverySource]:
    session = DiscoverySession(
        organization_id=org_id,
        company_id=company_id,
        status="processing",
        created_by_user_id=user_id,
        started_by_user_id=user_id,
        started_at=datetime.now(UTC),
    )
    db_session.add(session)
    await db_session.flush()

    run = ImportRun(
        organization_id=org_id,
        entrypoint_type="company",
        entrypoint_id=company_id,
        source_file_path="imports/discovery-summary.csv",
        source_filename="discovery-summary.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user_id,
    )
    db_session.add(run)
    await db_session.flush()

    source = DiscoverySource(
        organization_id=org_id,
        session_id=session.id,
        source_type=source_type,
        status="review_ready",
        source_filename="discovery-summary.csv",
        import_run_id=run.id,
        started_at=datetime.now(UTC),
    )
    db_session.add(source)
    await db_session.flush()
    return session, run, source


@pytest.mark.asyncio
async def test_discovery_session_text_start_handoff_and_idempotency(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Org", "discovery-org")
    user = await create_user(
        db_session,
        email=f"discovery-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    async def _fake_extract(
        *, extracted_text: str, filename: str, source_type: str = "bulk_import"
    ):
        assert extracted_text
        assert filename
        assert source_type == "bulk_import"
        return SimpleNamespace(
            rows=[
                ParsedRow(
                    location_data={
                        "name": "Plant Discovery",
                        "city": "Monterrey",
                        "state": "NL",
                        "address": "Ave 1",
                    },
                    project_data={
                        "name": "PET stream",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "Detected stream",
                        "sector": "industrial",
                        "subsector": "other",
                        "estimated_volume": "10 tons/month",
                    },
                    raw={"stream_confidence": "90", "location_confidence": "92"},
                )
            ]
        )

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(
        discovery_service_module.bulk_import_ai_extractor,
        "extract_parsed_rows_from_text",
        _fake_extract,
    )

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "We have PET waste stream at Plant Discovery in Monterrey."},
    )
    assert text_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200
    payload = start_response.json()
    assert payload["status"] == "processing"
    source = payload["sources"][0]
    run_id = source["importRunId"]
    assert run_id is not None
    assert source["status"] == "uploaded"

    replay_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert replay_response.status_code == 200
    replay_payload = replay_response.json()
    assert replay_payload["sources"][0]["importRunId"] == run_id
    assert replay_payload["status"] == "processing"

    run = await db_session.get(ImportRun, run_id)
    assert run is not None
    assert run.status == "uploaded"
    assert run.progress_step == "discovery_text_pending"

    discovery_service = discovery_service_module.DiscoverySessionService()
    claimed_source = await discovery_service.claim_next_text_source(db_session)
    assert claimed_source is not None
    assert claimed_source.id == uuid.UUID(source["id"])
    await db_session.commit()
    await discovery_service.process_text_source(db_session, source_id=claimed_source.id)

    final_response = await client.get(f"/api/v1/discovery-sessions/{session_id}")
    assert final_response.status_code == 200
    final_payload = final_response.json()
    assert final_payload["status"] == "review_ready"
    assert final_payload["summary"]["locationsFound"] == 1
    assert final_payload["summary"]["wasteStreamsFound"] == 1
    assert final_payload["summary"]["draftsNeedingConfirmation"] == 1

    draft_items_result = await db_session.execute(
        select(ImportItem).where(ImportItem.run_id == run.id, ImportItem.item_type == "project")
    )
    draft_items = draft_items_result.scalars().all()
    assert len(draft_items) == 1
    assert draft_items[0].status == "pending_review"


@pytest.mark.asyncio
async def test_discovery_session_partial_failure_with_text_sources(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Partial Org", "discovery-partial-org")
    user = await create_user(
        db_session,
        email=f"discovery-partial-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Partial Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    call_count = {"value": 0}

    async def _fake_extract(
        *, extracted_text: str, filename: str, source_type: str = "bulk_import"
    ):
        assert extracted_text
        assert filename
        assert source_type == "bulk_import"
        call_count["value"] += 1
        if call_count["value"] == 2:
            raise RuntimeError("synthetic-text-failure")
        return SimpleNamespace(
            rows=[
                ParsedRow(
                    location_data={"name": "Plant A", "city": "Monterrey", "state": "NL"},
                    project_data={
                        "name": "Stream A",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "desc",
                        "sector": "industrial",
                        "subsector": "other",
                    },
                    raw={"stream_confidence": "88", "location_confidence": "90"},
                )
            ]
        )

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(
        discovery_service_module.bulk_import_ai_extractor,
        "extract_parsed_rows_from_text",
        _fake_extract,
    )

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    first_text = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "First long enough text source for processing."},
    )
    second_text = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "Second long enough text source for processing."},
    )
    assert first_text.status_code == 201
    assert second_text.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200
    payload = start_response.json()
    assert payload["status"] == "processing"

    discovery_service = discovery_service_module.DiscoverySessionService()

    first_claim = await discovery_service.claim_next_text_source(db_session)
    assert first_claim is not None
    await db_session.commit()
    await discovery_service.process_text_source(db_session, source_id=first_claim.id)

    second_claim = await discovery_service.claim_next_text_source(db_session)
    assert second_claim is not None
    await db_session.commit()
    await discovery_service.process_text_source(db_session, source_id=second_claim.id)

    final_response = await client.get(f"/api/v1/discovery-sessions/{session_id}")
    assert final_response.status_code == 200
    final_payload = final_response.json()
    assert final_payload["status"] == "partial_failure"
    assert final_payload["summary"]["failedSources"] == 1

    source_statuses = {source["status"] for source in final_payload["sources"]}
    assert source_statuses == {"review_ready", "failed"}

    session_row = await db_session.get(DiscoverySession, session_id)
    assert session_row is not None
    assert session_row.status == "partial_failure"

    run_result = await db_session.execute(
        select(ImportRun).where(ImportRun.organization_id == org.id, ImportRun.status == "failed")
    )
    failed_runs = run_result.scalars().all()
    assert len(failed_runs) == 1


@pytest.mark.asyncio
async def test_discovery_text_stale_processing_is_requeued(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Requeue Org", "discovery-requeue-org")
    user = await create_user(
        db_session,
        email=f"discovery-requeue-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Requeue Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(discovery_service_module, "TEXT_SOURCE_LEASE_SECONDS", 1)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "Long enough text source for stale lease requeue test."},
    )
    assert text_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200

    discovery_service = discovery_service_module.DiscoverySessionService()
    claimed_source = await discovery_service.claim_next_text_source(db_session)
    assert claimed_source is not None
    await db_session.commit()

    source_row = await db_session.get(DiscoverySource, claimed_source.id)
    assert source_row is not None
    source_row.updated_at = source_row.updated_at.replace(year=2020)
    await db_session.commit()

    requeued = await discovery_service.requeue_stale_text_sources(db_session)
    assert requeued == 1
    await db_session.commit()

    await db_session.refresh(source_row)
    assert source_row.status == "uploaded"

    run_row = await db_session.get(ImportRun, source_row.import_run_id)
    assert run_row is not None
    assert run_row.status == "uploaded"
    assert run_row.progress_step == "discovery_text_pending"


@pytest.mark.asyncio
async def test_discovery_text_stale_processing_hits_max_attempts_and_fails(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Retry Ceiling Org", "discovery-retry-ceiling-org")
    user = await create_user(
        db_session,
        email=f"discovery-retry-ceiling-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Retry Ceiling Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(discovery_service_module, "TEXT_SOURCE_LEASE_SECONDS", 1)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "Long enough text source for max-attempt requeue test."},
    )
    assert text_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200

    discovery_service = discovery_service_module.DiscoverySessionService()
    claimed_source = await discovery_service.claim_next_text_source(db_session)
    assert claimed_source is not None
    await db_session.commit()

    source_row = await db_session.get(DiscoverySource, claimed_source.id)
    assert source_row is not None
    source_row.updated_at = source_row.updated_at.replace(year=2020)
    run_row = await db_session.get(ImportRun, source_row.import_run_id)
    assert run_row is not None
    run_row.processing_attempts = discovery_service_module.TEXT_SOURCE_MAX_ATTEMPTS
    await db_session.commit()

    requeued = await discovery_service.requeue_stale_text_sources(db_session)
    assert requeued == 1
    await db_session.commit()

    await db_session.refresh(source_row)
    await db_session.refresh(run_row)
    assert source_row.status == "failed"
    assert source_row.processing_error == "max_attempts_reached"
    assert run_row.status == "failed"
    assert run_row.processing_error == "max_attempts_reached"


@pytest.mark.asyncio
async def test_discovery_text_item_limit_uses_global_guard(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Item Limit Org", "discovery-item-limit-org")
    user = await create_user(
        db_session,
        email=f"discovery-item-limit-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Item Limit Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    async def _fake_extract(
        *, extracted_text: str, filename: str, source_type: str = "bulk_import"
    ):
        assert extracted_text
        assert filename
        assert source_type == "bulk_import"
        return SimpleNamespace(
            rows=[
                ParsedRow(
                    location_data={"name": "Plant A", "city": "Monterrey", "state": "NL"},
                    project_data={
                        "name": "Stream A",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "desc",
                        "sector": "industrial",
                        "subsector": "other",
                    },
                    raw={"stream_confidence": "90", "location_confidence": "90"},
                ),
                ParsedRow(
                    location_data={"name": "Plant B", "city": "Guadalajara", "state": "JA"},
                    project_data={
                        "name": "Stream B",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "desc",
                        "sector": "industrial",
                        "subsector": "other",
                    },
                    raw={"stream_confidence": "90", "location_confidence": "90"},
                ),
            ]
        )

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(discovery_service_module, "MAX_IMPORT_ITEMS", 1)
    monkeypatch.setattr(
        discovery_service_module.bulk_import_ai_extractor,
        "extract_parsed_rows_from_text",
        _fake_extract,
    )

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "Long enough text source for item-limit guard test."},
    )
    assert text_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200

    discovery_service = discovery_service_module.DiscoverySessionService()
    claimed_source = await discovery_service.claim_next_text_source(db_session)
    assert claimed_source is not None
    await db_session.commit()
    await discovery_service.process_text_source(db_session, source_id=claimed_source.id)

    source_row = await db_session.get(DiscoverySource, claimed_source.id)
    assert source_row is not None
    run_row = await db_session.get(ImportRun, source_row.import_run_id)
    assert run_row is not None
    assert source_row.status == "failed"
    assert source_row.processing_error == "max_items_exceeded"
    assert run_row.status == "failed"
    assert run_row.processing_error == "max_items_exceeded"


@pytest.mark.asyncio
async def test_discovery_text_transient_extractor_error_retries_then_succeeds(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Transient Org", "discovery-transient-org")
    user = await create_user(
        db_session,
        email=f"discovery-transient-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Transient Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    attempts = {"value": 0}

    async def _flaky_extract(
        *, extracted_text: str, filename: str, source_type: str = "bulk_import"
    ):
        assert extracted_text
        assert filename
        assert source_type == "bulk_import"
        attempts["value"] += 1
        if attempts["value"] == 1:
            raise RuntimeError("temporary_extractor_failure")
        return SimpleNamespace(
            rows=[
                ParsedRow(
                    location_data={"name": "Plant Retry", "city": "Monterrey", "state": "NL"},
                    project_data={
                        "name": "Stream Retry",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "desc",
                        "sector": "industrial",
                        "subsector": "other",
                    },
                    raw={"stream_confidence": "90", "location_confidence": "90"},
                )
            ]
        )

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(
        discovery_service_module.bulk_import_ai_extractor,
        "extract_parsed_rows_from_text",
        _flaky_extract,
    )

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "Long enough text source for transient retry test."},
    )
    assert text_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200

    discovery_service = discovery_service_module.DiscoverySessionService()

    first_claim = await discovery_service.claim_next_text_source(db_session)
    assert first_claim is not None
    await db_session.commit()
    await discovery_service.process_text_source(db_session, source_id=first_claim.id)

    source_after_first = await db_session.get(DiscoverySource, first_claim.id)
    assert source_after_first is not None
    run_after_first = await db_session.get(ImportRun, source_after_first.import_run_id)
    assert run_after_first is not None
    assert source_after_first.status == "uploaded"
    assert run_after_first.status == "uploaded"
    assert run_after_first.processing_attempts == 1

    run_after_first.processing_available_at = datetime.now(UTC) + timedelta(minutes=5)
    await db_session.commit()

    blocked_claim = await discovery_service.claim_next_text_source(db_session)
    assert blocked_claim is None
    await db_session.commit()

    run_after_first.processing_available_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    second_claim = await discovery_service.claim_next_text_source(db_session)
    assert second_claim is not None
    await db_session.commit()
    await discovery_service.process_text_source(db_session, source_id=second_claim.id)

    source_after_second = await db_session.get(DiscoverySource, second_claim.id)
    assert source_after_second is not None
    run_after_second = await db_session.get(ImportRun, source_after_second.import_run_id)
    assert run_after_second is not None
    assert source_after_second.status == "review_ready"
    assert run_after_second.status == "review_ready"
    assert run_after_second.processing_attempts == 2


@pytest.mark.asyncio
async def test_discovery_files_concurrent_upload_respects_limit(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Race Org", "discovery-race-org")
    user = await create_user(
        db_session,
        email=f"discovery-race-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Race Co")
    set_current_user(user)

    async def _slow_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        await asyncio.sleep(0.05)
        return "ok"

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _slow_upload)
    monkeypatch.setattr(discovery_service_module, "MAX_DISCOVERY_FILES_PER_SESSION", 1)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    async def _upload(filename: str):
        return await client.post(
            f"/api/v1/discovery-sessions/{session_id}/files",
            files={"file": (filename, b"name,category\nPET,plastic\n", "text/csv")},
        )

    first_response, second_response = await asyncio.gather(
        _upload("a.csv"),
        _upload("b.csv"),
    )
    status_codes = sorted([first_response.status_code, second_response.status_code])
    assert status_codes == [201, 400]


@pytest.mark.asyncio
async def test_discovery_session_file_audio_start_creates_internal_runs(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Mixed Org", "discovery-mixed-org")
    user = await create_user(
        db_session,
        email=f"discovery-mixed-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Mixed Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    file_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/files",
        files={"file": ("streams.csv", b"name,category\nPET,plastic\n", "text/csv")},
    )
    audio_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/audio",
        files={"audio_file": ("clip.wav", b"fake-audio", "audio/wav")},
    )
    assert file_response.status_code == 201
    assert audio_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200
    payload = start_response.json()
    assert payload["status"] == "processing"

    sources = payload["sources"]
    assert len(sources) == 2
    assert all(source["importRunId"] is not None for source in sources)

    run_rows = await db_session.execute(
        select(ImportRun).where(
            ImportRun.organization_id == org.id, ImportRun.entrypoint_id == company.id
        )
    )
    runs = run_rows.scalars().all()
    assert len(runs) == 2
    assert {run.source_type for run in runs} == {"bulk_import", "voice_interview"}

    voice_row = await db_session.execute(
        select(VoiceInterview).where(VoiceInterview.organization_id == org.id)
    )
    interview = voice_row.scalar_one_or_none()
    assert interview is not None

    source_rows = await db_session.execute(
        select(DiscoverySource).where(DiscoverySource.session_id == session_id)
    )
    stored_sources = source_rows.scalars().all()
    assert len(stored_sources) == 2
    assert any(source.voice_interview_id == interview.id for source in stored_sources)


@pytest.mark.asyncio
async def test_discovery_file_terminal_get_has_persisted_summary_on_first_read(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery File Sync Org", "discovery-file-sync-org")
    user = await create_user(
        db_session,
        email=f"discovery-file-sync-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery File Sync Co")
    set_current_user(user)

    session = DiscoverySession(
        organization_id=org.id,
        company_id=company.id,
        status="processing",
        created_by_user_id=user.id,
        started_at=datetime.now(UTC),
        started_by_user_id=user.id,
    )
    db_session.add(session)
    await db_session.flush()

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/discovery-file.csv",
        source_filename="discovery-file.csv",
        source_type="bulk_import",
        status="processing",
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    await _attach_discovery_file_source(db_session, session=session, run=run)
    await db_session.commit()

    async def _fake_download(_: str) -> bytes:
        return b"name,category\nPET,plastic\n"

    async def _fake_extract(*, file_bytes: bytes, filename: str):
        return SimpleNamespace(
            rows=[
                ParsedRow(
                    location_data={"name": "Plant File", "city": "Monterrey", "state": "NL"},
                    project_data={
                        "name": "PET File",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "desc",
                        "sector": "industrial",
                        "subsector": "other",
                    },
                    raw={"stream_confidence": "90", "location_confidence": "90"},
                )
            ]
        )

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = bulk_import_module.BulkImportService()
    await service.process_run(db_session, run)
    await db_session.commit()

    session_row = await db_session.get(DiscoverySession, session.id)
    assert session_row is not None
    assert session_row.status == "review_ready"
    assert session_row.summary_data is not None
    assert session_row.summary_data["locations_found"] == 1
    assert session_row.summary_data["waste_streams_found"] == 1
    assert session_row.summary_data["drafts_needing_confirmation"] == 1

    response = await client.get(f"/api/v1/discovery-sessions/{session.id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "review_ready"
    assert payload["summary"]["locationsFound"] == 1
    assert payload["summary"]["wasteStreamsFound"] == 1
    assert payload["summary"]["draftsNeedingConfirmation"] == 1


@pytest.mark.asyncio
async def test_discovery_audio_terminal_get_has_persisted_summary_on_first_read(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Audio Sync Org", "discovery-audio-sync-org")
    user = await create_user(
        db_session,
        email=f"discovery-audio-sync-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Audio Sync Co")
    set_current_user(user)

    now = datetime.now(UTC)
    session = DiscoverySession(
        organization_id=org.id,
        company_id=company.id,
        status="processing",
        created_by_user_id=user.id,
        started_at=now,
        started_by_user_id=user.id,
    )
    db_session.add(session)
    await db_session.flush()

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/discovery/audio.wav",
        source_filename="audio.wav",
        source_type="voice_interview",
        status="processing",
        created_by_user_id=user.id,
    )
    voice = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/discovery/audio.wav",
        status="transcribing",
        error_code=None,
        failed_stage=None,
        processing_attempts=0,
        consent_at=now,
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=now + timedelta(days=180),
        transcript_retention_expires_at=now + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(voice)
    await db_session.flush()
    await _attach_discovery_audio_source(db_session, session=session, run=run, voice=voice)
    await db_session.commit()

    async def _fake_download(_: str) -> bytes:
        return b"audio"

    class _FakeTranscription:
        text = "Audio stream at Plant Audio in Monterrey"
        model = "fake"

    async def _fake_transcribe(*, audio_bytes: bytes, filename: str, content_type: str):
        return _FakeTranscription()

    async def _fake_extract_text(*, extracted_text: str, filename: str, source_type: str):
        return SimpleNamespace(
            rows=[
                ParsedRow(
                    location_data={"name": "Plant Audio", "city": "Monterrey", "state": "NL"},
                    project_data={
                        "name": "PET Audio",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "desc",
                        "sector": "industrial",
                        "subsector": "other",
                    },
                    raw={"stream_confidence": "90", "location_confidence": "90"},
                )
            ]
        )

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

    service = bulk_import_module.BulkImportService()
    await service.process_run(db_session, run)
    await db_session.commit()

    session_row = await db_session.get(DiscoverySession, session.id)
    assert session_row is not None
    assert session_row.status == "review_ready"
    assert session_row.summary_data is not None
    assert session_row.summary_data["locations_found"] == 1
    assert session_row.summary_data["waste_streams_found"] == 1
    assert session_row.summary_data["drafts_needing_confirmation"] == 1

    response = await client.get(f"/api/v1/discovery-sessions/{session.id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "review_ready"
    assert payload["summary"]["locationsFound"] == 1
    assert payload["summary"]["wasteStreamsFound"] == 1
    assert payload["summary"]["draftsNeedingConfirmation"] == 1


@pytest.mark.asyncio
async def test_discovery_file_failure_persists_terminal_session_summary_on_first_read(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery File Fail Org", "discovery-file-fail-org")
    user = await create_user(
        db_session,
        email=f"discovery-file-fail-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery File Fail Co")
    set_current_user(user)

    session = DiscoverySession(
        organization_id=org.id,
        company_id=company.id,
        status="processing",
        created_by_user_id=user.id,
        started_at=datetime.now(UTC),
        started_by_user_id=user.id,
    )
    db_session.add(session)
    await db_session.flush()

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/discovery-fail.csv",
        source_filename="discovery-fail.csv",
        source_type="bulk_import",
        status="processing",
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    await _attach_discovery_file_source(db_session, session=session, run=run)
    await db_session.commit()

    async def _fake_download(_: str) -> bytes:
        return b"broken"

    async def _fake_extract(*, file_bytes: bytes, filename: str):
        raise bulk_import_module.BulkImportAIExtractorError("ai_timeout")

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )
    monkeypatch.setattr(bulk_import_module, "MAX_PROCESSING_ATTEMPTS", 1)

    service = bulk_import_module.BulkImportService()
    await service.process_run(db_session, run)
    await db_session.commit()

    session_row = await db_session.get(DiscoverySession, session.id)
    assert session_row is not None
    assert session_row.status == "failed"
    assert session_row.summary_data is not None
    assert session_row.summary_data["failed_sources"] == 1

    response = await client.get(f"/api/v1/discovery-sessions/{session.id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "failed"
    assert payload["summary"]["failedSources"] == 1


@pytest.mark.asyncio
async def test_discovery_file_exhausted_by_sweeper_persists_terminal_session_summary(
    db_session,
) -> None:
    org = await create_org(db_session, "Discovery Sweeper File Org", "discovery-sweeper-file-org")
    user = await create_user(
        db_session,
        email=f"discovery-sweeper-file-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Sweeper File Co")

    session = DiscoverySession(
        organization_id=org.id,
        company_id=company.id,
        status="processing",
        created_by_user_id=user.id,
        started_at=datetime.now(UTC),
        started_by_user_id=user.id,
    )
    db_session.add(session)
    await db_session.flush()

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/sweeper-file.csv",
        source_filename="sweeper-file.csv",
        source_type="bulk_import",
        status="processing",
        processing_attempts=bulk_import_module.MAX_PROCESSING_ATTEMPTS,
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    await _attach_discovery_file_source(db_session, session=session, run=run)
    await db_session.commit()

    service = bulk_import_module.BulkImportService()
    failed = await service.fail_exhausted_runs(db_session)
    assert failed == 1
    await db_session.commit()

    await db_session.refresh(run)
    await db_session.refresh(session)
    assert run.status == "failed"
    assert session.status == "failed"
    assert session.summary_data is not None
    assert session.summary_data["failed_sources"] == 1


@pytest.mark.asyncio
async def test_discovery_audio_exhausted_by_sweeper_persists_terminal_session_summary(
    db_session,
) -> None:
    org = await create_org(db_session, "Discovery Sweeper Audio Org", "discovery-sweeper-audio-org")
    user = await create_user(
        db_session,
        email=f"discovery-sweeper-audio-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Sweeper Audio Co")

    now = datetime.now(UTC)
    session = DiscoverySession(
        organization_id=org.id,
        company_id=company.id,
        status="processing",
        created_by_user_id=user.id,
        started_at=now,
        started_by_user_id=user.id,
    )
    db_session.add(session)
    await db_session.flush()

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="voice-interviews/discovery/sweeper-audio.wav",
        source_filename="sweeper-audio.wav",
        source_type="voice_interview",
        status="processing",
        processing_attempts=bulk_import_module.MAX_PROCESSING_ATTEMPTS,
        created_by_user_id=user.id,
    )
    voice = VoiceInterview(
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        bulk_import_run_id=run.id,
        audio_object_key="voice-interviews/discovery/sweeper-audio.wav",
        status="extracting",
        error_code=None,
        failed_stage=None,
        processing_attempts=bulk_import_module.MAX_PROCESSING_ATTEMPTS,
        consent_at=now,
        consent_by_user_id=user.id,
        consent_copy_version="v1",
        audio_retention_expires_at=now + timedelta(days=180),
        transcript_retention_expires_at=now + timedelta(days=730),
        created_by_user_id=user.id,
    )
    db_session.add(run)
    db_session.add(voice)
    await db_session.flush()
    await _attach_discovery_audio_source(db_session, session=session, run=run, voice=voice)
    await db_session.commit()

    service = bulk_import_module.BulkImportService()
    failed = await service.fail_exhausted_runs(db_session)
    assert failed == 1
    await db_session.commit()

    await db_session.refresh(run)
    await db_session.refresh(voice)
    await db_session.refresh(session)
    assert run.status == "failed"
    assert voice.status == "failed"
    assert session.status == "failed"
    assert session.summary_data is not None
    assert session.summary_data["failed_sources"] == 1


@pytest.mark.asyncio
async def test_discovery_text_stale_max_attempts_persists_terminal_session_summary(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Stale Max Org", "discovery-stale-max-org")
    user = await create_user(
        db_session,
        email=f"discovery-stale-max-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Stale Max Co")
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(discovery_service_module, "TEXT_SOURCE_LEASE_SECONDS", 1)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "Long enough text source for stale max attempts sync test."},
    )
    assert text_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200

    discovery_service = discovery_service_module.DiscoverySessionService()
    claimed_source = await discovery_service.claim_next_text_source(db_session)
    assert claimed_source is not None
    await db_session.commit()

    source_row = await db_session.get(DiscoverySource, claimed_source.id)
    assert source_row is not None
    source_row.updated_at = source_row.updated_at.replace(year=2020)
    run_row = await db_session.get(ImportRun, source_row.import_run_id)
    assert run_row is not None
    run_row.processing_attempts = discovery_service_module.TEXT_SOURCE_MAX_ATTEMPTS
    await db_session.commit()

    requeued = await discovery_service.requeue_stale_text_sources(db_session)
    assert requeued == 1
    await db_session.commit()

    session_row = await db_session.get(DiscoverySession, session_id)
    assert session_row is not None
    assert session_row.status == "failed"
    assert session_row.summary_data is not None
    assert session_row.summary_data["failed_sources"] == 1


@pytest.mark.asyncio
async def test_discovery_session_start_requires_at_least_one_source(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Discovery Empty Org", "discovery-empty-org")
    user = await create_user(
        db_session,
        email=f"discovery-empty-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Empty Co")
    set_current_user(user)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 409


@pytest.mark.asyncio
async def test_discovery_session_rejects_short_text_and_unsupported_file(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Discovery Validation Org", "discovery-validation-org")
    user = await create_user(
        db_session,
        email=f"discovery-validation-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Validation Co")
    set_current_user(user)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={"companyId": str(company.id)},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    short_text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "too short"},
    )
    assert short_text_response.status_code == 400

    bad_file_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/files",
        files={"file": ("notes.exe", b"not allowed", "application/octet-stream")},
    )
    assert bad_file_response.status_code == 400


@pytest.mark.asyncio
async def test_discovery_summary_locations_dedupes_same_location_across_stream_drafts(
    db_session,
) -> None:
    org = await create_org(db_session, "Discovery Summary Dedup Org", "discovery-summary-dedup")
    user = await create_user(
        db_session,
        email=f"discovery-summary-dedup-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Summary Dedup Co")

    session, run, _ = await _create_session_with_discovery_run(
        db_session,
        org_id=org.id,
        company_id=company.id,
        user_id=user.id,
    )

    location_a = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "North Plant", "city": "Monterrey", "state": "NL"},
    )
    location_b = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="pending_review",
        normalized_data={"name": " north  plant ", "city": " MONTERREY", "state": "nl "},
    )
    db_session.add_all([location_a, location_b])
    await db_session.flush()

    db_session.add_all(
        [
            ImportItem(
                organization_id=org.id,
                run_id=run.id,
                item_type="project",
                status="pending_review",
                parent_item_id=location_a.id,
                normalized_data={"name": "Draft A", "project_type": "Assessment"},
            ),
            ImportItem(
                organization_id=org.id,
                run_id=run.id,
                item_type="project",
                status="accepted",
                parent_item_id=location_b.id,
                normalized_data={"name": "Draft B", "project_type": "Assessment"},
            ),
        ]
    )
    await db_session.commit()

    service = discovery_service_module.DiscoverySessionService()
    refreshed_session = await service.get_session(
        db_session,
        organization_id=org.id,
        session_id=session.id,
        for_update=True,
    )
    summary = await service._build_summary(db_session, session=refreshed_session)

    assert summary.waste_streams_found == 2
    assert summary.locations_found == 1


@pytest.mark.asyncio
async def test_discovery_summary_stream_drafts_without_linked_location_reports_zero_locations(
    db_session,
) -> None:
    org = await create_org(db_session, "Discovery Summary Orphan Org", "discovery-summary-orphan")
    user = await create_user(
        db_session,
        email=f"discovery-summary-orphan-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Summary Orphan Co")

    session, run, _ = await _create_session_with_discovery_run(
        db_session,
        org_id=org.id,
        company_id=company.id,
        user_id=user.id,
    )

    db_session.add_all(
        [
            ImportItem(
                organization_id=org.id,
                run_id=run.id,
                item_type="project",
                status="pending_review",
                parent_item_id=None,
                normalized_data={"name": "Orphan Draft", "project_type": "Assessment"},
            ),
            ImportItem(
                organization_id=org.id,
                run_id=run.id,
                item_type="project",
                status="amended",
                parent_item_id=None,
                normalized_data={"name": "Orphan Draft 2", "project_type": "Assessment"},
            ),
        ]
    )
    await db_session.commit()

    service = discovery_service_module.DiscoverySessionService()
    refreshed_session = await service.get_session(
        db_session,
        organization_id=org.id,
        session_id=session.id,
        for_update=True,
    )
    summary = await service._build_summary(db_session, session=refreshed_session)

    assert summary.waste_streams_found == 2
    assert summary.locations_found == 0


@pytest.mark.asyncio
async def test_discovery_summary_location_only_items_do_not_inflate_locations_count(
    db_session,
) -> None:
    org = await create_org(
        db_session,
        "Discovery Summary Location Only Org",
        "discovery-summary-location-only",
    )
    user = await create_user(
        db_session,
        email=f"discovery-summary-location-only-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(
        db_session,
        org_id=org.id,
        name="Discovery Summary Location Only Co",
    )

    session, run, _ = await _create_session_with_discovery_run(
        db_session,
        org_id=org.id,
        company_id=company.id,
        user_id=user.id,
    )

    linked_location = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "Linked Plant", "city": "Monterrey", "state": "NL"},
    )
    location_only = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "Location Only", "city": "Guadalajara", "state": "JA"},
    )
    db_session.add_all([linked_location, location_only])
    await db_session.flush()

    db_session.add(
        ImportItem(
            organization_id=org.id,
            run_id=run.id,
            item_type="project",
            status="pending_review",
            parent_item_id=linked_location.id,
            normalized_data={"name": "Linked Draft", "project_type": "Assessment"},
        )
    )
    await db_session.commit()

    service = discovery_service_module.DiscoverySessionService()
    refreshed_session = await service.get_session(
        db_session,
        organization_id=org.id,
        session_id=session.id,
        for_update=True,
    )
    summary = await service._build_summary(db_session, session=refreshed_session)

    assert summary.waste_streams_found == 1
    assert summary.locations_found == 1
