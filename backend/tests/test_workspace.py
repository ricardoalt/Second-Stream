import uuid
from datetime import UTC, datetime, timedelta

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient

from app.models.file import ProjectFile
from app.models.user import UserRole
from app.schemas.workspace import (
    WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS,
    WorkspaceCustomFieldItem,
    WorkspaceEvidenceRef,
    WorkspaceProposalItem,
)
from app.services.workspace_service import PROPOSAL_BATCH_TTL_SECONDS, WorkspaceService


def _workspace_payload(values: dict[str, str]) -> dict[str, object]:
    return {
        "workspace_v1": {
            "base_fields": values,
        }
    }


def _project_data_dict(project) -> dict[str, object]:
    data = project.project_data
    if not isinstance(data, dict):
        raise AssertionError("project_data must be a dict")
    return data


def _require_dict(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        raise AssertionError("value must be a dict")
    return {str(key): item for key, item in value.items()}


def _require_list_of_dicts(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        raise AssertionError("value must be a list")
    return [_require_dict(item) for item in value]


class _BatchScope:
    def __init__(self, project_id: uuid.UUID, organization_id: uuid.UUID) -> None:
        self.id = project_id
        self.organization_id = organization_id


@pytest.mark.asyncio
async def test_workspace_base_fields_read_write_and_readiness(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Base", f"org-workspace-base-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-base-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Base Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Base Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Base Project",
    )

    set_current_user(user)

    initial = await client.get(f"/api/v1/projects/{project.id}/workspace")
    assert initial.status_code == 200
    initial_data = initial.json()
    assert initial_data["derived"]["readiness"]["isReady"] is False
    assert initial_data["derived"]["readiness"]["missingBaseFields"] == [
        "material_type",
        "material_name",
        "composition",
        "volume",
        "frequency",
    ]

    response = await client.patch(
        f"/api/v1/projects/{project.id}/workspace/base-fields",
        json={
            "baseFields": [
                {"fieldId": "material_type", "value": "Plastic film"},
                {"fieldId": "material_name", "value": "LDPE trim"},
                {"fieldId": "composition", "value": "95% LDPE, 5% labels"},
                {"fieldId": "volume", "value": "12 tons/month"},
                {"fieldId": "frequency", "value": "Daily"},
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    values = {item["fieldId"]: item["value"] for item in data["baseFields"]}
    assert values == {
        "material_type": "Plastic film",
        "material_name": "LDPE trim",
        "composition": "95% LDPE, 5% labels",
        "volume": "12 tons/month",
        "frequency": "Daily",
    }
    assert data["derived"]["readiness"]["isReady"] is True
    assert data["derived"]["readiness"]["missingBaseFields"] == []

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    assert workspace_data["base_fields"] == values


@pytest.mark.asyncio
async def test_workspace_refresh_insights_returns_transient_proposal_batch(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Refresh", f"org-workspace-refresh-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-refresh-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Refresh Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Refresh Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Refresh Project",
    )
    project.project_data = _workspace_payload(
        {
            "material_type": "Plastic film",
            "material_name": "LDPE trim",
            "composition": "Mixed LDPE with labels",
            "volume": "12 tons/month",
            "frequency": "Daily",
        }
    )
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="sds.pdf",
        file_path="projects/test/sds.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        processed_text="SDS summary",
        ai_analysis={
            "summary": "Solvent-contaminated LDPE film.",
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums in covered area",
                    "confidence": 87,
                    "evidence_refs": [
                        {
                            "page": 2,
                            "excerpt": "Store material in closed drums in a covered area.",
                        }
                    ],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()
    await db_session.refresh(project)
    await db_session.refresh(evidence_file)

    set_current_user(user)

    response = await client.post(f"/api/v1/projects/{project.id}/workspace/refresh-insights")
    assert response.status_code == 200
    data = response.json()
    assert data["derived"]["summary"] == "Solvent-contaminated LDPE film."
    assert data["derived"]["facts"] == []
    assert data["derived"]["missingInformation"] == []
    assert len(data["proposalBatch"]["proposals"]) == 1
    assert data["proposalBatch"]["batchId"].startswith(f"wb-{project.id.hex[:12]}-")
    proposal = data["proposalBatch"]["proposals"][0]
    assert proposal["targetKind"] == "custom_field"
    assert proposal["baseFieldId"] is None
    assert proposal["proposedLabel"] == "Storage method"
    assert proposal["proposedAnswer"] == "Closed drums in covered area"
    assert proposal["tempId"].startswith("proposal-")
    assert proposal["evidenceRefs"][0]["fileId"] == str(evidence_file.id)
    assert proposal["evidenceRefs"][0]["filename"] == "sds.pdf"

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_derived = _require_dict(workspace_data["derived"])
    assert stored_derived["summary"] == data["derived"]["summary"]
    assert stored_derived["missing_information"] == []


@pytest.mark.asyncio
async def test_workspace_custom_fields_support_label_and_answer_updates(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session, "Org Workspace Custom Edit", f"org-workspace-custom-edit-{uid}"
    )
    user = await create_user(
        db_session,
        email=f"workspace-custom-edit-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Custom Edit Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Custom Edit Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Custom Edit Project",
    )
    project.project_data = {
        "workspace_v1": {
            "base_fields": {
                "material_type": "Plastic film",
                "material_name": "LDPE trim",
                "composition": "Mixed LDPE",
                "volume": "12 tons/month",
                "frequency": "Daily",
            },
            "custom_fields": [
                {
                    "id": "storage-method-1",
                    "label": "Storage method",
                    "answer": "Closed drums",
                    "created_at": "2026-03-17T10:00:00+00:00",
                    "created_by": "ai_confirmed",
                    "evidence_refs": [],
                    "confidence": 88,
                }
            ],
        }
    }
    await db_session.commit()

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}/workspace/custom-fields",
        json={
            "customFields": [
                {
                    "id": "storage-method-1",
                    "label": "Storage details",
                    "answer": "Closed drums in covered area",
                }
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["customFields"]) == 1
    assert data["customFields"][0]["label"] == "Storage details"
    assert data["customFields"][0]["answer"] == "Closed drums in covered area"

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_fields = _require_list_of_dicts(workspace_data["custom_fields"])
    assert stored_fields[0]["label"] == "Storage details"
    assert stored_fields[0]["answer"] == "Closed drums in covered area"


@pytest.mark.asyncio
async def test_confirm_selected_proposals_creates_custom_fields(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Confirm", f"org-workspace-confirm-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-confirm-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Confirm Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Confirm Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Confirm Project",
    )
    project.project_data = _workspace_payload(
        {
            "material_type": "Plastic film",
            "material_name": "LDPE trim",
            "composition": "Mixed LDPE",
            "volume": "12 tons/month",
            "frequency": "Daily",
        }
    )
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="sds.pdf",
        file_path="projects/test/sds.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        processed_text="SDS summary",
        ai_analysis={
            "summary": "Summary",
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums in covered area",
                    "confidence": 88,
                    "evidence_refs": [{"page": 2, "excerpt": "Store material in closed drums."}],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()
    await db_session.refresh(evidence_file)

    set_current_user(user)
    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": "wb-missing-batch",
            "proposals": [
                {
                    "tempId": "p1",
                    "proposedLabel": "Storage method",
                    "proposedAnswer": "Closed drums in covered area",
                    "selected": True,
                },
                {
                    "tempId": "p2",
                    "selected": False,
                },
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "WORKSPACE_PROPOSAL_BATCH_INVALID"

    refresh_response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/refresh-insights"
    )
    assert refresh_response.status_code == 200
    batch_id = refresh_response.json()["proposalBatch"]["batchId"]

    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": batch_id,
            "proposals": [
                {
                    "tempId": refresh_response.json()["proposalBatch"]["proposals"][0]["tempId"],
                    "proposedLabel": "Storage method",
                    "proposedAnswer": "Closed drums in covered area",
                    "selected": True,
                },
                {
                    "tempId": "p2",
                    "selected": False,
                },
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ignoredTempIds"] == ["p2"]
    assert len(data["createdFields"]) == 1
    created = data["createdFields"][0]
    assert created["label"] == "Storage method"
    assert created["answer"] == "Closed drums in covered area"
    assert created["createdBy"] == "ai_confirmed"
    assert created["confidence"] == 88
    assert created["evidenceRefs"][0]["filename"] == "sds.pdf"
    assert len(data["workspace"]["customFields"]) == 1

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_fields = _require_list_of_dicts(workspace_data["custom_fields"])
    assert len(stored_fields) == 1
    assert stored_fields[0]["label"] == "Storage method"


@pytest.mark.asyncio
async def test_confirm_custom_proposal_applies_user_edits(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Confirm Stored",
        f"org-workspace-confirm-stored-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-confirm-stored-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Confirm Stored Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Confirm Stored Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Confirm Stored Project",
    )
    project.project_data = _workspace_payload(
        {
            "material_type": "Plastic film",
            "material_name": "LDPE trim",
            "composition": "Mixed LDPE",
            "volume": "12 tons/month",
            "frequency": "Daily",
        }
    )
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="sds.pdf",
        file_path="projects/test/sds.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        processed_text="SDS summary",
        ai_analysis={
            "summary": "Summary",
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums in covered area",
                    "confidence": 88,
                    "evidence_refs": [{"page": 2, "excerpt": "Store material in closed drums."}],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()
    await db_session.refresh(evidence_file)

    set_current_user(user)
    refresh_response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/refresh-insights"
    )
    assert refresh_response.status_code == 200
    batch = refresh_response.json()["proposalBatch"]
    temp_id = batch["proposals"][0]["tempId"]

    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": batch["batchId"],
            "proposals": [
                {
                    "tempId": temp_id,
                    "proposedLabel": "Storage details",
                    "proposedAnswer": "Closed drums in covered loading zone",
                    "selected": True,
                }
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    created = data["createdFields"][0]
    assert created["label"] == "Storage details"
    assert created["answer"] == "Closed drums in covered loading zone"

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_fields = _require_list_of_dicts(workspace_data["custom_fields"])
    assert len(stored_fields) == 1
    assert stored_fields[0]["label"] == "Storage details"
    assert stored_fields[0]["answer"] == "Closed drums in covered loading zone"


@pytest.mark.asyncio
async def test_confirm_base_field_proposal_applies_answer_edit(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Base Edit", f"org-workspace-base-edit-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-base-edit-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Base Edit Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Base Edit Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Base Edit Project",
    )
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="lab.pdf",
        file_path="projects/test/lab.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="analysis",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "summary": "Lab summary",
            "proposals": [
                {
                    "target_kind": "base_field",
                    "base_field_id": "volume",
                    "answer": "10 tons/month",
                    "confidence": 85,
                    "evidence_refs": [{"page": 1, "excerpt": "Monthly output around 10 tons."}],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()

    set_current_user(user)
    refresh = await client.post(f"/api/v1/projects/{project.id}/workspace/refresh-insights")
    assert refresh.status_code == 200
    proposal = refresh.json()["proposalBatch"]["proposals"][0]

    confirm = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": refresh.json()["proposalBatch"]["batchId"],
            "proposals": [
                {
                    "tempId": proposal["tempId"],
                    "proposedAnswer": "12 tons/month",
                    "selected": True,
                }
            ],
        },
    )
    assert confirm.status_code == 200
    base_fields = confirm.json()["workspace"]["baseFields"]
    base_values = {item["fieldId"]: item["value"] for item in base_fields}
    assert base_values["volume"] == "12 tons/month"


@pytest.mark.asyncio
async def test_confirm_custom_proposal_missing_answer_fails_with_400(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Invalid Edit", f"org-workspace-invalid-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-invalid-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Invalid Edit Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Invalid Edit Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Invalid Edit Project",
    )
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="sds.pdf",
        file_path="projects/test/sds.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "summary": "Summary",
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums",
                    "confidence": 80,
                    "evidence_refs": [{"page": 1, "excerpt": "Stored in closed drums."}],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()

    set_current_user(user)
    refresh = await client.post(f"/api/v1/projects/{project.id}/workspace/refresh-insights")
    assert refresh.status_code == 200
    proposal = refresh.json()["proposalBatch"]["proposals"][0]

    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": refresh.json()["proposalBatch"]["batchId"],
            "proposals": [{"tempId": proposal["tempId"], "selected": True}],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "WORKSPACE_INVALID_PROPOSAL_EDIT"


@pytest.mark.asyncio
async def test_confirm_custom_proposal_empty_label_fails_with_400(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Invalid Label",
        f"org-workspace-invalid-label-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-invalid-label-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Invalid Label Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Invalid Label Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Invalid Label Project",
    )
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="sds.pdf",
        file_path="projects/test/sds.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "summary": "Summary",
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums",
                    "confidence": 80,
                    "evidence_refs": [{"page": 1, "excerpt": "Stored in closed drums."}],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()

    set_current_user(user)
    refresh = await client.post(f"/api/v1/projects/{project.id}/workspace/refresh-insights")
    assert refresh.status_code == 200
    proposal = refresh.json()["proposalBatch"]["proposals"][0]

    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": refresh.json()["proposalBatch"]["batchId"],
            "proposals": [
                {
                    "tempId": proposal["tempId"],
                    "proposedLabel": "   ",
                    "proposedAnswer": "Closed drums",
                    "selected": True,
                }
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "WORKSPACE_INVALID_PROPOSAL_EDIT"


@pytest.mark.asyncio
async def test_confirm_proposal_cannot_edit_base_fields(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session, "Org Workspace Base Guard", f"org-workspace-base-guard-{uid}"
    )
    user = await create_user(
        db_session,
        email=f"workspace-base-guard-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Base Guard Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Base Guard Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Base Guard Project",
    )

    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="sds.pdf",
        file_path="projects/test/sds.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        processed_text="SDS summary",
        ai_analysis={
            "summary": "Summary",
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums",
                    "confidence": 80,
                    "evidence_refs": [{"page": 1, "excerpt": "Stored in closed drums."}],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()

    set_current_user(user)
    refresh_response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/refresh-insights"
    )
    assert refresh_response.status_code == 200
    batch_id = refresh_response.json()["proposalBatch"]["batchId"]

    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": batch_id,
            "proposals": [
                {
                    "tempId": refresh_response.json()["proposalBatch"]["proposals"][0]["tempId"],
                    "proposedLabel": "Material type",
                    "proposedAnswer": "HDPE",
                    "selected": True,
                }
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "WORKSPACE_BASE_FIELD_EDIT_FORBIDDEN"

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = project_data.get("workspace_v1")
    if workspace_data is not None:
        assert _require_dict(workspace_data).get("custom_fields") is None


@pytest.mark.asyncio
async def test_confirm_proposal_batch_expired_returns_invalid(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Expired", f"org-workspace-expired-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-expired-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Expired Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Expired Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Expired Project",
    )

    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="sds.pdf",
        file_path="projects/test/sds.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        processed_text="SDS summary",
        ai_analysis={
            "summary": "Summary",
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums in covered area",
                    "confidence": 88,
                    "evidence_refs": [{"page": 2, "excerpt": "Store material in closed drums."}],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()
    await db_session.refresh(evidence_file)

    import app.services.workspace_service as workspace_service_module

    async def _cache_miss(_batch_id: str):
        return None

    monkeypatch.setattr(workspace_service_module.cache_service, "get", _cache_miss)

    set_current_user(user)
    refresh_response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/refresh-insights"
    )
    assert refresh_response.status_code == 200
    batch = refresh_response.json()["proposalBatch"]
    batch_id = batch["batchId"]
    temp_id = batch["proposals"][0]["tempId"]

    stored_payload = WorkspaceService._proposal_batch_fallback_store[batch_id]
    stored_payload["expires_at"] = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()

    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/custom-fields/confirm",
        json={
            "batchId": batch_id,
            "proposals": [
                {
                    "tempId": temp_id,
                    "proposedLabel": "Storage method",
                    "proposedAnswer": "Closed drums in covered area",
                    "selected": True,
                }
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "WORKSPACE_PROPOSAL_BATCH_INVALID"
    assert batch_id not in WorkspaceService._proposal_batch_fallback_store


@pytest.mark.asyncio
async def test_workspace_batch_cache_payload_respects_expiry(monkeypatch):
    project_id = uuid.uuid4()
    org_id = uuid.uuid4()
    batch_id = "wb-cache-batch"
    project = _BatchScope(project_id=project_id, organization_id=org_id)
    proposal = WorkspaceProposalItem(
        temp_id="proposal-1",
        target_kind="custom_field",
        base_field_id=None,
        proposed_label="Storage method",
        proposed_answer="Closed drums",
        selected=True,
        evidence_refs=[
            WorkspaceEvidenceRef(
                file_id=uuid.uuid4(),
                filename="sds.pdf",
                page=1,
                excerpt="Stored in closed drums",
            )
        ],
        confidence=80,
    )
    expired_payload = WorkspaceService._build_proposal_batch_payload(
        project=project,
        proposals=[proposal],
        generated_at=datetime.now(UTC) - timedelta(seconds=PROPOSAL_BATCH_TTL_SECONDS + 1),
    )

    async def _cache_hit(_batch_id: str):
        return expired_payload

    async def _cache_delete(_batch_id: str):
        return True

    import app.services.workspace_service as workspace_service_module

    monkeypatch.setattr(workspace_service_module.cache_service, "get", _cache_hit)
    monkeypatch.setattr(workspace_service_module.cache_service, "delete", _cache_delete)

    proposals = await WorkspaceService._get_stored_proposal_batch(
        batch_id=batch_id, project=project
    )
    assert proposals == []


def test_workspace_batch_fallback_cleanup_respects_ttl():
    live_batch_id = "wb-live-batch"
    expired_batch_id = "wb-expired-batch"
    WorkspaceService._proposal_batch_fallback_store.clear()
    WorkspaceService._proposal_batch_fallback_store[live_batch_id] = {
        "expires_at": (datetime.now(UTC) + timedelta(seconds=60)).isoformat(),
    }
    WorkspaceService._proposal_batch_fallback_store[expired_batch_id] = {
        "expires_at": (datetime.now(UTC) - timedelta(seconds=1)).isoformat(),
    }

    WorkspaceService._cleanup_expired_fallback_batches()

    assert live_batch_id in WorkspaceService._proposal_batch_fallback_store
    assert expired_batch_id not in WorkspaceService._proposal_batch_fallback_store


def test_collect_workspace_batch_proposals_dedupes_by_target_identity():
    project_id = uuid.uuid4()
    org_id = uuid.uuid4()
    first_file = ProjectFile(
        organization_id=org_id,
        project_id=project_id,
        filename="a.pdf",
        file_path="projects/test/a.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "proposals": [
                {
                    "target_kind": "base_field",
                    "base_field_id": "material_type",
                    "answer": "Plastic film",
                    "confidence": 60,
                    "evidence_refs": [{"page": 1, "excerpt": "Material: plastic film"}],
                },
                {
                    "target_kind": "custom_field",
                    "field_label": "UN number",
                    "answer": "UN1993",
                    "confidence": 80,
                    "evidence_refs": [{"page": 2, "excerpt": "UN Number: UN1993"}],
                },
            ]
        },
    )
    second_file = ProjectFile(
        organization_id=org_id,
        project_id=project_id,
        filename="b.pdf",
        file_path="projects/test/b.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "proposals": [
                {
                    "target_kind": "base_field",
                    "base_field_id": "material_type",
                    "answer": "Polymer waste",
                    "confidence": 95,
                    "evidence_refs": [{"page": 1, "excerpt": "Material: polymer waste"}],
                },
                {
                    "target_kind": "custom_field",
                    "field_label": "UN number",
                    "answer": "UN3264",
                    "confidence": 80,
                    "evidence_refs": [
                        {"page": 2, "excerpt": "UN Number: UN3264"},
                        {"page": 3, "excerpt": "Transport: UN3264"},
                    ],
                },
            ]
        },
    )

    proposals, raw_count = WorkspaceService._collect_workspace_batch_proposals(
        files=[first_file, second_file],
        custom_fields=[],
        base_values=WorkspaceService._get_workspace_base_values(None),
    )

    assert raw_count == 4
    assert len(proposals) == 2
    assert proposals[0].target_kind == "base_field"
    assert proposals[0].base_field_id == "material_type"
    assert proposals[0].proposed_answer == "Polymer waste"
    assert proposals[1].target_kind == "custom_field"
    assert proposals[1].proposed_label == "UN number"
    assert proposals[1].proposed_answer == "UN3264"


def test_collect_workspace_batch_proposals_drops_custom_labels_colliding_with_base_fields():
    project_id = uuid.uuid4()
    org_id = uuid.uuid4()
    file = ProjectFile(
        organization_id=org_id,
        project_id=project_id,
        filename="collision.pdf",
        file_path="projects/test/collision.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Material type",
                    "answer": "HDPE",
                    "confidence": 91,
                    "evidence_refs": [{"page": 1, "excerpt": "Material type: HDPE"}],
                }
            ]
        },
    )

    proposals, raw_count = WorkspaceService._collect_workspace_batch_proposals(
        files=[file],
        custom_fields=[],
        base_values=WorkspaceService._get_workspace_base_values(None),
    )

    assert raw_count == 1
    assert proposals == []


def test_collect_workspace_batch_proposals_applies_global_max_limit():
    project_id = uuid.uuid4()
    org_id = uuid.uuid4()
    raw_proposals: list[dict[str, object]] = [
        {
            "target_kind": "custom_field",
            "field_label": f"Field {index}",
            "answer": f"Answer {index}",
            "confidence": 60,
            "evidence_refs": [{"page": 1, "excerpt": f"Evidence {index}"}],
        }
        for index in range(WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS + 5)
    ]

    file = ProjectFile(
        organization_id=org_id,
        project_id=project_id,
        filename="many.pdf",
        file_path="projects/test/many.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={"proposals": raw_proposals},
    )

    proposals, raw_count = WorkspaceService._collect_workspace_batch_proposals(
        files=[file],
        custom_fields=[],
        base_values=WorkspaceService._get_workspace_base_values(None),
    )

    assert raw_count == WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS + 5
    assert len(proposals) == WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS
    assert proposals[0].proposed_label == "Field 0"
    assert proposals[-1].proposed_label == f"Field {WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS - 1}"


def test_collect_workspace_batch_proposals_treats_existing_custom_as_update():
    project_id = uuid.uuid4()
    org_id = uuid.uuid4()
    file = ProjectFile(
        organization_id=org_id,
        project_id=project_id,
        filename="updates.pdf",
        file_path="projects/test/updates.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Covered and ventilated area",
                    "confidence": 88,
                    "evidence_refs": [{"page": 1, "excerpt": "Store in covered ventilated area."}],
                }
            ]
        },
    )

    existing = WorkspaceCustomFieldItem(
        id="storage-method-1",
        label="Storage method",
        answer="Closed drums",
        created_at=datetime.now(UTC),
        created_by="ai_confirmed",
        evidence_refs=[],
        confidence=None,
    )

    proposals, raw_count = WorkspaceService._collect_workspace_batch_proposals(
        files=[file],
        custom_fields=[existing],
        base_values=WorkspaceService._get_workspace_base_values(None),
    )

    assert raw_count == 1
    assert len(proposals) == 1
    assert proposals[0].target_kind == "custom_field"
    assert proposals[0].existing_custom_field_id == "storage-method-1"
    assert proposals[0].proposed_label == "Storage method"
    assert proposals[0].proposed_answer == "Covered and ventilated area"


def test_collect_workspace_batch_proposals_suppresses_noop_updates():
    project_id = uuid.uuid4()
    org_id = uuid.uuid4()
    file = ProjectFile(
        organization_id=org_id,
        project_id=project_id,
        filename="noop.pdf",
        file_path="projects/test/noop.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "proposals": [
                {
                    "target_kind": "base_field",
                    "base_field_id": "material_type",
                    "answer": "Plastic film",
                    "confidence": 90,
                    "evidence_refs": [{"page": 1, "excerpt": "Material type: plastic film"}],
                },
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage method",
                    "answer": "Closed drums",
                    "confidence": 90,
                    "evidence_refs": [{"page": 1, "excerpt": "Stored in closed drums"}],
                },
            ]
        },
    )

    existing = WorkspaceCustomFieldItem(
        id="storage-method-1",
        label="Storage method",
        answer="Closed drums",
        created_at=datetime.now(UTC),
        created_by="ai_confirmed",
        evidence_refs=[],
        confidence=None,
    )
    base_values = WorkspaceService._get_workspace_base_values(None)
    base_values["material_type"] = "Plastic film"

    proposals, raw_count = WorkspaceService._collect_workspace_batch_proposals(
        files=[file],
        custom_fields=[existing],
        base_values=base_values,
    )

    assert raw_count == 2
    assert proposals == []


@pytest.mark.asyncio
async def test_workspace_readiness_uses_only_base_fields(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Readiness", f"org-workspace-readiness-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-readiness-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Readiness Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Readiness Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Readiness Project",
    )
    project.project_data = {
        "workspace_v1": {
            "base_fields": {
                "material_type": "Plastic film",
                "material_name": "LDPE trim",
                "composition": "Mixed LDPE",
                "volume": "",
                "frequency": "",
            },
            "custom_fields": [
                {
                    "id": "storage-method-1",
                    "label": "Storage method",
                    "answer": "Closed drums",
                    "created_at": "2026-03-17T10:00:00+00:00",
                    "created_by": "ai_confirmed",
                    "evidence_refs": [],
                }
            ],
        }
    }
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="lab.pdf",
        file_path="projects/test/lab.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="analysis",
        processing_status="completed",
        processing_attempts=1,
        processed_text="Lab summary",
        ai_analysis={"summary": "Lab summary", "proposals": []},
    )
    db_session.add(evidence_file)
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/workspace")
    assert response.status_code == 200
    data = response.json()
    assert data["derived"]["readiness"]["isReady"] is False
    assert data["derived"]["readiness"]["missingBaseFields"] == ["volume", "frequency"]
    assert data["derived"]["informationCoverage"] > 0


# ---------------------------------------------------------------------------
# Unit tests: WorkspaceService.build_workspace_v1_seed
# ---------------------------------------------------------------------------


def test_build_workspace_v1_seed_all_five_fields_always_present():
    seed = WorkspaceService.build_workspace_v1_seed()
    base_fields = seed["base_fields"]
    assert isinstance(base_fields, dict)
    for key in ["material_type", "material_name", "composition", "volume", "frequency"]:
        assert key in base_fields
        assert base_fields[key] == ""


def test_build_workspace_v1_seed_known_values_preserved():
    seed = WorkspaceService.build_workspace_v1_seed(
        material_type="Plastic film",
        material_name="LDPE trim",
        composition="95% LDPE",
        volume="12 tons/month",
    )
    bf = seed["base_fields"]
    assert bf["material_type"] == "Plastic film"
    assert bf["material_name"] == "LDPE trim"
    assert bf["composition"] == "95% LDPE"
    assert bf["volume"] == "12 tons/month"
    assert bf["frequency"] == ""


def test_build_workspace_v1_seed_strips_whitespace():
    seed = WorkspaceService.build_workspace_v1_seed(
        material_type="  Plastic film  ",
        material_name=" LDPE trim ",
        volume="  ",
    )
    bf = seed["base_fields"]
    assert bf["material_type"] == "Plastic film"
    assert bf["material_name"] == "LDPE trim"
    assert bf["volume"] == ""


def test_build_workspace_v1_seed_none_becomes_empty_string():
    seed = WorkspaceService.build_workspace_v1_seed(
        material_type=None,
        material_name="LDPE",
        composition=None,
        volume=None,
        frequency=None,
    )
    bf = seed["base_fields"]
    assert bf["material_type"] == ""
    assert bf["material_name"] == "LDPE"
    assert bf["composition"] == ""
    assert bf["volume"] == ""
    assert bf["frequency"] == ""


def test_collect_file_workspace_proposals_dedupes_by_confidence_then_evidence_count():
    project_id = uuid.uuid4()
    org_id = uuid.uuid4()
    first_file_id = uuid.uuid4()
    second_file_id = uuid.uuid4()
    first_file = ProjectFile(
        id=first_file_id,
        organization_id=org_id,
        project_id=project_id,
        filename="older.pdf",
        file_path="projects/test/older.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "UN number",
                    "answer": "UN1993",
                    "confidence": 80,
                    "evidence_refs": [{"page": 2, "excerpt": "UN Number: UN1993"}],
                },
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage conditions",
                    "answer": "Closed drums",
                    "confidence": 90,
                    "evidence_refs": [{"page": 3, "excerpt": "Store in closed drums"}],
                },
            ]
        },
    )
    second_file = ProjectFile(
        id=second_file_id,
        organization_id=org_id,
        project_id=project_id,
        filename="newer.pdf",
        file_path="projects/test/newer.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="regulatory",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "proposals": [
                {
                    "target_kind": "custom_field",
                    "field_label": "UN number",
                    "answer": "UN3264",
                    "confidence": 95,
                    "evidence_refs": [{"page": 1, "excerpt": "UN Number: UN3264"}],
                },
                {
                    "target_kind": "custom_field",
                    "field_label": "Storage conditions",
                    "answer": "Covered ventilated area",
                    "confidence": 90,
                    "evidence_refs": [
                        {"page": 4, "excerpt": "Keep covered."},
                        {"page": 5, "excerpt": "Ventilated area."},
                    ],
                },
            ]
        },
    )

    merged, raw_count = WorkspaceService._collect_workspace_batch_proposals(
        files=[second_file, first_file],
        custom_fields=[],
        base_values=WorkspaceService._get_workspace_base_values(None),
    )

    assert raw_count == 4
    assert len(merged) == 2
    assert merged[0].proposed_label == "UN number"
    assert merged[0].proposed_answer == "UN3264"
    assert merged[0].confidence == 95
    assert merged[1].proposed_label == "Storage conditions"
    assert merged[1].proposed_answer == "Covered ventilated area"
    assert merged[1].confidence == 90
    assert len(merged[1].evidence_refs) == 2


@pytest.mark.asyncio
async def test_workspace_hydrate_returns_five_base_fields_when_unseeded(
    client: AsyncClient, db_session, set_current_user
):
    """A project with no workspace_v1 data always returns all 5 base fields via hydrate."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org WS Unseeded", f"org-ws-unseeded-{uid}")
    user = await create_user(
        db_session,
        email=f"ws-unseeded-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="WS Unseeded Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="WS Unseeded Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="WS Unseeded Project",
    )
    # project_data has no workspace_v1 key at all
    project.project_data = {"technical_sections": []}
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/workspace")
    assert response.status_code == 200
    data = response.json()
    field_ids = [f["fieldId"] for f in data["baseFields"]]
    assert field_ids == ["material_type", "material_name", "composition", "volume", "frequency"]
    assert all(f["value"] == "" for f in data["baseFields"])


@pytest.mark.asyncio
async def test_workspace_hydrate_returns_seeded_values(
    client: AsyncClient, db_session, set_current_user
):
    """A project seeded via build_workspace_v1_seed returns prefilled base fields."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org WS Seeded", f"org-ws-seeded-{uid}")
    user = await create_user(
        db_session,
        email=f"ws-seeded-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="WS Seeded Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="WS Seeded Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="WS Seeded Project",
    )
    project.project_data = {
        "technical_sections": [],
        "workspace_v1": WorkspaceService.build_workspace_v1_seed(
            material_type="Plastic film",
            material_name="LDPE trim",
            composition="95% LDPE",
            volume="12 tons/month",
        ),
    }
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/workspace")
    assert response.status_code == 200
    data = response.json()
    values = {f["fieldId"]: f["value"] for f in data["baseFields"]}
    assert values["material_type"] == "Plastic film"
    assert values["material_name"] == "LDPE trim"
    assert values["composition"] == "95% LDPE"
    assert values["volume"] == "12 tons/month"
    assert values["frequency"] == ""


@pytest.mark.asyncio
async def test_workspace_complete_discovery_seeds_offer_insights_and_returns_offer_navigation(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Workspace Complete", f"org-workspace-complete-{uid}")
    user = await create_user(
        db_session,
        email=f"workspace-complete-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Complete Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Workspace Complete Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Complete Project",
    )

    async def _fake_offer_analysis(*_args, **_kwargs):
        from app.models.offer_insights_output import OfferInsightsOutput

        return OfferInsightsOutput(
            summary="Discovery evidence supports rapid offer preparation.",
            key_points=["Volume is documented"],
            risks=["Permit data pending confirmation"],
            recommendations=["Validate compliance annex before send"],
        )

    monkeypatch.setattr(
        "app.agents.offer_insights_agent.analyze_offer_insights",
        _fake_offer_analysis,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/workspace/complete-discovery")
    assert response.status_code == 200
    payload = response.json()
    assert payload["message"] == "Discovery marked complete"
    assert payload["offer"]["projectId"] == str(project.id)
    assert "proposalId" not in payload["offer"]

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    completed_at = workspace_data.get("discovery_completed_at")
    assert isinstance(completed_at, str)
    parsed = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
    assert parsed.tzinfo is not None

    offer_data = _require_dict(project_data.get("offer_v1"))
    insights = _require_dict(offer_data.get("insights"))
    freshness = _require_dict(offer_data.get("freshness"))
    assert insights["summary"] == "Discovery evidence supports rapid offer preparation."
    assert isinstance(freshness.get("generated_at"), str)


@pytest.mark.asyncio
async def test_workspace_complete_discovery_keeps_existing_proposals_but_not_navigation_contract(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Complete Reuse",
        f"org-workspace-complete-reuse-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-complete-reuse-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Complete Reuse Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Complete Reuse Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Complete Reuse Project",
    )
    from app.models.proposal import Proposal

    existing = Proposal(
        organization_id=org.id,
        project_id=project.id,
        version="v1.0",
        title="Existing proposal",
        proposal_type="Technical",
        status="Draft",
        author="AI",
        capex=0.0,
        opex=0.0,
        executive_summary="Existing executive summary",
        technical_approach="Existing technical approach",
        ai_metadata={"proposal": {"headline": "Existing proposal"}},
    )
    db_session.add(existing)
    await db_session.commit()
    await db_session.refresh(existing)

    async def _fake_offer_analysis(*_args, **_kwargs):
        from app.models.offer_insights_output import OfferInsightsOutput

        return OfferInsightsOutput(
            summary="Offer-ready baseline extracted from workspace.",
            key_points=["Base fields complete"],
            risks=["Pending legal checks"],
            recommendations=["Confirm pricing assumptions"],
        )

    monkeypatch.setattr(
        "app.agents.offer_insights_agent.analyze_offer_insights",
        _fake_offer_analysis,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/workspace/complete-discovery")
    assert response.status_code == 200
    payload = response.json()
    assert payload["offer"] == {"projectId": str(project.id)}


@pytest.mark.asyncio
async def test_workspace_complete_discovery_with_multiple_active_proposals_still_completes(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Complete Ambiguous",
        f"org-workspace-complete-ambiguous-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-complete-ambiguous-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Complete Ambiguous Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Complete Ambiguous Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Complete Ambiguous Project",
    )
    from app.models.proposal import Proposal

    first_active = Proposal(
        organization_id=org.id,
        project_id=project.id,
        version="v1.0",
        title="First active proposal",
        proposal_type="Technical",
        status="Draft",
        author="AI",
        capex=0.0,
        opex=0.0,
        executive_summary="First active executive summary",
        technical_approach="First active technical approach",
        ai_metadata={"proposal": {"headline": "First active proposal"}},
    )
    second_active = Proposal(
        organization_id=org.id,
        project_id=project.id,
        version="v2.0",
        title="Second active proposal",
        proposal_type="Technical",
        status="Current",
        author="AI",
        capex=0.0,
        opex=0.0,
        executive_summary="Second active executive summary",
        technical_approach="Second active technical approach",
        ai_metadata={"proposal": {"headline": "Second active proposal"}},
    )
    db_session.add_all([first_active, second_active])
    await db_session.commit()

    async def _fake_offer_analysis(*_args, **_kwargs):
        from app.models.offer_insights_output import OfferInsightsOutput

        return OfferInsightsOutput(
            summary="Insights generated without proposal coupling.",
            key_points=["Discovery completed"],
            risks=["Commercial terms pending"],
            recommendations=["Schedule client review"],
        )

    monkeypatch.setattr(
        "app.agents.offer_insights_agent.analyze_offer_insights",
        _fake_offer_analysis,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/workspace/complete-discovery")
    assert response.status_code == 200
    payload = response.json()
    assert payload["offer"] == {"projectId": str(project.id)}

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data.get("workspace_v1"))
    assert isinstance(workspace_data.get("discovery_completed_at"), str)


def test_questionnaire_phase_progress_marks_completion_by_phase_requirements():
    answers = {f"q{index}": "answered" for index in range(1, 10)}
    answers["q10"] = ""

    progress = WorkspaceService._calculate_questionnaire_phase_progress(answers)

    assert progress == {
        "1": True,
        "2": False,
        "3": False,
        "4": False,
    }


def test_questionnaire_first_incomplete_phase_defaults_to_four_when_all_complete():
    assert (
        WorkspaceService._calculate_first_incomplete_phase(
            {"1": True, "2": False, "3": False, "4": False}
        )
        == 2
    )
    assert (
        WorkspaceService._calculate_first_incomplete_phase(
            {"1": True, "2": True, "3": True, "4": True}
        )
        == 4
    )


@pytest.mark.asyncio
async def test_workspace_questionnaire_answers_persist_and_hydrate_progress(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Questionnaire",
        f"org-workspace-questionnaire-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-questionnaire-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Questionnaire Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Questionnaire Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Questionnaire Project",
    )

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}/workspace/questionnaire",
        json={
            "answers": [
                {"questionId": "q1", "value": "Spent Solvent A"},
                {"questionId": "q2", "value": "Tank flush"},
                {"questionId": "q3", "value": "Recurring"},
                {"questionId": "q4", "value": "12"},
                {"questionId": "q5", "value": "tons"},
                {"questionId": "q6", "value": "weekly"},
                {"questionId": "q7", "value": "Houston, TX, US"},
                {"questionId": "q8", "value": "drums"},
                {"questionId": "q9", "value": "within 30 days"},
                {"questionId": "q10", "value": ""},
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["questionnaireAnswers"]["q1"] == "Spent Solvent A"
    assert data["questionnaireAnswers"]["q10"] == ""
    assert data["phaseProgress"] == {
        "1": True,
        "2": False,
        "3": False,
        "4": False,
    }
    assert data["firstIncompletePhase"] == 2

    reload_response = await client.get(f"/api/v1/projects/{project.id}/workspace")
    assert reload_response.status_code == 200
    reloaded = reload_response.json()
    assert reloaded["questionnaireAnswers"]["q1"] == "Spent Solvent A"
    assert reloaded["questionnaireAnswers"]["q10"] == ""
    assert reloaded["phaseProgress"] == {
        "1": True,
        "2": False,
        "3": False,
        "4": False,
    }
    assert reloaded["firstIncompletePhase"] == 2

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_answers = _require_dict(workspace_data["questionnaire_answers"])
    stored_progress = _require_dict(workspace_data["phase_progress"])
    assert stored_answers["q1"] == "Spent Solvent A"
    assert stored_answers["q10"] == ""
    assert stored_progress == {"1": True, "2": False, "3": False, "4": False}


@pytest.mark.asyncio
async def test_workspace_refresh_insights_populates_questionnaire_suggestions(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Questionnaire Suggestions",
        f"org-workspace-questionnaire-suggestions-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-questionnaire-suggestions-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(
        db_session,
        org_id=org.id,
        name="Workspace Questionnaire Suggestions Co",
    )
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Questionnaire Suggestions Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Questionnaire Suggestions Project",
    )
    project.project_data = {
        "workspace_v1": {
            "questionnaire_answers": {
                "q4": "15 tons/month",
            }
        }
    }
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="lab.pdf",
        file_path="projects/test/lab.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="analysis",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "summary": "Lab summary",
            "proposals": [
                {
                    "target_kind": "base_field",
                    "base_field_id": "volume",
                    "answer": "12 tons/month",
                    "confidence": 89,
                    "evidence_refs": [
                        {
                            "page": 2,
                            "excerpt": "Estimated volume is 12 tons/month.",
                        }
                    ],
                },
                {
                    "target_kind": "base_field",
                    "base_field_id": "frequency",
                    "answer": "Daily",
                    "confidence": 78,
                    "evidence_refs": [
                        {
                            "page": 3,
                            "excerpt": "Material is generated daily.",
                        }
                    ],
                },
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/workspace/refresh-insights")
    assert response.status_code == 200
    payload = response.json()
    suggestions = payload["questionnaireSuggestions"]
    by_question = {item["questionId"]: item for item in suggestions}

    assert set(by_question.keys()) == {"q4", "q6"}
    assert by_question["q4"]["suggestedValue"] == "12 tons/month"
    assert by_question["q4"]["status"] == "pending"
    assert by_question["q4"]["hasConflict"] is True
    assert by_question["q4"]["confirmedAnswer"] == "15 tons/month"
    assert by_question["q6"]["suggestedValue"] == "Daily"
    assert by_question["q6"]["status"] == "pending"
    assert by_question["q6"]["hasConflict"] is False
    assert by_question["q6"]["confirmedAnswer"] is None

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_answers = _require_dict(workspace_data["questionnaire_answers"])
    stored_suggestions = _require_dict(workspace_data["questionnaire_suggestions"])
    assert stored_answers["q4"] == "15 tons/month"
    assert _require_dict(stored_suggestions["q4"])["status"] == "pending"
    assert _require_dict(stored_suggestions["q6"])["status"] == "pending"


@pytest.mark.asyncio
async def test_workspace_review_questionnaire_suggestions_accept_phase(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Questionnaire Review",
        f"org-workspace-questionnaire-review-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-questionnaire-review-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Review Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Review Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Review Project",
    )
    project.project_data = {
        "workspace_v1": {
            "questionnaire_answers": {},
            "questionnaire_suggestions": {
                "q4": {
                    "question_id": "q4",
                    "suggested_value": "12",
                    "status": "pending",
                    "phase": 1,
                    "section": "Stream Snapshot",
                    "updated_at": "2026-03-27T12:00:00+00:00",
                    "evidence_refs": [],
                    "confidence": 90,
                },
                "q6": {
                    "question_id": "q6",
                    "suggested_value": "Daily",
                    "status": "pending",
                    "phase": 1,
                    "section": "Stream Snapshot",
                    "updated_at": "2026-03-27T12:00:00+00:00",
                    "evidence_refs": [],
                    "confidence": 75,
                },
            },
        }
    }
    await db_session.commit()

    set_current_user(user)
    response = await client.post(
        f"/api/v1/projects/{project.id}/workspace/questionnaire-suggestions/review",
        json={
            "action": "accept",
            "scope": {"kind": "phase", "phase": 1},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["processedCount"] == 2
    assert payload["ignoredQuestionIds"] == []
    assert payload["workspace"]["questionnaireAnswers"]["q4"] == "12"
    assert payload["workspace"]["questionnaireAnswers"]["q6"] == "Daily"
    assert payload["workspace"]["questionnaireSuggestions"] == []

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_answers = _require_dict(workspace_data["questionnaire_answers"])
    stored_suggestions = _require_dict(workspace_data["questionnaire_suggestions"])
    assert stored_answers["q4"] == "12"
    assert stored_answers["q6"] == "Daily"
    assert stored_suggestions == {}


@pytest.mark.asyncio
async def test_workspace_rejected_questionnaire_suggestion_is_not_reintroduced(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(
        db_session,
        "Org Workspace Questionnaire Rejected",
        f"org-workspace-questionnaire-rejected-{uid}",
    )
    user = await create_user(
        db_session,
        email=f"workspace-questionnaire-rejected-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Workspace Rejected Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Workspace Rejected Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Workspace Rejected Project",
    )
    project.project_data = {
        "workspace_v1": {
            "questionnaire_suggestions": {
                "q4": {
                    "question_id": "q4",
                    "suggested_value": "12 tons/month",
                    "status": "rejected",
                    "phase": 1,
                    "section": "Stream Snapshot",
                    "updated_at": "2026-03-27T12:00:00+00:00",
                    "evidence_refs": [],
                    "confidence": 82,
                }
            }
        }
    }
    evidence_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="lab.pdf",
        file_path="projects/test/lab.pdf",
        file_size=100,
        mime_type="application/pdf",
        file_type="pdf",
        category="analysis",
        processing_status="completed",
        processing_attempts=1,
        ai_analysis={
            "summary": "Lab summary",
            "proposals": [
                {
                    "target_kind": "base_field",
                    "base_field_id": "volume",
                    "answer": "12 tons/month",
                    "confidence": 88,
                    "evidence_refs": [
                        {
                            "page": 1,
                            "excerpt": "Expected volume around 12 tons/month.",
                        }
                    ],
                }
            ],
        },
    )
    db_session.add(evidence_file)
    await db_session.commit()

    set_current_user(user)
    response = await client.post(f"/api/v1/projects/{project.id}/workspace/refresh-insights")
    assert response.status_code == 200
    payload = response.json()
    assert payload["questionnaireSuggestions"] == []

    await db_session.refresh(project)
    project_data = _project_data_dict(project)
    workspace_data = _require_dict(project_data["workspace_v1"])
    stored_suggestions = _require_dict(workspace_data["questionnaire_suggestions"])
    assert _require_dict(stored_suggestions["q4"])["status"] == "rejected"
