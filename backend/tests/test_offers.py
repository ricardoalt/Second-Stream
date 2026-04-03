import uuid
from datetime import UTC, datetime, timedelta

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient

import app.agents.proposal_agent as legacy_proposal_agent
from app.models.file import ProjectFile
from app.models.offer_insights_output import OfferInsightsOutput
from app.models.user import UserRole


def _project_data_dict(project) -> dict[str, object]:
    data = project.project_data
    if not isinstance(data, dict):
        raise AssertionError("project_data must be a dict")
    return data


@pytest.mark.asyncio
async def test_offer_detail_returns_offer_v1_contract(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Detail", f"org-offer-detail-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Detail Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Offer Detail Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Detail Project",
    )
    generated_at = datetime.now(UTC) - timedelta(minutes=10)
    workspace_updated_at = datetime.now(UTC) - timedelta(minutes=20)
    project.project_data = {
        "workspace_v1": {"updated_at": workspace_updated_at.isoformat()},
        "offer_v1": {
            "insights": {
                "summary": "Offer baseline validated with discovery evidence.",
                "key_points": ["Material profile confirmed"],
                "risks": ["Pending compliance annex"],
                "recommendations": ["Confirm legal review timeline"],
            },
            "freshness": {
                "generated_at": generated_at.isoformat(),
                "source_updated_at": workspace_updated_at.isoformat(),
            },
        },
    }
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/offer")

    assert response.status_code == 200
    payload = response.json()
    assert payload["projectId"] == str(project.id)
    assert payload["streamSnapshot"] == {
        "materialType": None,
        "materialName": None,
        "composition": None,
        "volume": None,
        "frequency": None,
    }
    assert payload["insights"]["summary"] == "Offer baseline validated with discovery evidence."
    assert payload["insights"]["freshness"]["isStale"] is False


@pytest.mark.asyncio
async def test_offer_detail_returns_workspace_stream_snapshot(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Snapshot", f"org-offer-snapshot-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-snapshot-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Snapshot Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Snapshot Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Snapshot Project",
    )
    project.project_data = {
        "workspace_v1": {
            "base_fields": {
                "material_type": "Plastic film",
                "material_name": "LDPE trim",
                "composition": "95% LDPE",
                "volume": "12 tons/month",
                "frequency": "Daily",
            }
        }
    }
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/offer")

    assert response.status_code == 200
    payload = response.json()
    assert payload["streamSnapshot"] == {
        "materialType": "Plastic film",
        "materialName": "LDPE trim",
        "composition": "95% LDPE",
        "volume": "12 tons/month",
        "frequency": "Daily",
    }


@pytest.mark.asyncio
async def test_offer_detail_marks_stale_when_workspace_changes(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Stale", f"org-offer-stale-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-stale-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Stale Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Stale Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Stale Project",
    )
    generated_at = datetime.now(UTC) - timedelta(hours=2)
    workspace_updated_at = datetime.now(UTC) - timedelta(minutes=5)
    project.project_data = {
        "workspace_v1": {"updated_at": workspace_updated_at.isoformat()},
        "offer_v1": {
            "insights": {
                "summary": "Old summary",
                "key_points": [],
                "risks": [],
                "recommendations": [],
            },
            "freshness": {
                "generated_at": generated_at.isoformat(),
                "source_updated_at": generated_at.isoformat(),
            },
        },
    }
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/offer")

    assert response.status_code == 200
    payload = response.json()
    assert payload["insights"]["freshness"]["isStale"] is True


@pytest.mark.asyncio
async def test_offer_detail_ignores_offer_document_updates_for_staleness(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Doc", f"org-offer-doc-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-doc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Doc Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Offer Doc Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Doc Project",
    )
    workspace_updated_at = datetime.now(UTC) - timedelta(hours=1)
    generated_at = datetime.now(UTC) - timedelta(minutes=10)
    project.project_data = {
        "workspace_v1": {"updated_at": workspace_updated_at.isoformat()},
        "offer_v1": {
            "insights": {
                "summary": "Current summary",
                "key_points": ["Key point"],
                "risks": ["Risk"],
                "recommendations": ["Recommendation"],
            },
            "freshness": {
                "generated_at": generated_at.isoformat(),
                "source_updated_at": workspace_updated_at.isoformat(),
            },
        },
    }
    offer_doc = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="offer.pdf",
        file_path="projects/test/offer.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="offer_document",
        processing_status="completed",
        processing_attempts=1,
        uploaded_by=user.id,
    )
    db_session.add(offer_doc)
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/offer")

    assert response.status_code == 200
    payload = response.json()
    assert payload["insights"]["freshness"]["isStale"] is False
    assert payload["offerDocument"]["fileId"] == str(offer_doc.id)


@pytest.mark.asyncio
async def test_offer_refresh_endpoint_regenerates_and_persists_insights(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Refresh", f"org-offer-refresh-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-refresh-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Refresh Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Offer Refresh Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Refresh Project",
    )
    project.project_data = {
        "workspace_v1": {
            "updated_at": datetime.now(UTC).isoformat(),
            "base_fields": {
                "material_type": "Plastic film",
                "material_name": "LDPE trim",
                "composition": "95% LDPE",
                "volume": "12 tons/month",
                "frequency": "Daily",
            },
        },
        "offer_v1": {},
    }
    await db_session.commit()

    async def _fake_offer_analysis(*_args, **_kwargs):
        from app.models.offer_insights_output import OfferInsightsOutput

        return OfferInsightsOutput(
            summary="Fresh insights from workspace evidence.",
            key_points=["Volume profile available"],
            risks=["Permit annex pending"],
            recommendations=["Confirm legal annex before approval"],
        )

    monkeypatch.setattr(
        "app.agents.offer_insights_agent.analyze_offer_insights",
        _fake_offer_analysis,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/offer/refresh-insights")

    assert response.status_code == 200
    payload = response.json()
    assert payload["insights"]["summary"] == "Fresh insights from workspace evidence."
    assert payload["insights"]["freshness"]["isStale"] is False

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    offer_data = project_data.get("offer_v1")
    assert isinstance(offer_data, dict)
    assert offer_data["insights"]["summary"] == "Fresh insights from workspace evidence."


@pytest.mark.asyncio
async def test_offer_refresh_evidence_excludes_offer_document_files(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Evidence", f"org-offer-evidence-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-evidence-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Evidence Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Offer Evidence Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Evidence Project",
    )
    project.project_data = {
        "workspace_v1": {
            "updated_at": datetime.now(UTC).isoformat(),
            "base_fields": {
                "material_type": "Plastic film",
                "material_name": "LDPE trim",
            },
        }
    }
    db_session.add(
        ProjectFile(
            organization_id=org.id,
            project_id=project.id,
            filename="analysis.pdf",
            file_path="projects/test/analysis.pdf",
            file_size=512,
            mime_type="application/pdf",
            file_type="pdf",
            category="analysis",
            processing_status="completed",
            processing_attempts=1,
            uploaded_by=user.id,
            ai_analysis={"summary": "Lab analysis summary"},
        )
    )
    db_session.add(
        ProjectFile(
            organization_id=org.id,
            project_id=project.id,
            filename="offer.pdf",
            file_path="projects/test/offer.pdf",
            file_size=1024,
            mime_type="application/pdf",
            file_type="pdf",
            category="offer_document",
            processing_status="completed",
            processing_attempts=1,
            uploaded_by=user.id,
        )
    )
    await db_session.commit()

    captured: dict[str, str] = {"evidence_payload": ""}

    async def _capture_offer_analysis(*_args, **kwargs):
        captured["evidence_payload"] = kwargs["evidence_payload"]
        return OfferInsightsOutput(
            summary="Evidence built from discovery sources only.",
            key_points=["Discovery file included"],
            risks=[],
            recommendations=[],
        )

    monkeypatch.setattr(
        "app.agents.offer_insights_agent.analyze_offer_insights",
        _capture_offer_analysis,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/offer/refresh-insights")

    assert response.status_code == 200
    assert "analysis.pdf" in captured["evidence_payload"]
    assert "offer.pdf" not in captured["evidence_payload"]
    assert "[offer_document]" not in captured["evidence_payload"]


@pytest.mark.asyncio
async def test_offer_refresh_does_not_use_legacy_proposal_agent_path(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Agent Path", f"org-offer-agent-path-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-agent-path-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Agent Path Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Offer Agent Path Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Agent Path Project",
    )
    project.project_data = {
        "workspace_v1": {
            "updated_at": datetime.now(UTC).isoformat(),
            "base_fields": {
                "material_type": "Paper",
                "material_name": "Mixed fiber",
            },
        }
    }
    await db_session.commit()

    async def _should_not_call(*_args, **_kwargs):
        raise AssertionError("legacy proposal agent path must not be used for offer refresh")

    monkeypatch.setattr(legacy_proposal_agent, "generate_proposal", _should_not_call)
    monkeypatch.setattr(legacy_proposal_agent, "generate_enhanced_proposal", _should_not_call)

    async def _fake_offer_analysis(*_args, **_kwargs):
        return OfferInsightsOutput(
            summary="Offer insights generated with dedicated offer agent.",
            key_points=["Dedicated offer path used"],
            risks=[],
            recommendations=[],
        )

    monkeypatch.setattr(
        "app.agents.offer_insights_agent.analyze_offer_insights",
        _fake_offer_analysis,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/offer/refresh-insights")

    assert response.status_code == 200
    assert response.json()["insights"]["summary"] == "Offer insights generated with dedicated offer agent."


@pytest.mark.asyncio
async def test_offer_detail_returns_null_insights_when_offer_v1_is_missing(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Missing Insights", f"org-offer-null-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-null-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Null Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Offer Null Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Null Project",
    )
    project.project_data = {
        "workspace_v1": {
            "base_fields": {
                "material_type": "  Plastic film  ",
                "material_name": " ",
            }
        }
    }
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/offer")

    assert response.status_code == 200
    payload = response.json()
    assert payload["insights"] is None
    assert payload["offerDocument"] is None
    assert payload["streamSnapshot"]["materialType"] == "Plastic film"
    assert payload["streamSnapshot"]["materialName"] is None


@pytest.mark.asyncio
async def test_offer_refresh_returns_502_when_offer_agent_fails(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    from app.agents.offer_insights_agent import OfferInsightsError

    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Refresh Fails", f"org-offer-fail-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-fail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Fail Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Offer Fail Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Fail Project",
    )
    project.project_data = {"workspace_v1": {"updated_at": datetime.now(UTC).isoformat()}}
    await db_session.commit()

    async def _raise_offer_error(*_args, **_kwargs):
        raise OfferInsightsError("boom")

    monkeypatch.setattr(
        "app.agents.offer_insights_agent.analyze_offer_insights",
        _raise_offer_error,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/offer/refresh-insights")

    assert response.status_code == 502
    payload = response.json()
    assert payload["detail"]["message"] == "Offer insights generation failed"
    assert payload["detail"]["code"] == "OFFER_INSIGHTS_GENERATION_FAILED"
