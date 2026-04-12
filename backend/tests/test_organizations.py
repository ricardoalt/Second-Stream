import uuid
from datetime import UTC, datetime

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient

from app.models.proposal import Proposal
from app.models.user import UserRole
from app.templates.assessment_questionnaire import get_assessment_questionnaire


def _complete_project_data_payload() -> dict[str, object]:
    required_field_ids: list[str] = []
    for section in get_assessment_questionnaire():
        if not isinstance(section, dict):
            continue
        fields = section.get("fields")
        if not isinstance(fields, list):
            continue
        for field in fields:
            if not isinstance(field, dict) or not field.get("required"):
                continue
            field_id = field.get("id")
            if isinstance(field_id, str):
                required_field_ids.append(field_id)

    return {
        "technical_sections": [
            {
                "fields": [
                    {"id": field_id, "value": "complete"} for field_id in required_field_ids
                ],
            }
        ],
    }


@pytest.mark.asyncio
async def test_get_current_org(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Current", "org-current")
    user = await create_user(
        db_session,
        email=f"current-org-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.get("/api/v1/organizations/current")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Org Current"
    assert data["id"] == str(org.id)


@pytest.mark.asyncio
async def test_list_org_users_as_admin(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org List Users", "org-list-users")
    admin = await create_user(
        db_session,
        email=f"admin-list-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    await create_user(
        db_session,
        email=f"agent1-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    await create_user(
        db_session,
        email=f"agent2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(admin)
    response = await client.get("/api/v1/organizations/current/users")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


@pytest.mark.asyncio
async def test_org_user_list_includes_open_streams_count_with_locked_semantics(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Streams Count", f"org-streams-count-{uid}")
    other_org = await create_org(db_session, "Other Org Streams", f"other-org-streams-{uid}")

    admin = await create_user(
        db_session,
        email=f"admin-streams-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    member = await create_user(
        db_session,
        email=f"member-streams-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other_member = await create_user(
        db_session,
        email=f"other-member-streams-{uid}@example.com",
        org_id=other_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    company = await create_company(
        db_session,
        org_id=org.id,
        name=f"Streams Co {uid}",
        created_by_user_id=admin.id,
    )
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name=f"Streams Site {uid}",
        created_by_user_id=admin.id,
    )

    await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name=f"Open Stream A {uid}",
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name=f"Open Stream B {uid}",
    )

    completed_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name=f"Completed Stream {uid}",
    )
    completed_project.status = "Completed"

    archived_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name=f"Archived Stream {uid}",
    )
    archived_project.archived_at = datetime.now(UTC)

    await create_project(
        db_session,
        org_id=org.id,
        user_id=member.id,
        location_id=location.id,
        name=f"Member Open Stream {uid}",
    )

    other_company = await create_company(
        db_session,
        org_id=other_org.id,
        name=f"Other Streams Co {uid}",
        created_by_user_id=other_member.id,
    )
    other_location = await create_location(
        db_session,
        org_id=other_org.id,
        company_id=other_company.id,
        name=f"Other Streams Site {uid}",
        created_by_user_id=other_member.id,
    )
    await create_project(
        db_session,
        org_id=other_org.id,
        user_id=other_member.id,
        location_id=other_location.id,
        name=f"Other Org Open Stream {uid}",
    )

    db_session.add(completed_project)
    db_session.add(archived_project)
    await db_session.commit()

    set_current_user(admin)

    current_users_response = await client.get("/api/v1/organizations/current/users")
    assert current_users_response.status_code == 200
    current_users = current_users_response.json()
    current_by_email = {row["email"]: row for row in current_users}

    assert current_by_email[admin.email]["open_streams_count"] == 2
    assert current_by_email[member.email]["open_streams_count"] == 1
    assert all(isinstance(row["open_streams_count"], int) for row in current_users)

    scoped_users_response = await client.get(f"/api/v1/organizations/{org.id}/users")
    assert scoped_users_response.status_code == 200
    scoped_users = scoped_users_response.json()
    scoped_by_email = {row["email"]: row for row in scoped_users}

    assert scoped_by_email[admin.email]["open_streams_count"] == 2
    assert scoped_by_email[member.email]["open_streams_count"] == 1
    assert all(isinstance(row["open_streams_count"], int) for row in scoped_users)


@pytest.mark.asyncio
async def test_get_field_agent_detail_returns_truthful_kpis_and_paginated_owned_streams(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Agent Detail", f"org-agent-detail-{uid}")
    admin = await create_user(
        db_session,
        email=f"org-admin-agent-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    target_agent = await create_user(
        db_session,
        email=f"field-agent-agent-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    company = await create_company(
        db_session,
        org_id=org.id,
        name=f"Agent Detail Co {uid}",
        created_by_user_id=admin.id,
    )
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name=f"Agent Detail Site {uid}",
        created_by_user_id=admin.id,
    )

    missing_info_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=target_agent.id,
        location_id=location.id,
        name=f"Missing Info Stream {uid}",
    )
    offers_in_progress_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=target_agent.id,
        location_id=location.id,
        name=f"Offer Pipeline Stream {uid}",
    )
    completed_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=target_agent.id,
        location_id=location.id,
        name=f"Completed Stream Detail {uid}",
    )
    archived_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=target_agent.id,
        location_id=location.id,
        name=f"Archived Stream Detail {uid}",
    )

    offers_in_progress_project.project_data = _complete_project_data_payload()
    offers_in_progress_project.proposal_follow_up_state = "waiting_response"
    offers_in_progress_proposal = Proposal(
        organization_id=org.id,
        project_id=offers_in_progress_project.id,
        version="v1.0",
        title=f"Offer Proposal {uid}",
        proposal_type="Technical",
        status="Current",
    )
    completed_project.status = "Completed"
    completed_project.project_data = _complete_project_data_payload()
    archived_project.archived_at = datetime.now(UTC)

    db_session.add(missing_info_project)
    db_session.add(offers_in_progress_project)
    db_session.add(offers_in_progress_proposal)
    db_session.add(completed_project)
    db_session.add(archived_project)
    await db_session.commit()

    set_current_user(admin)
    response = await client.get(
        f"/api/v1/organizations/current/users/{target_agent.id}",
        params={"page": 1, "size": 2},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["user"]["id"] == str(target_agent.id)
    assert payload["user"]["open_streams_count"] == 2
    assert payload["kpis"] == {
        "openStreams": 2,
        "missingInformation": 1,
        "offersInProgress": 1,
        "completedStreams": 1,
    }

    assert payload["total"] == 3
    assert payload["page"] == 1
    assert payload["size"] == 2
    assert payload["pages"] == 2
    assert len(payload["streams"]) == 2
    assert {stream["streamName"] for stream in payload["streams"]}.issubset(
        {
            f"Missing Info Stream {uid}",
            f"Offer Pipeline Stream {uid}",
            f"Completed Stream Detail {uid}",
        },
    )

    for stream in payload["streams"]:
        assert stream["projectId"] != str(archived_project.id)

    paged_response = await client.get(
        f"/api/v1/organizations/current/users/{target_agent.id}",
        params={"page": 2, "size": 1},
    )

    assert paged_response.status_code == 200
    paged_payload = paged_response.json()
    assert paged_payload["page"] == 2
    assert paged_payload["size"] == 1
    assert paged_payload["total"] == 3
    assert paged_payload["pages"] == 3
    assert len(paged_payload["streams"]) == 1


@pytest.mark.asyncio
async def test_get_field_agent_detail_returns_detail_for_org_admin_targets(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Agent Detail Role", f"org-agent-role-{uid}")
    admin = await create_user(
        db_session,
        email=f"org-admin-agent-role-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    org_admin_target = await create_user(
        db_session,
        email=f"org-admin-target-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(admin)
    response = await client.get(
        f"/api/v1/organizations/current/users/{org_admin_target.id}",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["id"] == str(org_admin_target.id)
    assert payload["user"]["role"] == UserRole.ORG_ADMIN.value


@pytest.mark.asyncio
async def test_get_field_agent_detail_forbidden_for_non_admin_actor(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Agent Detail Forbidden", f"org-agent-forbidden-{uid}")
    field_agent = await create_user(
        db_session,
        email=f"field-agent-forbidden-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    target_agent = await create_user(
        db_session,
        email=f"field-agent-target-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(field_agent)
    response = await client.get(f"/api/v1/organizations/current/users/{target_agent.id}")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_superadmin_org_scoped_field_agent_detail_enforces_org_scope(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Scoped Detail", f"org-scoped-detail-{uid}")
    other_org = await create_org(db_session, "Org Scoped Other", f"org-scoped-other-{uid}")

    superadmin = await create_user(
        db_session,
        email=f"superadmin-agent-detail-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    target_agent = await create_user(
        db_session,
        email=f"field-agent-scoped-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    scoped_response = await client.get(
        f"/api/v1/organizations/{org.id}/users/{target_agent.id}",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert scoped_response.status_code == 200

    cross_org_response = await client.get(
        f"/api/v1/organizations/{other_org.id}/users/{target_agent.id}",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert cross_org_response.status_code == 403


@pytest.mark.asyncio
async def test_list_org_users_as_agent_forbidden(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Forbidden List", "org-forbidden-list")
    agent = await create_user(
        db_session,
        email=f"agent-forbidden-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(agent)
    response = await client.get("/api/v1/organizations/current/users")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_org_user_as_admin(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create User", "org-create-user")
    admin = await create_user(
        db_session,
        email=f"admin-create-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(admin)
    response = await client.post(
        "/api/v1/organizations/current/users",
        json={
            "email": f"newuser-{uid}@example.com",
            "password": "Password1",
            "first_name": "New",
            "last_name": "User",
            "role": UserRole.FIELD_AGENT.value,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == f"newuser-{uid}@example.com"


@pytest.mark.asyncio
async def test_create_org_user_duplicate_email_returns_409_current_users(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Duplicate Current", "org-duplicate-current")
    admin = await create_user(
        db_session,
        email=f"org-admin-duplicate-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    duplicate_email = f"duplicate-current-{uid}@example.com"
    await create_user(
        db_session,
        email=duplicate_email,
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(admin)
    response = await client.post(
        "/api/v1/organizations/current/users",
        json={
            "email": duplicate_email,
            "password": "Password1",
            "first_name": "Dupe",
            "last_name": "Current",
            "role": UserRole.FIELD_AGENT.value,
        },
    )

    assert response.status_code == 409
    payload = response.json()
    assert payload["code"] == "USER_ALREADY_EXISTS"
    assert payload["message"] == "A user with this email already exists in this organization."
    assert payload["details"]["email"] == duplicate_email


@pytest.mark.asyncio
async def test_create_org_user_duplicate_email_returns_409_org_users(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Duplicate Scoped", "org-duplicate-scoped")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-duplicate-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    duplicate_email = f"duplicate-org-{uid}@example.com"
    await create_user(
        db_session,
        email=duplicate_email,
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    response = await client.post(
        f"/api/v1/organizations/{org.id}/users",
        json={
            "email": duplicate_email,
            "password": "Password1",
            "first_name": "Dupe",
            "last_name": "Scoped",
            "role": UserRole.FIELD_AGENT.value,
        },
    )

    assert response.status_code == 409
    payload = response.json()
    assert payload["code"] == "USER_ALREADY_EXISTS"
    assert payload["message"] == "A user with this email already exists in this organization."
    assert payload["details"]["email"] == duplicate_email


@pytest.mark.asyncio
async def test_create_org_user_cannot_create_platform_admin(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org No Platform Admin", "org-no-platform-admin")
    admin = await create_user(
        db_session,
        email=f"admin-no-platform-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(admin)
    response = await client.post(
        "/api/v1/organizations/current/users",
        json={
            "email": f"platform-admin-{uid}@example.com",
            "password": "Password1",
            "first_name": "Platform",
            "last_name": "Admin",
            "role": UserRole.ADMIN.value,
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_org_admin_can_update_member_role_via_current_endpoint(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Role", "org-update-role")
    org_admin = await create_user(
        db_session,
        email=f"org-admin-update-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    member = await create_user(
        db_session,
        email=f"member-update-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(org_admin)
    response = await client.patch(
        f"/api/v1/organizations/current/users/{member.id}",
        json={"role": UserRole.ORG_ADMIN.value},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(member.id)
    assert data["role"] == UserRole.ORG_ADMIN.value


@pytest.mark.asyncio
async def test_superadmin_list_all_orgs(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    await create_org(db_session, "Org Super 1", "org-super-1")
    await create_org(db_session, "Org Super 2", "org-super-2")

    superadmin = await create_user(
        db_session,
        email=f"superadmin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(superadmin)
    response = await client.get("/api/v1/organizations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_superadmin_create_org(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    superadmin = await create_user(
        db_session,
        email=f"superadmin-create-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(superadmin)
    response = await client.post(
        "/api/v1/organizations",
        json={
            "name": f"New Org {uid}",
            "slug": f"new-org-{uid}",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == f"New Org {uid}"


@pytest.mark.asyncio
async def test_superadmin_create_org_with_contact_fields(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    superadmin = await create_user(
        db_session,
        email=f"superadmin-create-contact-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(superadmin)
    response = await client.post(
        "/api/v1/organizations",
        json={
            "name": f"New Org Contact {uid}",
            "slug": f"new-org-contact-{uid}",
            "contactEmail": f"ops-{uid}@example.com",
            "contactPhone": "+1-555-0100",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == f"New Org Contact {uid}"
    assert data["contactEmail"] == f"ops-{uid}@example.com"
    assert data["contactPhone"] == "+1-555-0100"


@pytest.mark.asyncio
async def test_regular_user_cannot_list_all_orgs(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Regular", "org-regular")
    user = await create_user(
        db_session,
        email=f"regular-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.get("/api/v1/organizations")
    assert response.status_code == 403
