import copy
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from conftest import (
    create_company,
    create_location,
    create_org,
    create_project,
    create_user,
)
from httpx import AsyncClient
from sqlalchemy import select

from app.api.v1.projects import _count_dashboard_rows, _count_dashboard_rows_split
from app.models.bulk_import import ImportItem, ImportRun
from app.models.discovery_session import DiscoverySource
from app.models.intake_suggestion import IntakeSuggestion
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.timeline import TimelineEvent
from app.models.user import UserRole
from app.services.project_data_service import ProjectDataService
from app.templates.assessment_questionnaire import get_assessment_questionnaire


def _questionnaire_with_completion(completed_fields: int) -> list[dict[str, object]]:
    questionnaire = copy.deepcopy(get_assessment_questionnaire())
    filled = 0
    for section in questionnaire:
        fields = section.get("fields", [])
        if not isinstance(fields, list):
            continue
        for field in fields:
            if not isinstance(field, dict):
                continue
            if filled >= completed_fields:
                return questionnaire
            if isinstance(field.get("value"), list):
                field["value"] = ["filled"]
            else:
                field["value"] = f"value-{filled}"
            filled += 1
    return questionnaire


def _set_project_completion(project: Project, completed_fields: int) -> None:
    sections = _questionnaire_with_completion(completed_fields)
    project.project_data = {"technical_sections": sections}
    project.progress = ProjectDataService.calculate_progress(sections)


async def _attach_discovery_source(db_session, *, run: ImportRun, source_type: str = "file"):
    source = DiscoverySource(
        organization_id=run.organization_id,
        session_id=uuid.uuid4(),
        source_type=source_type,
        status="review_ready",
        import_run_id=run.id,
    )
    db_session.add(source)
    await db_session.flush()
    return source


def _questionnaire_with_field_values(
    values_by_field_id: dict[str, object],
) -> list[dict[str, object]]:
    questionnaire = copy.deepcopy(get_assessment_questionnaire())
    for section in questionnaire:
        fields = section.get("fields", [])
        if not isinstance(fields, list):
            continue
        for field in fields:
            if not isinstance(field, dict):
                continue
            field_id = field.get("id")
            if isinstance(field_id, str) and field_id in values_by_field_id:
                field["value"] = values_by_field_id[field_id]
    return questionnaire


async def _create_pending_suggestion(
    db_session, *, org_id, project_id, user_id
) -> IntakeSuggestion:
    suggestion = IntakeSuggestion(
        organization_id=org_id,
        project_id=project_id,
        source_file_id=None,
        field_id="waste-types",
        field_label="Type of Waste Generated",
        section_id="waste-generation",
        section_title="1. Waste Generation Details",
        value="PET",
        value_type="string",
        unit=None,
        confidence=88,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user_id,
    )
    db_session.add(suggestion)
    await db_session.commit()
    await db_session.refresh(suggestion)
    return suggestion


async def _create_proposal_record(
    db_session,
    *,
    org_id,
    project_id,
    title: str = "Proposal",
) -> Proposal:
    proposal = Proposal(
        organization_id=org_id,
        project_id=project_id,
        version="v1.0",
        title=title,
        proposal_type="Technical",
        status="Current",
        ai_metadata={"proposal": {"headline": "ok"}},
    )
    db_session.add(proposal)
    await db_session.commit()
    await db_session.refresh(proposal)
    return proposal


@pytest.mark.asyncio
async def test_list_projects_empty(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Empty Proj", "org-empty-proj")
    user = await create_user(
        db_session,
        email=f"empty-proj-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_projects_paginated(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Paginated", "org-paginated")
    user = await create_user(
        db_session,
        email=f"paginated-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Pag Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Pag Loc"
    )
    for i in range(15):
        await create_project(
            db_session,
            org_id=org.id,
            user_id=user.id,
            location_id=location.id,
            name=f"Project {i}",
        )

    set_current_user(user)
    response = await client.get("/api/v1/projects?page=1&size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 15
    assert len(data["items"]) == 10
    assert data["pages"] == 2

    response2 = await client.get("/api/v1/projects?page=2&size=10")
    data2 = response2.json()
    assert len(data2["items"]) == 5


@pytest.mark.asyncio
async def test_list_projects_search(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Search", "org-search")
    user = await create_user(
        db_session,
        email=f"search-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Search Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Search Loc"
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Alpha Project",
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Beta Project",
    )

    set_current_user(user)
    response = await client.get("/api/v1/projects?search=Alpha")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Alpha Project"


@pytest.mark.asyncio
async def test_list_projects_status_filter(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Status Filter", "org-status-filter")
    user = await create_user(
        db_session,
        email=f"status-filter-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Status Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Status Loc"
    )
    p1 = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Active Project",
    )
    p1.status = "Active"
    await db_session.commit()

    p2 = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Completed Project",
    )
    p2.status = "Completed"
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects?status=Active")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Active Project"


@pytest.mark.asyncio
async def test_create_project_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Proj", "org-create-proj")
    user = await create_user(
        db_session,
        email=f"create-proj-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Create Proj Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Create Proj Loc"
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "New Project",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Project"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_project_invalid_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Invalid Loc", "org-invalid-loc")
    user = await create_user(
        db_session,
        email=f"invalid-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    fake_location_id = uuid.uuid4()
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(fake_location_id),
            "name": "Bad Project",
        },
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_project_owner_override_for_org_admin(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Owner Override", "org-create-owner-override")
    org_admin = await create_user(
        db_session,
        email=f"owner-override-admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    field_agent = await create_user(
        db_session,
        email=f"owner-override-agent-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Create Owner Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Create Owner Loc"
    )

    set_current_user(org_admin)
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "Owner Override Project",
            "owner_user_id": str(field_agent.id),
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["userId"] == str(field_agent.id)


@pytest.mark.asyncio
async def test_create_project_owner_override_forbidden_for_field_agent(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Owner Forbidden", "org-create-owner-forbidden")
    field_agent = await create_user(
        db_session,
        email=f"owner-forbidden-agent-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other_field_agent = await create_user(
        db_session,
        email=f"owner-forbidden-other-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Create Owner Forbidden Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Create Owner Forbidden Loc"
    )

    set_current_user(field_agent)
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "Forbidden Owner Override Project",
            "owner_user_id": str(other_field_agent.id),
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_project_owner_override_rejects_invalid_owner_scope_status_or_role(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Create Owner Invalid",
        "org-create-owner-invalid",
    )
    other_org = await create_org(
        db_session,
        "Org Create Owner Invalid Other",
        "org-create-owner-invalid-other",
    )
    org_admin = await create_user(
        db_session,
        email=f"owner-invalid-admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    cross_org_user = await create_user(
        db_session,
        email=f"owner-invalid-cross-{uid}@example.com",
        org_id=other_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    inactive_user = await create_user(
        db_session,
        email=f"owner-invalid-inactive-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    inactive_user.is_active = False
    disallowed_role_user = await create_user(
        db_session,
        email=f"owner-invalid-role-{uid}@example.com",
        org_id=org.id,
        role=UserRole.SALES.value,
        is_superuser=False,
    )
    await db_session.commit()

    company = await create_company(db_session, org_id=org.id, name="Create Owner Invalid Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Create Owner Invalid Loc"
    )

    set_current_user(org_admin)

    cross_org_response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "Cross Org Owner",
            "owner_user_id": str(cross_org_user.id),
        },
    )
    assert cross_org_response.status_code == 409

    inactive_response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "Inactive Owner",
            "owner_user_id": str(inactive_user.id),
        },
    )
    assert inactive_response.status_code == 409

    disallowed_role_response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "Disallowed Role Owner",
            "owner_user_id": str(disallowed_role_user.id),
        },
    )
    assert disallowed_role_response.status_code == 409


@pytest.mark.asyncio
async def test_get_project_detail(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Proj Detail", "org-proj-detail")
    user = await create_user(
        db_session,
        email=f"proj-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Detail Proj Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Detail Proj Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Detail Project",
    )

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Project"
    assert data["id"] == str(project.id)


@pytest.mark.asyncio
async def test_get_project_detail_limits_timeline_to_latest_ten(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Proj Detail Timeline", "org-proj-detail-timeline")
    user = await create_user(
        db_session,
        email=f"proj-detail-timeline-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Detail Timeline Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Detail Timeline Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Detail Timeline Project",
    )

    now = datetime.now(UTC)
    for i in range(12):
        db_session.add(
            TimelineEvent(
                organization_id=org.id,
                project_id=project.id,
                event_type="project_updated",
                title=f"Event {i:02d}",
                description=f"Event description {i:02d}",
                actor=user.email,
                event_metadata={"index": i},
                created_at=now - timedelta(minutes=i),
            )
        )
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["timeline"]) == 10
    assert data["timeline"][0]["title"] == "Event 00"
    assert data["timeline"][9]["title"] == "Event 09"


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Proj", "org-update-proj")
    user = await create_user(
        db_session,
        email=f"update-proj-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Proj Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Update Proj Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Old Project Name",
    )

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}",
        json={"name": "Updated Project Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Project Name"


@pytest.mark.asyncio
async def test_dashboard_counts_and_rows_are_consistent(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Dashboard", "org-dashboard")
    user = await create_user(
        db_session,
        email=f"dashboard-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Dashboard Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="North Plant"
    )

    needs_confirmation = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Needs Confirmation Stream",
    )
    await _create_pending_suggestion(
        db_session,
        org_id=org.id,
        project_id=needs_confirmation.id,
        user_id=user.id,
    )

    missing_information = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Missing Info Stream",
    )
    _set_project_completion(missing_information, 4)

    intelligence_report = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Intelligence Ready Stream",
    )
    _set_project_completion(intelligence_report, 16)

    proposal_stream = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Proposal Stream",
    )
    _set_project_completion(proposal_stream, 16)
    proposal_stream.proposal_follow_up_state = "waiting_response"
    await _create_proposal_record(db_session, org_id=org.id, project_id=proposal_stream.id)
    await db_session.commit()

    set_current_user(user)

    response = await client.get("/api/v1/projects/dashboard?bucket=missing_information")
    assert response.status_code == 200
    payload = response.json()

    assert payload["counts"]["total"] == 4
    assert payload["counts"]["needsConfirmation"] == 0
    assert payload["counts"]["missingInformation"] == 2
    assert payload["counts"]["intelligenceReport"] == 1
    assert payload["counts"]["proposal"] == 1
    assert payload["total"] == 2
    assert [item["streamName"] for item in payload["items"]] == [
        "Needs Confirmation Stream",
        "Missing Info Stream",
    ]
    items_by_name = {item["streamName"]: item for item in payload["items"]}
    needs_confirmation_row = items_by_name["Needs Confirmation Stream"]
    assert needs_confirmation_row["kind"] == "persisted_stream"
    assert needs_confirmation_row["bucket"] == "missing_information"
    assert needs_confirmation_row["canEditProposalFollowUp"] is True
    assert needs_confirmation_row["pendingConfirmation"] is True
    assert needs_confirmation_row["missingRequiredInfo"] is True
    assert needs_confirmation_row["missingFields"] == [
        "Existing Waste Handling Practices (select all that apply)",
        "What are your primary objectives? (select all that apply)",
        "Timeframe for implementation",
    ]
    missing_info_row = items_by_name["Missing Info Stream"]
    assert missing_info_row["kind"] == "persisted_stream"
    assert missing_info_row["bucket"] == "missing_information"


@pytest.mark.asyncio
async def test_dashboard_workspace_completion_flag_routes_low_completion_to_intelligence_report(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session, "Org Dashboard Workspace Flag", "org-dashboard-workspace-flag"
    )
    user = await create_user(
        db_session,
        email=f"dashboard-workspace-flag-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Flag Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Flag Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Flag Stream",
    )
    _set_project_completion(project, 3)
    project_data = project.project_data if isinstance(project.project_data, dict) else {}
    project_data["workspace_v1"] = {"discovery_completed_at": "2026-03-19T12:00:00Z"}
    project.project_data = project_data
    await db_session.commit()

    set_current_user(user)

    intelligence_response = await client.get(
        "/api/v1/projects/dashboard?bucket=intelligence_report"
    )
    assert intelligence_response.status_code == 200
    intelligence_payload = intelligence_response.json()
    assert intelligence_payload["counts"]["intelligenceReport"] == 1
    assert [item["streamName"] for item in intelligence_payload["items"]] == [
        "Workspace Flag Stream"
    ]


@pytest.mark.asyncio
async def test_dashboard_proposal_bucket_overrides_workspace_completion_flag(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Dashboard Workspace Flag Proposal",
        "org-dashboard-workspace-flag-proposal",
    )
    user = await create_user(
        db_session,
        email=f"dashboard-workspace-flag-proposal-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Flag Proposal Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Flag Proposal Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Flag Proposal Stream",
    )
    _set_project_completion(project, 3)
    project_data = project.project_data if isinstance(project.project_data, dict) else {}
    project_data["workspace_v1"] = {"discovery_completed_at": "2026-03-19T12:00:00Z"}
    project.project_data = project_data
    await _create_proposal_record(db_session, org_id=org.id, project_id=project.id)
    await db_session.commit()

    set_current_user(user)

    proposal_response = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert proposal_response.status_code == 200
    proposal_payload = proposal_response.json()
    assert proposal_payload["counts"]["proposal"] == 1
    assert [item["streamName"] for item in proposal_payload["items"]] == [
        "Workspace Flag Proposal Stream"
    ]

    intelligence_response = await client.get(
        "/api/v1/projects/dashboard?bucket=intelligence_report"
    )
    assert intelligence_response.status_code == 200
    intelligence_payload = intelligence_response.json()
    assert intelligence_payload["counts"]["intelligenceReport"] == 0
    assert intelligence_payload["items"] == []


@pytest.mark.asyncio
async def test_dashboard_needs_confirmation_classifies_draft_kinds(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Draft Kinds", "org-draft-kinds")
    user = await create_user(
        db_session,
        email=f"draft-kinds-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Draft Kinds Co")

    run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/drafts.csv",
        source_filename="drafts.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    db_session.add(run)
    await db_session.flush()
    await _attach_discovery_source(db_session, run=run, source_type="file")

    linked_location = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="pending_review",
        group_id="grp-linked",
        normalized_data={
            "name": "North Plant",
            "city": "Monterrey",
            "state": "Nuevo Leon",
            "address": "",
        },
    )
    db_session.add(linked_location)
    await db_session.flush()

    linked_project = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="project",
        status="pending_review",
        parent_item_id=linked_location.id,
        group_id="grp-linked",
        normalized_data={
            "name": "PET Flakes",
            "category": "plastics",
            "project_type": "Assessment",
            "description": "",
            "sector": "industrial",
            "subsector": "other",
            "estimated_volume": "1 ton/month",
        },
    )
    orphan_project = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="project",
        status="pending_review",
        group_id="grp-orphan",
        review_notes="Project row missing location context",
        normalized_data={
            "name": "Loose Cardboard",
            "category": "paper",
            "project_type": "Assessment",
            "description": "",
            "sector": "industrial",
            "subsector": "other",
            "estimated_volume": "",
        },
    )
    location_only = ImportItem(
        organization_id=org.id,
        run_id=run.id,
        item_type="location",
        status="pending_review",
        group_id="grp-location-only",
        normalized_data={
            "name": "South Plant",
            "city": "Guadalajara",
            "state": "Jalisco",
            "address": "",
        },
    )
    db_session.add_all([linked_project, orphan_project, location_only])
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/dashboard?bucket=needs_confirmation")
    assert response.status_code == 200
    payload = response.json()

    assert payload["total"] == 2
    assert payload["counts"]["needsConfirmation"] == 2
    assert payload["counts"]["total"] == 2
    assert len(payload["items"]) == 2
    assert payload["secondaryDraftRows"] == []

    rows_by_name = {row["streamName"]: row for row in payload["items"]}

    linked_row = rows_by_name["PET Flakes"]
    assert linked_row["draftKind"] == "linked"
    assert linked_row["confirmable"] is True
    assert linked_row["target"] is not None
    assert linked_row["groupId"] == "grp-linked"
    assert linked_row["locationLabel"] == "North Plant"

    orphan_row = rows_by_name["Loose Cardboard"]
    assert orphan_row["draftKind"] == "orphan_stream"
    assert orphan_row["confirmable"] is True
    assert orphan_row["target"] is not None
    assert orphan_row["groupId"] == "grp-orphan"
    assert orphan_row["locationLabel"] is None

    total_bucket_response = await client.get("/api/v1/projects/dashboard?bucket=total")
    assert total_bucket_response.status_code == 200
    total_payload = total_bucket_response.json()
    assert total_payload["counts"]["needsConfirmation"] == 2
    assert total_payload["counts"]["total"] == 2
    assert total_payload["draftPreview"]["total"] == 2
    preview_names = [item["streamName"] for item in total_payload["draftPreview"]["items"]]
    assert "South Plant" not in preview_names


@pytest.mark.asyncio
async def test_dashboard_hides_legacy_review_ready_runs_without_discovery_source(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Legacy Hidden", "org-legacy-hidden")
    user = await create_user(
        db_session,
        email=f"legacy-hidden-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Legacy Hidden Co")

    discovery_run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/discovery.csv",
        source_filename="discovery.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    legacy_run = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/legacy.csv",
        source_filename="legacy.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    db_session.add_all([discovery_run, legacy_run])
    await db_session.flush()
    await _attach_discovery_source(db_session, run=discovery_run, source_type="file")

    discovery_location = ImportItem(
        organization_id=org.id,
        run_id=discovery_run.id,
        item_type="location",
        status="pending_review",
        group_id="grp-discovery",
        normalized_data={
            "name": "Discovery Plant",
            "city": "Monterrey",
            "state": "Nuevo Leon",
            "address": "",
        },
    )
    legacy_location = ImportItem(
        organization_id=org.id,
        run_id=legacy_run.id,
        item_type="location",
        status="pending_review",
        group_id="grp-legacy",
        normalized_data={
            "name": "Legacy Plant",
            "city": "Monterrey",
            "state": "Nuevo Leon",
            "address": "",
        },
    )
    db_session.add_all([discovery_location, legacy_location])
    await db_session.flush()

    db_session.add_all(
        [
            ImportItem(
                organization_id=org.id,
                run_id=discovery_run.id,
                item_type="project",
                status="pending_review",
                parent_item_id=discovery_location.id,
                group_id="grp-discovery",
                normalized_data={
                    "name": "Discovery PET",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "industrial",
                    "subsector": "other",
                    "estimated_volume": "",
                },
            ),
            ImportItem(
                organization_id=org.id,
                run_id=legacy_run.id,
                item_type="project",
                status="pending_review",
                parent_item_id=legacy_location.id,
                group_id="grp-legacy",
                normalized_data={
                    "name": "Legacy PET",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "industrial",
                    "subsector": "other",
                    "estimated_volume": "",
                },
            ),
        ]
    )
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/dashboard?bucket=needs_confirmation")
    assert response.status_code == 200
    payload = response.json()

    assert payload["counts"]["needsConfirmation"] == 1
    assert payload["counts"]["total"] == 1
    assert payload["total"] == 1
    assert [row["streamName"] for row in payload["items"]] == ["Discovery PET"]

    total_response = await client.get("/api/v1/projects/dashboard?bucket=total")
    assert total_response.status_code == 200
    total_payload = total_response.json()
    assert total_payload["counts"]["needsConfirmation"] == 1
    assert total_payload["counts"]["total"] == 1
    assert total_payload["draftPreview"]["total"] == 1
    assert [row["streamName"] for row in total_payload["draftPreview"]["items"]] == [
        "Discovery PET"
    ]


@pytest.mark.asyncio
async def test_dashboard_needs_confirmation_can_filter_by_discovery_session_id(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Draft Session Filter", "org-draft-session-filter")
    user = await create_user(
        db_session,
        email=f"draft-session-filter-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Draft Session Filter Co")

    run_a = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/session-a.csv",
        source_filename="session-a.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    run_b = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/session-b.csv",
        source_filename="session-b.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    db_session.add_all([run_a, run_b])
    await db_session.flush()
    source_a = await _attach_discovery_source(db_session, run=run_a, source_type="file")
    await _attach_discovery_source(db_session, run=run_b, source_type="file")

    draft_a = ImportItem(
        organization_id=org.id,
        run_id=run_a.id,
        item_type="project",
        status="pending_review",
        group_id="grp-session-a",
        normalized_data={
            "name": "Session A Draft",
            "category": "plastics",
            "project_type": "Assessment",
        },
    )
    draft_b = ImportItem(
        organization_id=org.id,
        run_id=run_b.id,
        item_type="project",
        status="pending_review",
        group_id="grp-session-b",
        normalized_data={
            "name": "Session B Draft",
            "category": "paper",
            "project_type": "Assessment",
        },
    )
    db_session.add_all([draft_a, draft_b])
    await db_session.commit()

    set_current_user(user)

    response = await client.get(
        "/api/v1/projects/dashboard?bucket=needs_confirmation"
        f"&discovery_session_id={source_a.session_id}"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["counts"]["needsConfirmation"] == 1
    assert [item["streamName"] for item in payload["items"]] == ["Session A Draft"]


@pytest.mark.asyncio
async def test_dashboard_needs_confirmation_without_session_filter_is_org_global(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Draft Session Global", "org-draft-session-global")
    user = await create_user(
        db_session,
        email=f"draft-session-global-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Draft Session Global Co")

    run_a = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/global-a.csv",
        source_filename="global-a.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    run_b = ImportRun(
        organization_id=org.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        source_file_path="imports/global-b.csv",
        source_filename="global-b.csv",
        source_type="bulk_import",
        status="review_ready",
        created_by_user_id=user.id,
    )
    db_session.add_all([run_a, run_b])
    await db_session.flush()
    await _attach_discovery_source(db_session, run=run_a, source_type="file")
    await _attach_discovery_source(db_session, run=run_b, source_type="file")

    draft_a = ImportItem(
        organization_id=org.id,
        run_id=run_a.id,
        item_type="project",
        status="pending_review",
        group_id="grp-global-a",
        normalized_data={
            "name": "Global A Draft",
            "category": "plastics",
            "project_type": "Assessment",
        },
    )
    draft_b = ImportItem(
        organization_id=org.id,
        run_id=run_b.id,
        item_type="project",
        status="pending_review",
        group_id="grp-global-b",
        normalized_data={
            "name": "Global B Draft",
            "category": "paper",
            "project_type": "Assessment",
        },
    )
    db_session.add_all([draft_a, draft_b])
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/dashboard?bucket=needs_confirmation")
    assert response.status_code == 200
    payload = response.json()
    assert payload["counts"]["needsConfirmation"] == 2
    assert sorted(item["streamName"] for item in payload["items"]) == [
        "Global A Draft",
        "Global B Draft",
    ]


@pytest.mark.asyncio
async def test_dashboard_persisted_pending_confirmation_no_longer_counts_as_needs_confirmation(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Persisted Pending", "org-persisted-pending")
    user = await create_user(
        db_session,
        email=f"persisted-pending-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Persisted Pending Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Persisted Pending Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Persisted Pending Stream",
    )
    await _create_pending_suggestion(
        db_session,
        org_id=org.id,
        project_id=project.id,
        user_id=user.id,
    )
    await db_session.commit()

    set_current_user(user)

    needs_confirmation_response = await client.get(
        "/api/v1/projects/dashboard?bucket=needs_confirmation"
    )
    assert needs_confirmation_response.status_code == 200
    needs_confirmation_payload = needs_confirmation_response.json()
    assert needs_confirmation_payload["counts"]["needsConfirmation"] == 0
    assert needs_confirmation_payload["total"] == 0
    assert needs_confirmation_payload["items"] == []

    missing_information_response = await client.get(
        "/api/v1/projects/dashboard?bucket=missing_information"
    )
    assert missing_information_response.status_code == 200
    missing_information_payload = missing_information_response.json()
    assert missing_information_payload["counts"]["needsConfirmation"] == 0
    assert missing_information_payload["counts"]["missingInformation"] == 1
    assert [item["streamName"] for item in missing_information_payload["items"]] == [
        "Persisted Pending Stream"
    ]


@pytest.mark.asyncio
async def test_dashboard_archived_filter_excludes_drafts_and_only_returns_archived_streams(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Archived Dashboard", "org-archived-dashboard")
    user = await create_user(
        db_session,
        email=f"dashboard-archived-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Archived Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Archive Loc"
    )
    archived_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Archived Stream",
    )
    archived_project.archived_at = datetime.now(UTC)
    _set_project_completion(archived_project, 16)
    await db_session.commit()

    set_current_user(user)

    response = await client.get("/api/v1/projects/dashboard?archived=archived")
    assert response.status_code == 200
    payload = response.json()
    assert payload["counts"]["total"] == 1
    assert payload["counts"]["needsConfirmation"] == 0
    assert payload["counts"]["missingInformation"] == 0
    assert payload["counts"]["intelligenceReport"] == 1
    assert payload["counts"]["proposal"] == 0
    assert payload["total"] == 1
    assert payload["items"][0]["kind"] == "persisted_stream"
    assert payload["items"][0]["archivedAt"] is not None


@pytest.mark.asyncio
async def test_dashboard_proposal_follow_up_transition_writes_timeline(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Proposal Follow Up", "org-proposal-follow-up")
    user = await create_user(
        db_session,
        email=f"proposal-follow-up-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Proposal Follow Up Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Proposal Follow Up Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Proposal Follow Up Stream",
    )
    await _create_proposal_record(db_session, org_id=org.id, project_id=project.id)
    set_current_user(user)

    response = await client.patch(
        f"/api/v1/projects/{project.id}/proposal-follow-up-state",
        json={"state": "waiting_to_send"},
    )
    assert response.status_code == 200
    assert response.json()["proposalFollowUpState"] == "waiting_to_send"

    response = await client.patch(
        f"/api/v1/projects/{project.id}/proposal-follow-up-state",
        json={"state": "waiting_response"},
    )
    assert response.status_code == 200
    assert response.json()["proposalFollowUpState"] == "waiting_response"

    timeline_result = await db_session.execute(
        select(TimelineEvent)
        .where(TimelineEvent.project_id == project.id)
        .order_by(TimelineEvent.created_at.desc())
    )
    event = timeline_result.scalars().first()
    assert event is not None
    assert event.title == "Proposal follow-up updated"
    assert event.event_metadata["old_state"] == "waiting_to_send"
    assert event.event_metadata["new_state"] == "waiting_response"
    assert event.event_metadata["actor_user_id"] == str(user.id)
    assert event.actor == user.email


@pytest.mark.asyncio
async def test_dashboard_proposal_follow_up_transition_rejects_invalid_and_same_state(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session, "Org Proposal Follow Up Invalid", "org-proposal-follow-up-invalid"
    )
    user = await create_user(
        db_session,
        email=f"proposal-follow-up-invalid-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Proposal Invalid Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Proposal Invalid Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Proposal Invalid Stream",
    )
    await _create_proposal_record(db_session, org_id=org.id, project_id=project.id)
    await db_session.commit()

    set_current_user(user)

    same_state = await client.patch(
        f"/api/v1/projects/{project.id}/proposal-follow-up-state",
        json={"state": "uploaded"},
    )
    assert same_state.status_code == 409

    invalid = await client.patch(
        f"/api/v1/projects/{project.id}/proposal-follow-up-state",
        json={"state": "accepted"},
    )
    assert invalid.status_code == 409

    project_without_proposals = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Proposal Missing Stream",
    )
    project_without_proposals.proposal_follow_up_state = "uploaded"
    await db_session.commit()

    allowed_without_proposals = await client.patch(
        f"/api/v1/projects/{project_without_proposals.id}/proposal-follow-up-state",
        json={"state": "waiting_to_send"},
    )
    assert allowed_without_proposals.status_code == 200
    assert allowed_without_proposals.json()["proposalFollowUpState"] == "waiting_to_send"

    stored_without_proposals = await db_session.get(Project, project_without_proposals.id)
    assert stored_without_proposals is not None
    assert stored_without_proposals.proposal_follow_up_state == "waiting_to_send"

    stored = await db_session.get(Project, project.id)
    assert stored is not None
    assert stored.proposal_follow_up_state is None


@pytest.mark.asyncio
async def test_dashboard_total_includes_explicit_draft_preview_slice_and_implicit_uploaded_proposal_truth(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Dashboard Total Slice", "org-dashboard-total-slice")
    user = await create_user(
        db_session,
        email=f"dashboard-total-slice-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Dashboard Total Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Dashboard Total Loc"
    )
    persisted = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Persisted Total Stream",
    )
    _set_project_completion(persisted, 16)
    proposal_stream = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Implicit Uploaded Stream",
    )
    _set_project_completion(proposal_stream, 16)
    await _create_proposal_record(db_session, org_id=org.id, project_id=proposal_stream.id)
    await db_session.commit()

    set_current_user(user)

    response = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert response.status_code == 200
    proposal_payload = response.json()
    assert proposal_payload["counts"]["proposal"] == 1
    assert proposal_payload["items"][0]["streamName"] == "Implicit Uploaded Stream"
    assert proposal_payload["items"][0]["proposalFollowUpState"] == "uploaded"

    total_response = await client.get("/api/v1/projects/dashboard?bucket=total")
    assert total_response.status_code == 200
    total_payload = total_response.json()
    assert total_payload["draftPreview"] is not None
    assert total_payload["total"] == 2
    assert len(total_payload["items"]) == 2


@pytest.mark.asyncio
async def test_dashboard_persisted_rows_include_category_and_owner_visibility_rules(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Dashboard Owner Visibility", "org-dashboard-owner")
    owner = await create_user(
        db_session,
        email=f"dashboard-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    admin = await create_user(
        db_session,
        email=f"dashboard-admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Owner Visibility Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Owner Visibility Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        location_id=location.id,
        name="Category Stream",
    )
    sections = _questionnaire_with_field_values(
        {
            "waste-types": "",
            "current-practices": ["Recycling"],
            "primary-objectives": ["Reduce disposal costs"],
            "timeframe": "",
        }
    )
    project.project_data = {
        "technical_sections": sections,
        "bulk_import_category": "plastic_resin",
    }
    project.progress = ProjectDataService.calculate_progress(sections)
    await db_session.commit()

    set_current_user(admin)
    admin_response = await client.get("/api/v1/projects/dashboard?bucket=missing_information")
    assert admin_response.status_code == 200
    admin_item = admin_response.json()["items"][0]
    assert admin_item["wasteCategoryLabel"] == "Plastic Resin"
    assert admin_item["ownerDisplayName"] == owner.full_name
    assert admin_item["canEditProposalFollowUp"] is True
    assert admin_item["missingFields"] == [
        "Type of Waste Generated",
        "Timeframe for implementation",
    ]

    set_current_user(owner)
    owner_response = await client.get("/api/v1/projects/dashboard?bucket=missing_information")
    assert owner_response.status_code == 200
    owner_item = owner_response.json()["items"][0]
    assert owner_item["canEditProposalFollowUp"] is True
    assert owner_item["ownerDisplayName"] is None
    assert owner_item["missingRequiredInfo"] is True


@pytest.mark.asyncio
async def test_dashboard_persisted_rows_include_owner_id_and_queue_priority(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Dashboard Queue Priority", "org-dashboard-queue")
    owner = await create_user(
        db_session,
        email=f"dashboard-queue-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    admin = await create_user(
        db_session,
        email=f"dashboard-queue-admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Queue Priority Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Queue Priority Loc"
    )

    pending_confirmation_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        location_id=location.id,
        name="Queue Pending Confirmation",
    )
    _set_project_completion(pending_confirmation_project, 16)
    await _create_pending_suggestion(
        db_session,
        org_id=org.id,
        project_id=pending_confirmation_project.id,
        user_id=admin.id,
    )

    follow_up_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        location_id=location.id,
        name="Queue Waiting Response",
    )
    _set_project_completion(follow_up_project, 16)
    await _create_proposal_record(db_session, org_id=org.id, project_id=follow_up_project.id)
    follow_up_project.proposal_follow_up_state = "waiting_response"
    follow_up_project.updated_at = datetime.now(UTC) - timedelta(days=9)
    await db_session.commit()

    set_current_user(admin)
    response = await client.get("/api/v1/projects/dashboard?bucket=total&size=50")
    assert response.status_code == 200

    by_name = {item["streamName"]: item for item in response.json()["items"]}

    pending_item = by_name["Queue Pending Confirmation"]
    assert pending_item["ownerUserId"] == str(owner.id)
    assert pending_item["queuePriority"] == "critical"
    assert pending_item["queuePriorityReason"] == "pending_confirmation"

    waiting_item = by_name["Queue Waiting Response"]
    assert waiting_item["ownerUserId"] == str(owner.id)
    assert waiting_item["queuePriority"] == "high"
    assert waiting_item["queuePriorityReason"] == "stale_waiting_response"


@pytest.mark.asyncio
async def test_dashboard_can_edit_proposal_follow_up_is_false_for_read_only_owner(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session, "Org Dashboard Read Only Owner", "org-dashboard-read-only-owner"
    )
    user = await create_user(
        db_session,
        email=f"dashboard-read-only-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.SALES.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Read Only Owner Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Read Only Owner Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Read Only Owner Stream",
    )
    _set_project_completion(project, 16)
    await _create_proposal_record(db_session, org_id=org.id, project_id=project.id)
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["streamName"] == "Read Only Owner Stream"
    assert item["canEditProposalFollowUp"] is False


@pytest.mark.asyncio
async def test_dashboard_proposal_follow_up_transition_rebuckets_subfilters_predictably(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session, "Org Proposal Follow Up Filters", "org-proposal-follow-up-filters"
    )
    user = await create_user(
        db_session,
        email=f"proposal-follow-up-filters-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Proposal Filter Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Proposal Filter Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Proposal Filter Stream",
    )
    _set_project_completion(project, 16)
    await _create_proposal_record(db_session, org_id=org.id, project_id=project.id)
    await db_session.commit()

    set_current_user(user)

    uploaded_response = await client.get(
        "/api/v1/projects/dashboard?bucket=proposal&proposal_follow_up_state=uploaded"
    )
    assert uploaded_response.status_code == 200
    assert uploaded_response.json()["total"] == 1

    transition_response = await client.patch(
        f"/api/v1/projects/{project.id}/proposal-follow-up-state",
        json={"state": "waiting_to_send"},
    )
    assert transition_response.status_code == 200
    assert transition_response.json()["proposalFollowUpState"] == "waiting_to_send"

    uploaded_after = await client.get(
        "/api/v1/projects/dashboard?bucket=proposal&proposal_follow_up_state=uploaded"
    )
    waiting_to_send_after = await client.get(
        "/api/v1/projects/dashboard?bucket=proposal&proposal_follow_up_state=waiting_to_send"
    )
    assert uploaded_after.status_code == 200
    assert waiting_to_send_after.status_code == 200
    assert uploaded_after.json()["counts"]["proposal"] == 0
    assert uploaded_after.json()["total"] == 0
    assert waiting_to_send_after.json()["counts"]["proposal"] == 1
    assert waiting_to_send_after.json()["items"][0]["streamName"] == "Proposal Filter Stream"


@pytest.mark.asyncio
async def test_dashboard_ignores_stale_proposal_follow_up_state_without_proposals(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Proposal Ghost State", "org-proposal-ghost-state")
    user = await create_user(
        db_session,
        email=f"proposal-ghost-state-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Proposal Ghost Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Proposal Ghost Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Ghost Proposal Stream",
    )
    _set_project_completion(project, 16)
    project.proposal_follow_up_state = "waiting_response"
    await db_session.commit()

    set_current_user(user)

    proposal_response = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert proposal_response.status_code == 200
    assert proposal_response.json()["counts"]["proposal"] == 0
    assert proposal_response.json()["total"] == 0

    total_response = await client.get("/api/v1/projects/dashboard?bucket=total")
    assert total_response.status_code == 200
    total_item = next(
        item
        for item in total_response.json()["items"]
        if item["streamName"] == "Ghost Proposal Stream"
    )
    assert total_item["bucket"] == "intelligence_report"
    assert total_item["proposalFollowUpState"] is None


@pytest.mark.asyncio
async def test_deleting_last_proposal_clears_stored_follow_up_state_and_recreated_proposal_restarts_uploaded(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Proposal Delete Cleanup", "org-proposal-delete-cleanup")
    user = await create_user(
        db_session,
        email=f"proposal-delete-cleanup-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Proposal Delete Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Proposal Delete Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Proposal Delete Stream",
    )
    _set_project_completion(project, 16)
    proposal = await _create_proposal_record(db_session, org_id=org.id, project_id=project.id)
    project.proposal_follow_up_state = "waiting_response"
    await db_session.commit()

    set_current_user(user)

    delete_response = await client.delete(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}"
    )
    assert delete_response.status_code == 204

    stored_project = await db_session.get(Project, project.id)
    assert stored_project is not None
    assert stored_project.proposal_follow_up_state is None

    dashboard_after_delete = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert dashboard_after_delete.status_code == 200
    assert dashboard_after_delete.json()["counts"]["proposal"] == 0
    assert dashboard_after_delete.json()["total"] == 0

    recreated = await _create_proposal_record(
        db_session,
        org_id=org.id,
        project_id=project.id,
        title="Proposal Recreated",
    )
    assert recreated is not None

    dashboard_after_recreate = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert dashboard_after_recreate.status_code == 200
    assert dashboard_after_recreate.json()["counts"]["proposal"] == 1
    recreated_item = dashboard_after_recreate.json()["items"][0]
    assert recreated_item["streamName"] == "Proposal Delete Stream"
    assert recreated_item["proposalFollowUpState"] == "uploaded"


@pytest.mark.asyncio
async def test_dashboard_treats_uploaded_state_as_open_offer_even_without_proposals(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Uploaded State Without Proposal",
        f"org-uploaded-no-proposal-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"uploaded-no-proposal-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Uploaded No Proposal Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Uploaded No Proposal Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Uploaded No Proposal Stream",
    )
    _set_project_completion(project, 16)
    project.proposal_follow_up_state = "uploaded"
    await db_session.commit()

    set_current_user(user)

    proposal_response = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert proposal_response.status_code == 200
    payload = proposal_response.json()
    assert payload["counts"]["proposal"] == 1
    assert payload["total"] == 1
    assert payload["items"][0]["projectId"] == str(project.id)
    assert payload["items"][0]["proposalFollowUpState"] == "uploaded"

    pipeline_response = await client.get("/api/v1/projects/offers/pipeline")
    assert pipeline_response.status_code == 200
    pipeline_payload = pipeline_response.json()
    assert pipeline_payload["counts"]["total"] == 1
    assert pipeline_payload["counts"]["uploaded"] == 1
    assert pipeline_payload["items"][0]["projectId"] == str(project.id)


@pytest.mark.asyncio
async def test_dashboard_stats(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Dashboard", "org-dashboard")
    user = await create_user(
        db_session,
        email=f"dashboard-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Dashboard Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Dashboard Loc"
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Dashboard Project",
    )

    set_current_user(user)
    response = await client.get("/api/v1/projects/stats")
    assert response.status_code == 200
    data = response.json()
    assert "totalProjects" in data
    assert data["totalProjects"] >= 1


@pytest.mark.asyncio
async def test_offers_pipeline_projection_returns_open_states_and_counts(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offers Pipeline", "org-offers-pipeline")
    user = await create_user(
        db_session,
        email=f"offers-pipeline-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Offer Loc")

    implicit_uploaded = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Implicit Uploaded Stream",
    )
    current_latest = Proposal(
        organization_id=org.id,
        project_id=implicit_uploaded.id,
        version="v1.0",
        title="Current Offer",
        proposal_type="Technical",
        status="Current",
        capex=111_000,
        ai_metadata={"proposal": {"headline": "current"}},
        created_at=datetime(2026, 3, 20, tzinfo=UTC),
    )
    db_session.add(current_latest)

    waiting_response = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Waiting Response Stream",
    )
    waiting_response.proposal_follow_up_state = "waiting_response"
    archived_newer = Proposal(
        organization_id=org.id,
        project_id=waiting_response.id,
        version="v3.0",
        title="Archived newer",
        proposal_type="Technical",
        status="Archived",
        capex=999_000,
        ai_metadata={"proposal": {"headline": "archived"}},
        created_at=datetime(2026, 3, 24, tzinfo=UTC),
    )
    draft_newest = Proposal(
        organization_id=org.id,
        project_id=waiting_response.id,
        version="v2.0",
        title="Draft newest",
        proposal_type="Technical",
        status="Draft",
        capex=222_000,
        ai_metadata={"proposal": {"headline": "draft"}},
        created_at=datetime(2026, 3, 23, tzinfo=UTC),
    )
    current_preferred = Proposal(
        organization_id=org.id,
        project_id=waiting_response.id,
        version="v1.0",
        title="Current preferred",
        proposal_type="Technical",
        status="Current",
        capex=333_000,
        ai_metadata={"proposal": {"headline": "current"}},
        created_at=datetime(2026, 3, 22, tzinfo=UTC),
    )
    db_session.add_all([archived_newer, draft_newest, current_preferred])

    terminal = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Accepted Stream",
    )
    terminal.proposal_follow_up_state = "accepted"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=terminal.id,
            version="v1.0",
            title="Accepted offer",
            proposal_type="Technical",
            status="Current",
            capex=444_000,
            ai_metadata={"proposal": {"headline": "accepted"}},
        )
    )

    archived_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Archived Project",
    )
    archived_project.archived_at = datetime.now(UTC)
    archived_project.proposal_follow_up_state = "waiting_to_send"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=archived_project.id,
            version="v1.0",
            title="Archived project offer",
            proposal_type="Technical",
            status="Current",
            capex=555_000,
            ai_metadata={"proposal": {"headline": "archived project"}},
        )
    )

    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/offers/pipeline")
    assert response.status_code == 200

    payload = response.json()
    assert payload["counts"] == {
        "total": 2,
        "uploaded": 1,
        "waitingToSend": 0,
        "waitingResponse": 1,
        "underNegotiation": 0,
    }

    rows_by_project = {row["projectId"]: row for row in payload["items"]}
    implicit_row = rows_by_project[str(implicit_uploaded.id)]
    assert implicit_row["proposalFollowUpState"] == "uploaded"
    assert implicit_row["latestProposalId"] == str(current_latest.id)

    waiting_row = rows_by_project[str(waiting_response.id)]
    assert waiting_row["proposalFollowUpState"] == "waiting_response"
    assert waiting_row["latestProposalId"] == str(current_preferred.id)
    assert waiting_row["latestProposalTitle"] == "Current preferred"
    assert waiting_row["valueUsd"] == 333000


@pytest.mark.asyncio
async def test_offers_pipeline_projection_keeps_uploaded_state_with_only_archived_proposals(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Offers Archived Only",
        f"org-offers-archived-only-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"offers-archived-only-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Archived-only Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Archived-only Site",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Archived-only Stream",
    )
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=project.id,
            version="v1.0",
            title="Archived proposal",
            proposal_type="Technical",
            status="Archived",
            capex=123_000,
        )
    )
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/offers/pipeline")
    assert response.status_code == 200

    payload = response.json()
    assert payload["counts"] == {
        "total": 1,
        "uploaded": 1,
        "waitingToSend": 0,
        "waitingResponse": 0,
        "underNegotiation": 0,
    }
    assert len(payload["items"]) == 1
    row = payload["items"][0]
    assert row["projectId"] == str(project.id)
    assert row["proposalFollowUpState"] == "uploaded"
    assert row["latestProposalId"] is None
    assert row["latestProposalVersion"] is None
    assert row["latestProposalTitle"] is None
    assert row["valueUsd"] is None


@pytest.mark.asyncio
async def test_offers_pipeline_projection_supports_search(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offers Search", "org-offers-search")
    user = await create_user(
        db_session,
        email=f"offers-search-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Search Offer Company")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Search Offer Location")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Catalyst Stream",
    )
    project.proposal_follow_up_state = "waiting_to_send"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=project.id,
            version="v1.0",
            title="Searchable offer",
            proposal_type="Technical",
            status="Current",
            capex=12_000,
            ai_metadata={"proposal": {"headline": "search"}},
        )
    )
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/offers/pipeline?search=Catalyst")
    assert response.status_code == 200
    payload = response.json()
    assert payload["counts"]["total"] == 1
    assert payload["items"][0]["streamName"] == "Catalyst Stream"

    no_match = await client.get("/api/v1/projects/offers/pipeline?search=Nope")
    assert no_match.status_code == 200
    assert no_match.json()["counts"]["total"] == 0
    assert no_match.json()["items"] == []


@pytest.mark.asyncio
async def test_offers_archive_projection_returns_archived_terminal_states_and_counts(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offers Archive", "org-offers-archive")
    user = await create_user(
        db_session,
        email=f"offers-archive-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Archive Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Archive Plant",
    )

    accepted_archived = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Accepted Archived Stream",
    )
    accepted_archived.archived_at = datetime.now(UTC)
    accepted_archived.proposal_follow_up_state = "accepted"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=accepted_archived.id,
            version="v1.0",
            title="Accepted archived offer",
            proposal_type="Technical",
            status="Current",
            capex=510_000,
            ai_metadata={"proposal": {"headline": "accepted archived"}},
        )
    )

    declined_archived = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Declined Archived Stream",
    )
    declined_archived.archived_at = datetime.now(UTC)
    declined_archived.proposal_follow_up_state = "rejected"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=declined_archived.id,
            version="v2.0",
            title="Declined archived offer",
            proposal_type="Technical",
            status="Current",
            capex=275_000,
            ai_metadata={"proposal": {"headline": "declined archived"}},
        )
    )

    active_terminal = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Active Accepted Stream",
    )
    active_terminal.proposal_follow_up_state = "accepted"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=active_terminal.id,
            version="v1.0",
            title="Active accepted offer",
            proposal_type="Technical",
            status="Current",
            capex=99_000,
            ai_metadata={"proposal": {"headline": "active accepted"}},
        )
    )

    archived_non_terminal = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Archived Waiting Stream",
    )
    archived_non_terminal.archived_at = datetime.now(UTC)
    archived_non_terminal.proposal_follow_up_state = "waiting_response"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=archived_non_terminal.id,
            version="v1.0",
            title="Archived waiting offer",
            proposal_type="Technical",
            status="Current",
            capex=10_000,
            ai_metadata={"proposal": {"headline": "archived waiting"}},
        )
    )

    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects/offers/archive")
    assert response.status_code == 200

    payload = response.json()
    assert payload["counts"] == {
        "total": 2,
        "accepted": 1,
        "declined": 1,
    }

    rows_by_project = {row["projectId"]: row for row in payload["items"]}
    accepted_row = rows_by_project[str(accepted_archived.id)]
    assert accepted_row["proposalFollowUpState"] == "accepted"
    assert accepted_row["valueUsd"] == 510000
    assert accepted_row["archivedAt"] is not None

    declined_row = rows_by_project[str(declined_archived.id)]
    assert declined_row["proposalFollowUpState"] == "declined"
    assert declined_row["valueUsd"] == 275000
    assert declined_row["archivedAt"] is not None

    assert str(active_terminal.id) not in rows_by_project
    assert str(archived_non_terminal.id) not in rows_by_project


@pytest.mark.asyncio
async def test_offers_archive_projection_supports_search_status_and_rejects_expired_filter(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Offers Archive Filters",
        "org-offers-archive-filters",
    )
    user = await create_user(
        db_session,
        email=f"offers-archive-filters-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Catalyst Company")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Catalyst Site",
    )

    accepted = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Catalyst Accepted Stream",
    )
    accepted.archived_at = datetime.now(UTC)
    accepted.proposal_follow_up_state = "accepted"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=accepted.id,
            version="v1.0",
            title="Accepted",
            proposal_type="Technical",
            status="Current",
            capex=100_000,
            ai_metadata={"proposal": {"headline": "accepted"}},
        )
    )

    declined_company = await create_company(
        db_session,
        org_id=org.id,
        name="Archive Declined Company",
    )
    declined_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=declined_company.id,
        name="Archive Declined Site",
    )

    declined = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=declined_location.id,
        name="Other Declined Stream",
    )
    declined.archived_at = datetime.now(UTC)
    declined.proposal_follow_up_state = "rejected"
    db_session.add(
        Proposal(
            organization_id=org.id,
            project_id=declined.id,
            version="v1.0",
            title="Declined",
            proposal_type="Technical",
            status="Current",
            capex=200_000,
            ai_metadata={"proposal": {"headline": "declined"}},
        )
    )

    await db_session.commit()

    set_current_user(user)

    search_response = await client.get("/api/v1/projects/offers/archive?search=Catalyst")
    assert search_response.status_code == 200
    search_payload = search_response.json()
    assert search_payload["counts"] == {
        "total": 1,
        "accepted": 1,
        "declined": 0,
    }
    assert search_payload["items"][0]["projectId"] == str(accepted.id)

    status_response = await client.get("/api/v1/projects/offers/archive?status=declined")
    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["counts"] == {
        "total": 1,
        "accepted": 0,
        "declined": 1,
    }
    assert status_payload["items"][0]["projectId"] == str(declined.id)

    expired_response = await client.get("/api/v1/projects/offers/archive?status=expired")
    assert expired_response.status_code == 422


def test_count_dashboard_rows_split_matches_legacy_merged_count_contract() -> None:
    class _PersistedRow:
        kind = "persisted_stream"

        def __init__(self, bucket: str):
            self.bucket = bucket

    class _DraftRow:
        kind = "draft_item"

    persisted_rows = [
        _PersistedRow("missing_information"),
        _PersistedRow("intelligence_report"),
        _PersistedRow("proposal"),
        _PersistedRow("missing_information"),
    ]
    draft_rows = [_DraftRow(), _DraftRow()]

    merged_counts = _count_dashboard_rows([*persisted_rows, *draft_rows])
    split_counts = _count_dashboard_rows_split(
        persisted_rows=persisted_rows,
        draft_rows=draft_rows,
    )

    assert split_counts == merged_counts


def test_count_dashboard_rows_split_handles_empty_and_draft_only_inputs() -> None:
    class _PersistedRow:
        kind = "persisted_stream"

        def __init__(self, bucket: str):
            self.bucket = bucket

    class _DraftRow:
        kind = "draft_item"

    empty_counts = _count_dashboard_rows_split(persisted_rows=[], draft_rows=[])
    assert empty_counts.total == 0
    assert empty_counts.needs_confirmation == 0
    assert empty_counts.missing_information == 0
    assert empty_counts.intelligence_report == 0
    assert empty_counts.proposal == 0

    persisted_rows = [_PersistedRow("proposal")]
    draft_rows = [_DraftRow()]
    mixed_counts = _count_dashboard_rows_split(
        persisted_rows=persisted_rows,
        draft_rows=draft_rows,
    )
    assert mixed_counts.total == 2
    assert mixed_counts.needs_confirmation == 1
    assert mixed_counts.proposal == 1
