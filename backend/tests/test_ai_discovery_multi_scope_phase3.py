import uuid
from types import SimpleNamespace

import pytest
from conftest import create_company, create_location, create_org, create_user
from httpx import AsyncClient

import app.services.discovery_session_service as discovery_service_module
from app.models.bulk_import import ImportItem, ImportRun
from app.models.discovery_session import DiscoverySession, DiscoverySource
from app.models.user import UserRole
from app.models.voice_interview import VoiceInterview
from app.services.bulk_import_ai_extractor import ParsedRow


@pytest.mark.asyncio
async def test_org_scoped_discovery_text_source_processes_to_review_ready(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Phase3 Org", "discovery-phase3-org")
    user = await create_user(
        db_session,
        email=f"discovery-phase3-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
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
                        "name": "Org Scope Plant",
                        "city": "Monterrey",
                        "state": "NL",
                    },
                    project_data={
                        "name": "Org Scope Stream",
                        "category": "plastic",
                        "project_type": "Assessment",
                        "description": "Detected stream",
                        "sector": "industrial",
                        "subsector": "other",
                        "estimated_volume": "8 tons/month",
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

    create_response = await client.post("/api/v1/discovery-sessions", json={})
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    text_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/text",
        json={"text": "Bulk document with one stream at Org Scope Plant in Monterrey."},
    )
    assert text_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200
    run_id = start_response.json()["sources"][0]["importRunId"]
    assert run_id is not None

    run = await db_session.get(ImportRun, run_id)
    assert run is not None
    assert run.entrypoint_type == "organization"
    assert run.entrypoint_id == org.id

    discovery_service = discovery_service_module.DiscoverySessionService()
    claimed_source = await discovery_service.claim_next_text_source(db_session)
    assert claimed_source is not None
    await db_session.commit()
    await discovery_service.process_text_source(db_session, source_id=claimed_source.id)

    await db_session.refresh(user)
    set_current_user(user)

    final_response = await client.get(f"/api/v1/discovery-sessions/{session_id}")
    assert final_response.status_code == 200
    final_payload = final_response.json()
    assert final_payload["status"] == "review_ready"
    assert final_payload["summary"]["wasteStreamsFound"] == 1
    assert final_payload["summary"]["draftsNeedingConfirmation"] == 1


@pytest.mark.asyncio
async def test_org_scoped_discovery_audio_start_keeps_nullable_scope_fields(
    client: AsyncClient, db_session, set_current_user, monkeypatch
) -> None:
    org = await create_org(db_session, "Discovery Phase3 Audio Org", "discovery-phase3-audio-org")
    user = await create_user(
        db_session,
        email=f"discovery-phase3-audio-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Phase3 Audio Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Discovery Phase3 Audio Plant",
    )
    set_current_user(user)

    async def _fake_upload(_stream, _storage_key: str, _content_type: str | None) -> str:
        return "ok"

    monkeypatch.setattr(discovery_service_module, "upload_file_to_s3", _fake_upload)

    create_response = await client.post(
        "/api/v1/discovery-sessions",
        json={
            "companyId": str(company.id),
            "locationId": str(location.id),
        },
    )
    assert create_response.status_code == 201
    payload = create_response.json()
    assert payload["companyId"] is None
    assert payload["locationId"] is None
    session_id = payload["id"]

    audio_response = await client.post(
        f"/api/v1/discovery-sessions/{session_id}/audio",
        files={"audio_file": ("clip.wav", b"fake-audio", "audio/wav")},
    )
    assert audio_response.status_code == 201

    start_response = await client.post(f"/api/v1/discovery-sessions/{session_id}/start")
    assert start_response.status_code == 200
    source_payload = start_response.json()["sources"][0]
    run_id = source_payload["importRunId"]
    voice_id = source_payload["voiceInterviewId"]
    assert run_id is not None
    assert voice_id is not None

    run = await db_session.get(ImportRun, run_id)
    voice = await db_session.get(VoiceInterview, voice_id)
    assert run is not None
    assert voice is not None
    assert run.entrypoint_type == "organization"
    assert run.entrypoint_id == org.id
    assert voice.company_id is None
    assert voice.location_id is None


@pytest.mark.asyncio
async def test_org_scope_confirm_only_keeps_pending_sibling_blocked_from_finalize_subset(
    client: AsyncClient, db_session, set_current_user
) -> None:
    org = await create_org(db_session, "Discovery Phase3 Finalize Org", "discovery-phase3-finalize-org")
    user = await create_user(
        db_session,
        email=f"discovery-phase3-finalize-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Phase3 Finalize Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Discovery Phase3 Finalize Plant",
    )

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="organization",
        entrypoint_id=org.id,
        source_file_path="imports/discovery-phase3.csv",
        source_filename="discovery-phase3.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()

    session_id = uuid.uuid4()
    db_session.add(
        DiscoverySession(
            id=session_id,
            organization_id=org.id,
            company_id=None,
            location_id=None,
            status="review_ready",
            created_by_user_id=user.id,
            started_by_user_id=user.id,
        )
    )

    discovery_source = DiscoverySource(
        organization_id=org.id,
        session_id=session_id,
        source_type="file",
        status="review_ready",
        source_filename="discovery-phase3.csv",
        import_run_id=run.id,
    )
    db_session.add(discovery_source)

    resolved_draft = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="project",
        status="pending_review",
        group_id="group-resolved",
        normalized_data={
            "name": "Resolved Stream",
            "category": "paper",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "manufacturing",
            "estimated_volume": "2 tons/week",
        },
    )
    blocked_draft = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="project",
        status="pending_review",
        group_id="group-blocked",
        normalized_data={
            "name": "Blocked Stream",
            "category": "paper",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "manufacturing",
            "estimated_volume": "3 tons/week",
        },
    )
    db_session.add_all([resolved_draft, blocked_draft])
    await db_session.commit()

    set_current_user(user)

    confirm_response = await client.post(
        f"/api/v1/bulk-import/items/{resolved_draft.id}/discovery-decision",
        json={
            "action": "confirm",
            "normalizedData": {
                "name": "Resolved Stream",
                "category": "paper",
                "project_type": "Assessment",
                "description": "desc",
                "sector": "industrial",
                "subsector": "manufacturing",
                "estimated_volume": "2 tons/week",
            },
            "companyResolution": {
                "mode": "existing",
                "companyId": str(company.id),
            },
            "locationResolution": {
                "mode": "existing",
                "locationId": str(location.id),
            },
        },
    )
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "review_ready"

    blocked_finalize = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        json={
            "resolved_group_ids": ["group-blocked"],
            "idempotency_key": f"idem-{uuid.uuid4().hex}",
        },
    )
    assert blocked_finalize.status_code == 409
    assert "Requested groups are unresolved" in blocked_finalize.json()["error"]["message"]

    await db_session.refresh(run)
    await db_session.refresh(blocked_draft)
    assert run.status == "review_ready"
    assert blocked_draft.created_project_id is None
    assert blocked_draft.status == "pending_review"
