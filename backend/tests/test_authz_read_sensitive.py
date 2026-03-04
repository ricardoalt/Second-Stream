import uuid

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient

from app.models.feedback import Feedback
from app.models.feedback_attachment import FeedbackAttachment
from app.models.file import ProjectFile
from app.models.proposal import Proposal
from app.models.user import UserRole


def assert_error_contract(response, expected_status: int, expected_code: str) -> None:
    assert response.status_code == expected_status
    payload = response.json()
    assert payload["code"] == expected_code
    assert isinstance(payload["message"], str)


@pytest.mark.asyncio
async def test_sensitive_reads_require_authentication(client: AsyncClient):
    random_id = uuid.uuid4()
    auth_required_response = await client.get("/api/v1/admin/users")
    assert_error_contract(auth_required_response, 401, "AUTH_REQUIRED")

    auth_required_response = await client.get(
        "/api/v1/admin/feedback",
        headers={"X-Organization-Id": str(random_id)},
    )
    assert_error_contract(auth_required_response, 401, "AUTH_REQUIRED")

    auth_required_response = await client.get(
        f"/api/v1/admin/feedback/{random_id}/attachments",
        headers={"X-Organization-Id": str(random_id)},
    )
    assert_error_contract(auth_required_response, 401, "AUTH_REQUIRED")

    auth_required_response = await client.get("/api/v1/organizations/current/users")
    assert_error_contract(auth_required_response, 401, "AUTH_REQUIRED")

    auth_required_response = await client.get(f"/api/v1/organizations/{random_id}/users")
    assert_error_contract(auth_required_response, 401, "AUTH_REQUIRED")

    auth_required_response = await client.get(f"/api/v1/projects/files/{random_id}/download")
    assert_error_contract(auth_required_response, 401, "AUTH_REQUIRED")

    auth_required_response = await client.get(
        f"/api/v1/ai/proposals/{random_id}/proposals/{random_id}/ai-metadata"
    )
    assert_error_contract(auth_required_response, 401, "AUTH_REQUIRED")


@pytest.mark.asyncio
async def test_admin_users_read_allow_admin_deny_org_admin(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    superadmin = await create_user(
        db_session,
        email=f"read-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    org = await create_org(db_session, "Read Admin Users Org", "read-admin-users-org")
    org_admin = await create_user(
        db_session,
        email=f"read-org-admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    allow_response = await client.get("/api/v1/admin/users")
    assert allow_response.status_code == 200

    set_current_user(org_admin)
    deny_response = await client.get("/api/v1/admin/users")
    assert_error_contract(deny_response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_org_users_read_same_tenant_allow_cross_tenant_deny(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    caller_org = await create_org(db_session, "Caller Team Org", "caller-team-org")
    target_org = await create_org(db_session, "Target Team Org", "target-team-org")
    org_admin = await create_user(
        db_session,
        email=f"team-org-admin-{uid}@example.com",
        org_id=caller_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    await create_user(
        db_session,
        email=f"team-member-{uid}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(org_admin)

    same_tenant_response = await client.get("/api/v1/organizations/current/users")
    assert same_tenant_response.status_code == 200

    same_tenant_by_org_id_response = await client.get(
        f"/api/v1/organizations/{caller_org.id}/users"
    )
    assert same_tenant_by_org_id_response.status_code == 200

    cross_tenant_response = await client.get(f"/api/v1/organizations/{target_org.id}/users")
    assert_error_contract(cross_tenant_response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_admin_feedback_reads_same_tenant_allow_cross_tenant_deny(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org_a = await create_org(db_session, "Feedback Org A", "feedback-org-a")
    admin = await create_user(
        db_session,
        email=f"feedback-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    author = await create_user(
        db_session,
        email=f"feedback-author-{uid}@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    feedback = Feedback(
        organization_id=org_a.id,
        user_id=author.id,
        content="Admin read feedback",
        feedback_type="general",
        page_path="/dashboard",
    )
    db_session.add(feedback)
    await db_session.commit()
    await db_session.refresh(feedback)

    attachment = FeedbackAttachment(
        organization_id=org_a.id,
        feedback_id=feedback.id,
        storage_key=f"feedback/{org_a.id}/{feedback.id}/{uuid.uuid4()}.txt",
        original_filename="note.txt",
        content_type="text/plain",
        size_bytes=4,
        is_previewable=False,
    )
    db_session.add(attachment)
    await db_session.commit()

    async def _fake_presigned_url(*_args, **_kwargs) -> str:
        return "https://example.com/download"

    monkeypatch.setattr(
        "app.api.v1.feedback.get_presigned_url_with_headers",
        _fake_presigned_url,
    )

    set_current_user(admin)
    list_response = await client.get(
        "/api/v1/admin/feedback",
        headers={"X-Organization-Id": str(org_a.id)},
    )
    assert list_response.status_code == 200

    attachments_response = await client.get(
        f"/api/v1/admin/feedback/{feedback.id}/attachments",
        headers={"X-Organization-Id": str(org_a.id)},
    )
    assert attachments_response.status_code == 200

    out_of_scope_response = await client.get(
        "/api/v1/admin/feedback",
        headers={"X-Organization-Id": str(uuid.uuid4())},
    )
    assert_error_contract(out_of_scope_response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_file_download_read_same_tenant_allow_cross_tenant_deny(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    caller_org = await create_org(db_session, "File Caller Org", "file-caller-org")
    target_org = await create_org(db_session, "File Target Org", "file-target-org")
    caller_user = await create_user(
        db_session,
        email=f"file-caller-{uid}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    target_user = await create_user(
        db_session,
        email=f"file-target-{uid}@example.com",
        org_id=target_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    caller_company = await create_company(db_session, org_id=caller_org.id, name="Caller File Co")
    caller_location = await create_location(
        db_session,
        org_id=caller_org.id,
        company_id=caller_company.id,
        name="Caller File Location",
    )
    caller_project = await create_project(
        db_session,
        org_id=caller_org.id,
        user_id=caller_user.id,
        location_id=caller_location.id,
        name="Caller File Project",
    )

    target_company = await create_company(db_session, org_id=target_org.id, name="Target File Co")
    target_location = await create_location(
        db_session,
        org_id=target_org.id,
        company_id=target_company.id,
        name="Target File Location",
    )
    target_project = await create_project(
        db_session,
        org_id=target_org.id,
        user_id=target_user.id,
        location_id=target_location.id,
        name="Target File Project",
    )

    caller_file = ProjectFile(
        organization_id=caller_org.id,
        project_id=caller_project.id,
        filename="caller.pdf",
        file_path="projects/caller.pdf",
        file_size=1,
        file_type="pdf",
        mime_type="application/pdf",
        category="general",
        processing_status="completed",
        processing_attempts=0,
    )
    target_file = ProjectFile(
        organization_id=target_org.id,
        project_id=target_project.id,
        filename="target.pdf",
        file_path="projects/target.pdf",
        file_size=1,
        file_type="pdf",
        mime_type="application/pdf",
        category="general",
        processing_status="completed",
        processing_attempts=0,
    )
    db_session.add_all([caller_file, target_file])
    await db_session.commit()
    await db_session.refresh(caller_file)
    await db_session.refresh(target_file)

    async def _fake_get_presigned_url(*_args, **_kwargs) -> str:
        return "https://example.com/file.pdf"

    monkeypatch.setattr("app.api.v1.files.get_presigned_url", _fake_get_presigned_url)

    set_current_user(caller_user)
    allow_response = await client.get(f"/api/v1/projects/files/{caller_file.id}/download")
    assert allow_response.status_code == 200

    cross_tenant_response = await client.get(f"/api/v1/projects/files/{target_file.id}/download")
    assert_error_contract(cross_tenant_response, 403, "ORG_ACCESS_DENIED")


@pytest.mark.asyncio
async def test_ai_metadata_read_same_tenant_allow_cross_tenant_deny(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    caller_org = await create_org(db_session, "Metadata Caller Org", "metadata-caller-org")
    target_org = await create_org(db_session, "Metadata Target Org", "metadata-target-org")
    caller_user = await create_user(
        db_session,
        email=f"metadata-caller-{uid}@example.com",
        org_id=caller_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    target_user = await create_user(
        db_session,
        email=f"metadata-target-{uid}@example.com",
        org_id=target_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    caller_company = await create_company(db_session, org_id=caller_org.id, name="Caller Meta Co")
    caller_location = await create_location(
        db_session,
        org_id=caller_org.id,
        company_id=caller_company.id,
        name="Caller Meta Location",
    )
    caller_project = await create_project(
        db_session,
        org_id=caller_org.id,
        user_id=caller_user.id,
        location_id=caller_location.id,
        name="Caller Meta Project",
    )

    target_company = await create_company(db_session, org_id=target_org.id, name="Target Meta Co")
    target_location = await create_location(
        db_session,
        org_id=target_org.id,
        company_id=target_company.id,
        name="Target Meta Location",
    )
    target_project = await create_project(
        db_session,
        org_id=target_org.id,
        user_id=target_user.id,
        location_id=target_location.id,
        name="Target Meta Project",
    )

    caller_proposal = Proposal(
        organization_id=caller_org.id,
        project_id=caller_project.id,
        version="v1.0",
        title="Caller Proposal",
        proposal_type="Technical",
        status="Current",
        author="AI",
        capex=1.0,
        opex=1.0,
        executive_summary="summary",
        technical_approach="approach",
        ai_metadata={
            "usage_stats": {
                "total_tokens": 10,
                "model_used": "gpt-4o-mini",
                "success": True,
            },
            "proven_cases": [],
            "assumptions": [],
            "alternatives": [],
            "technology_justification": [],
            "confidence_level": "High",
            "recommendations": [],
            "generated_at": "2026-01-01T00:00:00Z",
        },
    )
    target_proposal = Proposal(
        organization_id=target_org.id,
        project_id=target_project.id,
        version="v1.0",
        title="Target Proposal",
        proposal_type="Technical",
        status="Current",
        author="AI",
        capex=1.0,
        opex=1.0,
        executive_summary="summary",
        technical_approach="approach",
        ai_metadata={
            "usage_stats": {
                "total_tokens": 10,
                "model_used": "gpt-4o-mini",
                "success": True,
            },
            "proven_cases": [],
            "assumptions": [],
            "alternatives": [],
            "technology_justification": [],
            "confidence_level": "High",
            "recommendations": [],
            "generated_at": "2026-01-01T00:00:00Z",
        },
    )
    db_session.add_all([caller_proposal, target_proposal])
    await db_session.commit()
    await db_session.refresh(caller_proposal)
    await db_session.refresh(target_proposal)

    set_current_user(caller_user)
    allow_response = await client.get(
        f"/api/v1/ai/proposals/{caller_project.id}/proposals/{caller_proposal.id}/ai-metadata"
    )
    assert allow_response.status_code == 200

    cross_tenant_response = await client.get(
        f"/api/v1/ai/proposals/{target_project.id}/proposals/{target_proposal.id}/ai-metadata"
    )
    assert_error_contract(cross_tenant_response, 403, "ORG_ACCESS_DENIED")
