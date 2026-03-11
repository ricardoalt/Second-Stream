import copy
import uuid
from datetime import UTC, datetime

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
    assert payload["counts"]["needsConfirmation"] == 1
    assert payload["counts"]["missingInformation"] == 1
    assert payload["counts"]["intelligenceReport"] == 1
    assert payload["counts"]["proposal"] == 1
    assert payload["total"] == 1
    assert payload["items"][0]["kind"] == "persisted_stream"
    assert payload["items"][0]["bucket"] == "missing_information"
    assert payload["items"][0]["streamName"] == "Missing Info Stream"
    assert payload["items"][0]["canEditProposalFollowUp"] is True
    assert payload["items"][0]["missingRequiredInfo"] is True
    assert payload["items"][0]["missingFields"] == [
        "Existing Waste Handling Practices (select all that apply)",
        "What are your primary objectives? (select all that apply)",
        "Timeframe for implementation",
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
