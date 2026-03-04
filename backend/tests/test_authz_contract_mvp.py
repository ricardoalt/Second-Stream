import uuid

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient

from app.models.user import UserRole


def assert_error_contract(response, expected_status: int, expected_code: str) -> None:
    assert response.status_code == expected_status
    payload = response.json()
    assert payload["code"] == expected_code
    assert isinstance(payload["message"], str)
    if "details" in payload:
        assert isinstance(payload["details"], dict)


@pytest.mark.asyncio
async def test_auth_required_uses_contract_payload(client: AsyncClient):
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "No Auth Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert_error_contract(response, 401, "AUTH_REQUIRED")


@pytest.mark.asyncio
async def test_require_permission_allow_path_does_not_raise_logging_500(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Allow Logging Org", "allow-logging-org")
    allowed_user = await create_user(
        db_session,
        email=f"allow-logging-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(allowed_user)

    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Allow Logging Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert response.status_code != 500
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_require_permission_deny_path_does_not_raise_logging_500(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Deny Logging Org", "deny-logging-org")
    denied_user = await create_user(
        db_session,
        email=f"deny-logging-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    set_current_user(denied_user)

    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Deny Logging Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert response.status_code != 500
    assert_error_contract(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_superadmin_missing_org_header_returns_400_bad_request(
    client: AsyncClient, db_session, set_current_user
):
    superuser = await create_user(
        db_session,
        email=f"superadmin-missing-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)

    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Missing Header Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert_error_contract(response, 400, "BAD_REQUEST")


@pytest.mark.asyncio
async def test_superadmin_malformed_org_header_returns_400_not_422(
    client: AsyncClient, db_session, set_current_user
):
    superuser = await create_user(
        db_session,
        email=f"superadmin-malformed-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)

    response = await client.post(
        "/api/v1/companies/",
        headers={"X-Organization-Id": "not-a-uuid"},
        json={
            "name": "Malformed Header Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert_error_contract(response, 400, "ORG_HEADER_MALFORMED")


@pytest.mark.asyncio
async def test_superadmin_inaccessible_org_header_returns_403_org_access_denied(
    client: AsyncClient, db_session, set_current_user
):
    superuser = await create_user(
        db_session,
        email=f"superadmin-inaccessible-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)

    response = await client.post(
        "/api/v1/companies/",
        headers={"X-Organization-Id": str(uuid.uuid4())},
        json={
            "name": "Inaccessible Header Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert_error_contract(response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_superadmin_inactive_org_header_returns_403_org_access_denied(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Inactive Header Org", "inactive-header-org")
    org.is_active = False
    await db_session.commit()

    superuser = await create_user(
        db_session,
        email=f"superadmin-inactive-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)

    response = await client.post(
        "/api/v1/companies/",
        headers={"X-Organization-Id": str(org.id)},
        json={
            "name": "Inactive Header Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert_error_contract(response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_forbidden_permission_uses_contract_payload(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Forbidden Create Project", "forbidden-create-project")
    compliance_user = await create_user(
        db_session,
        email=f"compliance-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Forbidden Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Forbidden Loc"
    )

    set_current_user(compliance_user)
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "Forbidden Project",
        },
    )
    assert_error_contract(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_mutating_route_returns_404_only_for_missing_resource_in_scope(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Project Update Scope", "project-update-scope")
    org_admin = await create_user(
        db_session,
        email=f"org-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(org_admin)

    response = await client.patch(
        f"/api/v1/projects/{uuid.uuid4()}",
        json={"name": "Missing Project"},
    )
    assert_error_contract(response, 404, "RESOURCE_NOT_FOUND")


@pytest.mark.asyncio
async def test_mutating_route_returns_403_for_out_of_scope_resource(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Project Ownership", "project-ownership")
    owner_user = await create_user(
        db_session,
        email=f"owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other_user = await create_user(
        db_session,
        email=f"other-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Ownership Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Ownership Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=owner_user.id,
        location_id=location.id,
        name="Owned Project",
    )

    set_current_user(other_user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}",
        json={"name": "Illegal Update"},
    )
    assert_error_contract(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_mutating_project_cross_tenant_returns_403_org_access_denied(
    client: AsyncClient, db_session, set_current_user
):
    caller_org = await create_org(db_session, "Caller Org", "caller-org")
    target_org = await create_org(db_session, "Target Org", "target-org")
    caller_admin = await create_user(
        db_session,
        email=f"caller-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    target_owner = await create_user(
        db_session,
        email=f"target-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=target_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    target_company = await create_company(db_session, org_id=target_org.id, name="Target Co")
    target_location = await create_location(
        db_session,
        org_id=target_org.id,
        company_id=target_company.id,
        name="Target Loc",
    )
    target_project = await create_project(
        db_session,
        org_id=target_org.id,
        user_id=target_owner.id,
        location_id=target_location.id,
        name="Target Project",
    )

    set_current_user(caller_admin)
    response = await client.patch(
        f"/api/v1/projects/{target_project.id}",
        json={"name": "Cross Tenant Update"},
    )
    assert_error_contract(response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_mutating_company_cross_tenant_returns_403_org_access_denied(
    client: AsyncClient, db_session, set_current_user
):
    caller_org = await create_org(db_session, "Caller Company Org", "caller-company-org")
    target_org = await create_org(db_session, "Target Company Org", "target-company-org")
    caller_admin = await create_user(
        db_session,
        email=f"caller-company-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    target_company = await create_company(
        db_session, org_id=target_org.id, name="Cross Tenant Company"
    )

    set_current_user(caller_admin)
    response = await client.put(
        f"/api/v1/companies/{target_company.id}",
        json={"name": "Cross Tenant Company Updated"},
    )
    assert_error_contract(response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_mutating_location_cross_tenant_returns_403_org_access_denied(
    client: AsyncClient, db_session, set_current_user
):
    caller_org = await create_org(db_session, "Caller Location Org", "caller-location-org")
    target_org = await create_org(db_session, "Target Location Org", "target-location-org")
    caller_admin = await create_user(
        db_session,
        email=f"caller-location-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    target_company = await create_company(
        db_session, org_id=target_org.id, name="Cross Tenant Location Company"
    )
    target_location = await create_location(
        db_session,
        org_id=target_org.id,
        company_id=target_company.id,
        name="Cross Tenant Location",
    )

    set_current_user(caller_admin)
    response = await client.put(
        f"/api/v1/companies/locations/{target_location.id}",
        json={"name": "Cross Tenant Location Updated"},
    )
    assert_error_contract(response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_mutating_company_missing_in_scope_returns_404_resource_not_found(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Missing Company Org", "missing-company-org")
    org_admin = await create_user(
        db_session,
        email=f"missing-company-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(org_admin)

    response = await client.put(
        f"/api/v1/companies/{uuid.uuid4()}",
        json={"name": "Missing Company"},
    )
    assert_error_contract(response, 404, "RESOURCE_NOT_FOUND")


@pytest.mark.asyncio
async def test_mutating_location_missing_in_scope_returns_404_resource_not_found(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Missing Location Org", "missing-location-org")
    org_admin = await create_user(
        db_session,
        email=f"missing-location-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    set_current_user(org_admin)

    response = await client.put(
        f"/api/v1/companies/locations/{uuid.uuid4()}",
        json={"name": "Missing Location"},
    )
    assert_error_contract(response, 404, "RESOURCE_NOT_FOUND")


@pytest.mark.asyncio
async def test_auth_me_superadmin_without_org_header_returns_empty_permissions(
    client: AsyncClient, db_session, set_current_user
):
    superuser = await create_user(
        db_session,
        email=f"superadmin-me-empty-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)

    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    payload = response.json()
    assert payload["organization_id"] is None
    assert payload["permissions"] == []


@pytest.mark.asyncio
async def test_auth_me_superadmin_with_org_header_returns_org_scoped_permissions(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Superadmin Scoped Org", "superadmin-scoped-org")
    superuser = await create_user(
        db_session,
        email=f"superadmin-me-scoped-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)

    response = await client.get(
        "/api/v1/auth/me",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["organization_id"] == str(org.id)
    assert "company:create" in payload["permissions"]


@pytest.mark.asyncio
async def test_mutating_project_create_cross_tenant_returns_403_org_access_denied(
    client: AsyncClient, db_session, set_current_user
):
    caller_org = await create_org(db_session, "Project Create Caller", "project-create-caller")
    target_org = await create_org(db_session, "Project Create Target", "project-create-target")
    caller_user = await create_user(
        db_session,
        email=f"project-create-caller-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    target_company = await create_company(db_session, org_id=target_org.id, name="Target Company")
    target_location = await create_location(
        db_session,
        org_id=target_org.id,
        company_id=target_company.id,
        name="Target Location",
    )

    set_current_user(caller_user)
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(target_location.id),
            "name": "Cross Tenant Create",
        },
    )
    assert_error_contract(response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_mutating_voice_interview_create_cross_tenant_returns_403_org_access_denied(
    client: AsyncClient, db_session, set_current_user
):
    caller_org = await create_org(
        db_session, "Voice Interview Caller Org", "voice-interview-caller-org"
    )
    target_org = await create_org(
        db_session, "Voice Interview Target Org", "voice-interview-target-org"
    )
    caller_user = await create_user(
        db_session,
        email=f"voice-caller-{uuid.uuid4().hex[:8]}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    target_company = await create_company(db_session, org_id=target_org.id, name="Voice Target Co")

    set_current_user(caller_user)
    response = await client.post(
        "/api/v1/voice-interviews",
        data={"company_id": str(target_company.id), "consent_given": "true"},
        files={"audio_file": ("sample.wav", b"audio-bytes", "audio/wav")},
    )
    assert_error_contract(response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_mutating_bulk_upload_invalid_entrypoint_type_returns_400_bad_request(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Bulk Invalid Entrypoint", "bulk-invalid-entrypoint")
    user = await create_user(
        db_session,
        email=f"bulk-invalid-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Bulk Invalid Co")

    set_current_user(user)
    response = await client.post(
        "/api/v1/bulk-import/upload",
        data={
            "entrypoint_type": "invalid",
            "entrypoint_id": str(company.id),
        },
        files={
            "file": (
                "sample.docx",
                b"fake-docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert_error_contract(response, 400, "BAD_REQUEST")


@pytest.mark.asyncio
async def test_mutating_feedback_create_compliance_returns_403_forbidden(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Feedback Compliance Org", "feedback-compliance-org")
    compliance_user = await create_user(
        db_session,
        email=f"feedback-compliance-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    set_current_user(compliance_user)

    response = await client.post(
        "/api/v1/feedback",
        json={"content": "No write access", "feedback_type": "general"},
    )
    assert_error_contract(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_mutating_file_upload_compliance_returns_403_forbidden(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Files Compliance Org", "files-compliance-org")
    owner_user = await create_user(
        db_session,
        email=f"files-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    compliance_user = await create_user(
        db_session,
        email=f"files-compliance-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Files Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=owner_user.id,
        location_id=location.id,
        name="Files Project",
    )

    set_current_user(compliance_user)
    response = await client.post(
        f"/api/v1/projects/{project.id}/files",
        data={"category": "general", "process_with_ai": "false"},
        files={"file": ("sample.pdf", b"sample", "application/pdf")},
    )
    assert_error_contract(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_mutating_intake_notes_compliance_returns_403_forbidden(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Intake Compliance Org", "intake-compliance-org")
    owner_user = await create_user(
        db_session,
        email=f"intake-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    compliance_user = await create_user(
        db_session,
        email=f"intake-compliance-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Intake Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=owner_user.id,
        location_id=location.id,
        name="Intake Project",
    )

    set_current_user(compliance_user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/notes",
        json={"text": "Should be denied"},
    )
    assert_error_contract(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_mutating_proposal_generate_compliance_returns_403_forbidden(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Proposal Compliance Org", "proposal-compliance-org")
    owner_user = await create_user(
        db_session,
        email=f"proposal-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    compliance_user = await create_user(
        db_session,
        email=f"proposal-compliance-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Proposal Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Loc")
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=owner_user.id,
        location_id=location.id,
        name="Proposal Project",
    )

    set_current_user(compliance_user)
    response = await client.post(
        "/api/v1/ai/proposals/generate",
        json={
            "project_id": str(project.id),
            "proposal_type": "Conceptual",
            "preferences": None,
        },
    )
    assert_error_contract(response, 403, "FORBIDDEN")
