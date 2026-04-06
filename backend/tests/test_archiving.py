import uuid

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient

from app.models import Company, Location
from app.models.project import Project
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_projects_archived_filter_list_and_stats(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Archive Filters", "org-archive-filters")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    company = await create_company(db_session, org_id=org.id, name="Archive Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Archive Plant",
    )

    active_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name="Active Project",
    )
    archived_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name="Archived Project",
    )

    archive_resp = await client.post(f"/api/v1/projects/{archived_project.id}/archive")
    assert archive_resp.status_code == 200

    resp = await client.get("/api/v1/projects")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert {item["id"] for item in data["items"]} == {str(active_project.id)}

    resp = await client.get("/api/v1/projects?archived=archived")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert {item["id"] for item in data["items"]} == {str(archived_project.id)}

    resp = await client.get("/api/v1/projects?archived=all")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2

    resp = await client.get("/api/v1/projects/stats")
    assert resp.status_code == 200
    assert resp.json()["totalProjects"] == 1

    resp = await client.get("/api/v1/projects/stats?archived=archived")
    assert resp.status_code == 200
    assert resp.json()["totalProjects"] == 1

    resp = await client.get("/api/v1/projects/stats?archived=all")
    assert resp.status_code == 200
    assert resp.json()["totalProjects"] == 2


@pytest.mark.asyncio
async def test_companies_locations_archived_filters(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Company Filters", "org-company-filters")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    active_company = await create_company(db_session, org_id=org.id, name="Active Co")
    archived_company = await create_company(db_session, org_id=org.id, name="Archived Co")

    resp = await client.post(f"/api/v1/companies/{archived_company.id}/archive")
    assert resp.status_code == 200

    resp = await client.get("/api/v1/companies")
    assert resp.status_code == 200
    assert {c["id"] for c in resp.json()} == {str(active_company.id)}

    resp = await client.get("/api/v1/companies?archived=archived")
    assert resp.status_code == 200
    assert {c["id"] for c in resp.json()} == {str(archived_company.id)}

    resp = await client.get("/api/v1/companies?archived=all")
    assert resp.status_code == 200
    assert {c["id"] for c in resp.json()} == {str(active_company.id), str(archived_company.id)}

    active_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=active_company.id,
        name="Active Loc",
    )
    archived_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=active_company.id,
        name="Archived Loc",
    )

    resp = await client.post(f"/api/v1/companies/locations/{archived_location.id}/archive")
    assert resp.status_code == 200

    resp = await client.get("/api/v1/companies/locations")
    assert resp.status_code == 200
    assert {loc["id"] for loc in resp.json()} == {str(active_location.id)}

    resp = await client.get("/api/v1/companies/locations?archived=archived")
    assert resp.status_code == 200
    assert {loc["id"] for loc in resp.json()} == {str(archived_location.id)}

    resp = await client.get("/api/v1/companies/locations?archived=all")
    assert resp.status_code == 200
    assert {loc["id"] for loc in resp.json()} == {
        str(active_location.id),
        str(archived_location.id),
    }


@pytest.mark.asyncio
async def test_company_location_detail_defaults_active_only(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Detail Filters", "org-detail-filters")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    company = await create_company(db_session, org_id=org.id, name="Detail Co")
    active_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Active Detail Loc",
    )
    archived_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Archived Detail Loc",
    )
    resp = await client.post(f"/api/v1/companies/locations/{archived_location.id}/archive")
    assert resp.status_code == 200

    resp = await client.get(f"/api/v1/companies/{company.id}")
    assert resp.status_code == 200
    locations = resp.json().get("locations") or []
    assert {loc["id"] for loc in locations} == {str(active_location.id)}

    active_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=active_location.id,
        name="Active Detail Project",
    )
    archived_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=active_location.id,
        name="Archived Detail Project",
    )
    resp = await client.post(f"/api/v1/projects/{archived_project.id}/archive")
    assert resp.status_code == 200

    resp = await client.get(f"/api/v1/companies/locations/{active_location.id}")
    assert resp.status_code == 200
    projects = resp.json().get("projects") or []
    assert {proj["id"] for proj in projects} == {str(active_project.id)}


@pytest.mark.asyncio
async def test_company_detail_archived_filter_variants(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Company Detail Variants", "org-company-detail-variants")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    company = await create_company(db_session, org_id=org.id, name="Detail Variants Co")
    active_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Active Variants Loc",
    )
    archived_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Archived Variants Loc",
    )
    archive_resp = await client.post(f"/api/v1/companies/locations/{archived_location.id}/archive")
    assert archive_resp.status_code == 200

    active_resp = await client.get(f"/api/v1/companies/{company.id}?archived=active")
    assert active_resp.status_code == 200
    assert {loc["id"] for loc in active_resp.json().get("locations") or []} == {
        str(active_location.id)
    }

    archived_resp = await client.get(f"/api/v1/companies/{company.id}?archived=archived")
    assert archived_resp.status_code == 200
    assert {loc["id"] for loc in archived_resp.json().get("locations") or []} == {
        str(archived_location.id)
    }

    all_resp = await client.get(f"/api/v1/companies/{company.id}?archived=all")
    assert all_resp.status_code == 200
    assert {loc["id"] for loc in all_resp.json().get("locations") or []} == {
        str(active_location.id),
        str(archived_location.id),
    }


@pytest.mark.asyncio
async def test_project_archive_restore_idempotent_audit(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Idempotent", "org-idempotent")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    company = await create_company(db_session, org_id=org.id, name="Idem Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Idem Plant",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name="Idem Project",
    )

    resp = await client.post(f"/api/v1/projects/{project.id}/archive")
    assert resp.status_code == 200

    stored = await db_session.get(Project, project.id)
    assert stored is not None
    await db_session.refresh(stored)
    first_archived_at = stored.archived_at
    first_archived_by = stored.archived_by_user_id

    resp = await client.post(f"/api/v1/projects/{project.id}/archive")
    assert resp.status_code == 200

    stored = await db_session.get(Project, project.id)
    assert stored is not None
    await db_session.refresh(stored)
    assert stored.archived_at == first_archived_at
    assert stored.archived_by_user_id == first_archived_by

    resp = await client.post(f"/api/v1/projects/{project.id}/restore")
    assert resp.status_code == 200

    stored = await db_session.get(Project, project.id)
    assert stored is not None
    await db_session.refresh(stored)
    assert stored.archived_at is None
    assert stored.archived_by_user_id is None

    resp = await client.post(f"/api/v1/projects/{project.id}/restore")
    assert resp.status_code == 200

    stored = await db_session.get(Project, project.id)
    assert stored is not None
    await db_session.refresh(stored)
    assert stored.archived_at is None


@pytest.mark.asyncio
async def test_project_purge_status_codes(client: AsyncClient, db_session, set_current_user):
    org = await create_org(db_session, "Org Purge", "org-purge")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    company = await create_company(db_session, org_id=org.id, name="Purge Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Purge Plant",
    )

    active_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name="Active Purge",
    )

    resp = await client.post(
        f"/api/v1/projects/{active_project.id}/purge",
        json={"confirm_name": active_project.name},
    )
    assert resp.status_code == 409

    archived_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name="Archived Purge",
    )
    resp = await client.post(f"/api/v1/projects/{archived_project.id}/archive")
    assert resp.status_code == 200

    resp = await client.post(f"/api/v1/projects/{archived_project.id}/purge")
    assert resp.status_code == 400

    resp = await client.post(
        f"/api/v1/projects/{archived_project.id}/purge",
        json={"confirm_name": "Wrong"},
    )
    assert resp.status_code == 400

    resp = await client.post(
        f"/api/v1/projects/{uuid.uuid4()}/purge",
        json={"confirm_name": "Missing"},
    )
    assert resp.status_code == 404

    resp = await client.post(
        f"/api/v1/projects/{archived_project.id}/purge",
        json={"confirm_name": archived_project.name},
    )
    assert resp.status_code == 204
    assert await db_session.get(Project, archived_project.id) is None


@pytest.mark.asyncio
async def test_company_purge_status_codes(client: AsyncClient, db_session, set_current_user):
    org = await create_org(db_session, "Org Company Purge", "org-company-purge")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    active_company = await create_company(db_session, org_id=org.id, name="Active Co")

    resp = await client.post(
        f"/api/v1/companies/{active_company.id}/purge",
        json={"confirm_name": active_company.name},
    )
    assert resp.status_code == 409

    archived_company = await create_company(db_session, org_id=org.id, name="Archived Co")
    resp = await client.post(f"/api/v1/companies/{archived_company.id}/archive")
    assert resp.status_code == 200

    resp = await client.post(f"/api/v1/companies/{archived_company.id}/purge")
    assert resp.status_code == 400

    resp = await client.post(
        f"/api/v1/companies/{archived_company.id}/purge",
        json={"confirm_name": "Wrong"},
    )
    assert resp.status_code == 400

    resp = await client.post(
        f"/api/v1/companies/{uuid.uuid4()}/purge",
        json={"confirm_name": "Missing"},
    )
    assert resp.status_code == 404

    resp = await client.post(
        f"/api/v1/companies/{archived_company.id}/purge",
        json={"confirm_name": archived_company.name},
    )
    assert resp.status_code == 204
    assert await db_session.get(Company, archived_company.id) is None


@pytest.mark.asyncio
async def test_location_purge_status_codes(client: AsyncClient, db_session, set_current_user):
    org = await create_org(db_session, "Org Location Purge", "org-location-purge")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    company = await create_company(db_session, org_id=org.id, name="Purge Co")
    active_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Active Loc",
    )

    resp = await client.post(
        f"/api/v1/companies/locations/{active_location.id}/purge",
        json={"confirm_name": active_location.name},
    )
    assert resp.status_code == 409

    archived_location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Archived Loc",
    )
    resp = await client.post(f"/api/v1/companies/locations/{archived_location.id}/archive")
    assert resp.status_code == 200

    resp = await client.post(f"/api/v1/companies/locations/{archived_location.id}/purge")
    assert resp.status_code == 400

    resp = await client.post(
        f"/api/v1/companies/locations/{archived_location.id}/purge",
        json={"confirm_name": "Wrong"},
    )
    assert resp.status_code == 400

    resp = await client.post(
        f"/api/v1/companies/locations/{uuid.uuid4()}/purge",
        json={"confirm_name": "Missing"},
    )
    assert resp.status_code == 404

    resp = await client.post(
        f"/api/v1/companies/locations/{archived_location.id}/purge",
        json={"confirm_name": archived_location.name},
    )
    assert resp.status_code == 204
    assert await db_session.get(Location, archived_location.id) is None


@pytest.mark.asyncio
async def test_company_location_purge_rbac_and_tenant(
    client: AsyncClient, db_session, set_current_user
):
    org_a = await create_org(db_session, "Org A Purge", "org-a-purge")
    org_b = await create_org(db_session, "Org B Purge", "org-b-purge")
    admin_a = await create_user(
        db_session,
        email=f"admin-a-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_a.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    agent_a = await create_user(
        db_session,
        email=f"agent-a-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    admin_b = await create_user(
        db_session,
        email=f"admin-b-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_b.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    company = await create_company(db_session, org_id=org_a.id, name="Purge RBAC Co")
    location = await create_location(
        db_session,
        org_id=org_a.id,
        company_id=company.id,
        name="Purge RBAC Loc",
    )

    set_current_user(admin_a)
    resp = await client.post(f"/api/v1/companies/{company.id}/archive")
    assert resp.status_code == 200
    resp = await client.post(f"/api/v1/companies/locations/{location.id}/archive")
    assert resp.status_code == 200

    set_current_user(agent_a)
    resp = await client.post(
        f"/api/v1/companies/{company.id}/purge",
        json={"confirm_name": company.name},
    )
    assert resp.status_code == 403
    resp = await client.post(
        f"/api/v1/companies/locations/{location.id}/purge",
        json={"confirm_name": location.name},
    )
    assert resp.status_code == 403

    set_current_user(admin_b)
    resp = await client.post(
        f"/api/v1/companies/{company.id}/purge",
        json={"confirm_name": company.name},
    )
    assert resp.status_code == 404
    resp = await client.post(
        f"/api/v1/companies/locations/{location.id}/purge",
        json={"confirm_name": location.name},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_archive_rbac_and_multi_tenant(client: AsyncClient, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A", "org-a")
    org_b = await create_org(db_session, "Org B", "org-b")
    admin_a = await create_user(
        db_session,
        email=f"admin-a-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_a.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    agent_b = await create_user(
        db_session,
        email=f"agent-b-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_b.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other_agent = await create_user(
        db_session,
        email=f"agent-a-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    company = await create_company(db_session, org_id=org_a.id, name="Org A Co")
    location = await create_location(
        db_session,
        org_id=org_a.id,
        company_id=company.id,
        name="Org A Loc",
    )
    project = await create_project(
        db_session,
        org_id=org_a.id,
        user_id=admin_a.id,
        location_id=location.id,
        name="Org A Project",
    )

    set_current_user(other_agent)
    resp = await client.post(f"/api/v1/projects/{project.id}/archive")
    assert resp.status_code == 403

    set_current_user(agent_b)
    resp = await client.post(f"/api/v1/projects/{project.id}/archive")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_archived_project_blocks_writes(client: AsyncClient, db_session, set_current_user):
    org = await create_org(db_session, "Org Read Only", "org-readonly")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(admin)

    company = await create_company(db_session, org_id=org.id, name="RO Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="RO Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=admin.id,
        location_id=location.id,
        name="RO Project",
    )

    resp = await client.post(f"/api/v1/projects/{project.id}/archive")
    assert resp.status_code == 200

    resp = await client.patch(
        f"/api/v1/projects/{project.id}",
        json={"name": "Updated"},
    )
    assert resp.status_code == 409

    resp = await client.patch(
        f"/api/v1/projects/{project.id}/data",
        json={"foo": "bar"},
    )
    assert resp.status_code == 409

    resp = await client.post(
        "/api/v1/ai/proposals/generate",
        json={"project_id": str(project.id), "proposal_type": "Technical"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_archived_location_blocks_contact_create(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Location Readonly", "org-loc-readonly")
    admin = await create_user(
        db_session,
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    agent = await create_user(
        db_session,
        email=f"agent-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    company = await create_company(db_session, org_id=org.id, name="Loc RO Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Loc RO",
    )

    set_current_user(admin)
    resp = await client.post(f"/api/v1/companies/locations/{location.id}/archive")
    assert resp.status_code == 200

    set_current_user(agent)
    resp = await client.post(
        f"/api/v1/companies/locations/{location.id}/contacts",
        json={"name": "Test", "email": "test@example.com", "phone": "123"},
    )
    assert resp.status_code == 409
