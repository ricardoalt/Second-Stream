import asyncio
import builtins
import importlib
import multiprocessing
import time
import uuid
from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from fastapi import HTTPException, UploadFile, status
from httpx import AsyncClient
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.v1 import bulk_import as bulk_import_api
from app.core.config import settings
from app.models.bulk_import import ImportItem, ImportRun
from app.models.bulk_import_ai_output import (
    BulkImportAILocationOutput,
    BulkImportAIOutput,
    BulkImportAIWasteStreamOutput,
)
from app.models.location import Location
from app.models.project import Project
from app.models.user import UserRole
from app.services.bulk_import_ai_extractor import (
    BulkImportAIExtractor,
    BulkImportAIExtractorError,
    ParsedRow,
)
from app.services.bulk_import_service import BulkImportService
from app.services.document_text_extractor import ExtractedTextResult
from app.services.storage_delete_service import StorageDeleteError, delete_storage_keys
from app.templates.assessment_questionnaire import get_assessment_questionnaire
from scripts.healthcheck_bulk_import_worker import _cmdline_matches_worker


def _slow_parse_for_timeout(_: str, __: bytes):
    time.sleep(5)
    return []


async def _create_run(
    db_session,
    *,
    org_id,
    user_id,
    entrypoint_type: str,
    entrypoint_id,
    status: str = "review_ready",
    summary: dict[str, object] | None = None,
) -> ImportRun:
    run = ImportRun(
        organization_id=org_id,
        created_by_user_id=user_id,
        entrypoint_type=entrypoint_type,
        entrypoint_id=entrypoint_id,
        source_file_path="imports/test.csv",
        source_filename="test.csv",
        status=status,
        summary_data=summary,
        processing_attempts=0,
    )
    db_session.add(run)
    await db_session.commit()
    await db_session.refresh(run)
    return run


async def _create_item(
    db_session,
    *,
    run: ImportRun,
    item_type: str,
    status: str,
    normalized_data: dict[str, object],
    parent_item_id=None,
    duplicate_candidates: list[dict[str, object]] | None = None,
) -> ImportItem:
    item = ImportItem(
        organization_id=run.organization_id,
        run_id=run.id,
        item_type=item_type,
        status=status,
        needs_review=(status == "pending_review"),
        confidence=90,
        extracted_data=normalized_data,
        normalized_data=normalized_data,
        parent_item_id=parent_item_id,
        duplicate_candidates=duplicate_candidates,
        confirm_create_new=False,
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(item)
    return item


@pytest.mark.asyncio
async def test_accept_does_not_create_entities_before_finalize(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import A", "org-import-a")
    user = await create_user(
        db_session,
        email=f"import-a-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    location_item = await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="pending_review",
        normalized_data={
            "name": "Planta Norte",
            "city": "Monterrey",
            "state": "NL",
            "address": "Av 1",
        },
    )
    project_item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        parent_item_id=location_item.id,
        normalized_data={
            "name": "Corriente PET",
            "category": "plastics",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "manufacturing",
            "estimated_volume": "5 tons/month",
        },
    )

    set_current_user(user)
    before_location_count = await db_session.scalar(
        select(func.count(Location.id)).where(Location.organization_id == org.id)
    )
    before_project_count = await db_session.scalar(
        select(func.count(Project.id)).where(Project.organization_id == org.id)
    )

    accept_location = await client.patch(
        f"/api/v1/bulk-import/items/{location_item.id}",
        json={"action": "accept"},
    )
    assert accept_location.status_code == 200
    accept_project = await client.patch(
        f"/api/v1/bulk-import/items/{project_item.id}",
        json={"action": "accept"},
    )
    assert accept_project.status_code == 200

    after_location_count = await db_session.scalar(
        select(func.count(Location.id)).where(Location.organization_id == org.id)
    )
    after_project_count = await db_session.scalar(
        select(func.count(Project.id)).where(Project.organization_id == org.id)
    )
    assert after_location_count == before_location_count
    assert after_project_count == before_project_count


@pytest.mark.asyncio
async def test_finalize_blocks_pending_review(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import B", "org-import-b")
    user = await create_user(
        db_session,
        email=f"import-b-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co B")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "L1", "city": "C", "state": "S"},
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_project_without_category_can_accept_and_finalize(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import B2", "org-import-b2")
    user = await create_user(
        db_session,
        email=f"import-b2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co B2")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    location_item = await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "L1", "city": "C", "state": "S"},
    )
    project_item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        parent_item_id=location_item.id,
        normalized_data={"name": "P without category", "project_type": "Assessment"},
    )

    set_current_user(user)

    before_project_count = await db_session.scalar(
        select(func.count(Project.id)).where(Project.organization_id == org.id)
    )

    accept_location = await client.patch(
        f"/api/v1/bulk-import/items/{location_item.id}",
        json={"action": "accept"},
    )
    assert accept_location.status_code == 200

    accept_project = await client.patch(
        f"/api/v1/bulk-import/items/{project_item.id}",
        json={"action": "accept"},
    )
    assert accept_project.status_code == 200
    assert accept_project.json()["status"] == "accepted"

    finalize_response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert finalize_response.status_code == 200
    assert finalize_response.json()["status"] == "completed"

    after_project_count = await db_session.scalar(
        select(func.count(Project.id)).where(Project.organization_id == org.id)
    )
    assert after_project_count == before_project_count + 1

    created_project_result = await db_session.execute(
        select(Project)
        .where(Project.organization_id == org.id)
        .where(Project.name == "P without category")
        .order_by(Project.created_at.desc())
    )
    created_project = created_project_result.scalars().first()
    assert created_project is not None
    project_data = created_project.project_data
    assert isinstance(project_data, dict)
    assert "bulk_import_category" not in project_data
    technical_sections = project_data.get("technical_sections")
    assert isinstance(technical_sections, list)
    assert len(technical_sections) == len(get_assessment_questionnaire())
    assert len(technical_sections) > 0


@pytest.mark.asyncio
async def test_project_without_category_can_amend_and_finalize(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import B3", "org-import-b3")
    user = await create_user(
        db_session,
        email=f"import-b3-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co B3")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    location_item = await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="accepted",
        normalized_data={"name": "L1", "city": "C", "state": "S"},
    )
    project_item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        parent_item_id=location_item.id,
        normalized_data={"name": "P pending"},
    )

    set_current_user(user)

    amend_project = await client.patch(
        f"/api/v1/bulk-import/items/{project_item.id}",
        json={
            "action": "amend",
            "normalizedData": {
                "name": "P amended",
                "project_type": "Assessment",
            },
        },
    )
    assert amend_project.status_code == 200
    assert amend_project.json()["status"] == "amended"

    finalize_response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert finalize_response.status_code == 200
    assert finalize_response.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_project_with_category_persists_bulk_import_category(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import B4", "org-import-b4")
    user = await create_user(
        db_session,
        email=f"import-b4-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co B4")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    location_item = await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "L1", "city": "C", "state": "S"},
    )
    project_item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        parent_item_id=location_item.id,
        normalized_data={
            "name": "P with category",
            "project_type": "Assessment",
            "category": "paper",
        },
    )

    set_current_user(user)

    accept_location = await client.patch(
        f"/api/v1/bulk-import/items/{location_item.id}",
        json={"action": "accept"},
    )
    assert accept_location.status_code == 200

    accept_project = await client.patch(
        f"/api/v1/bulk-import/items/{project_item.id}",
        json={"action": "accept"},
    )
    assert accept_project.status_code == 200
    assert accept_project.json()["status"] == "accepted"

    finalize_response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert finalize_response.status_code == 200
    assert finalize_response.json()["status"] == "completed"

    created_project_result = await db_session.execute(
        select(Project)
        .where(Project.organization_id == org.id)
        .where(Project.name == "P with category")
        .order_by(Project.created_at.desc())
    )
    created_project = created_project_result.scalars().first()
    assert created_project is not None
    project_data = created_project.project_data
    assert isinstance(project_data, dict)
    assert project_data.get("bulk_import_category") == "paper"
    technical_sections = project_data.get("technical_sections")
    assert isinstance(technical_sections, list)
    assert len(technical_sections) == len(get_assessment_questionnaire())
    assert len(technical_sections) > 0


@pytest.mark.asyncio
async def test_duplicate_requires_confirm_create_new(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import C", "org-import-c")
    user = await create_user(
        db_session,
        email=f"import-c-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co C")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "Dup", "category": "plastics", "project_type": "Assessment"},
        duplicate_candidates=[{"id": str(uuid.uuid4()), "reason_codes": ["name_match"]}],
    )

    set_current_user(user)
    missing_confirm = await client.patch(
        f"/api/v1/bulk-import/items/{item.id}",
        json={"action": "accept"},
    )
    assert missing_confirm.status_code == 409

    with_confirm = await client.patch(
        f"/api/v1/bulk-import/items/{item.id}",
        json={"action": "accept", "confirmCreateNew": True},
    )
    assert with_confirm.status_code == 200
    assert with_confirm.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_confirm_create_new_accept_action_on_previously_accepted_item(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import C2", "org-import-c2")
    user = await create_user(
        db_session,
        email=f"import-c2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co C2")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="accepted",
        normalized_data={"name": "Dup C2", "category": "plastics", "project_type": "Assessment"},
        duplicate_candidates=[{"id": str(uuid.uuid4()), "reason_codes": ["name_match"]}],
    )

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/bulk-import/items/{item.id}",
        json={"action": "accept", "confirmCreateNew": True},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_reject_location_cascades_projects(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import D", "org-import-d")
    user = await create_user(
        db_session,
        email=f"import-d-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co D")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    parent = await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "L1", "city": "C", "state": "S"},
    )
    child = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="accepted",
        parent_item_id=parent.id,
        normalized_data={"name": "P1", "category": "plastics", "project_type": "Assessment"},
    )

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/bulk-import/items/{parent.id}",
        json={"action": "reject"},
    )
    assert response.status_code == 200

    await db_session.refresh(child)
    assert child.status == "rejected"


@pytest.mark.asyncio
async def test_patch_item_returns_updated_at_without_missing_greenlet(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import Patch", "org-import-patch")
    user = await create_user(
        db_session,
        email=f"import-patch-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co Patch")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    accept_item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={
            "name": "Accept Item",
            "category": "plastics",
            "project_type": "Assessment",
        },
    )
    reject_item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "Reject Item", "category": "paper", "project_type": "Assessment"},
    )

    set_current_user(user)

    accept_response = await client.patch(
        f"/api/v1/bulk-import/items/{accept_item.id}",
        json={"action": "accept"},
    )
    assert accept_response.status_code == 200
    accept_payload = accept_response.json()
    assert accept_payload["status"] == "accepted"
    assert accept_payload["updatedAt"] is not None

    reject_response = await client.patch(
        f"/api/v1/bulk-import/items/{reject_item.id}",
        json={"action": "reject"},
    )
    assert reject_response.status_code == 200
    reject_payload = reject_response.json()
    assert reject_payload["status"] == "rejected"
    assert reject_payload["updatedAt"] is not None


@pytest.mark.asyncio
async def test_finalize_and_patch_do_not_deadlock(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import Lock", "org-import-lock")
    user = await create_user(
        db_session,
        email=f"import-lock-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co Lock")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "Lock Item", "category": "plastics", "project_type": "Assessment"},
    )

    set_current_user(user)
    patch_task = client.patch(
        f"/api/v1/bulk-import/items/{item.id}",
        json={"action": "accept"},
    )
    finalize_task = client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")

    patch_response, finalize_response = await asyncio.wait_for(
        asyncio.gather(patch_task, finalize_task),
        timeout=5,
    )

    assert patch_response.status_code in {200, 409}
    assert finalize_response.status_code in {200, 409}


@pytest.mark.asyncio
async def test_finalize_replay_completed_returns_summary(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import E", "org-import-e")
    user = await create_user(
        db_session,
        email=f"import-e-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co E")
    summary = {
        "runId": str(uuid.uuid4()),
        "locationsCreated": 1,
        "projectsCreated": 2,
        "rejected": 0,
        "invalid": 0,
        "duplicatesResolved": 1,
    }
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="completed",
        summary=summary,
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert response.status_code == 200
    assert response.json()["summary"] == summary


@pytest.mark.asyncio
async def test_items_pagination_and_status_filter(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import F", "org-import-f")
    user = await create_user(
        db_session,
        email=f"import-f-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co F")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="accepted",
        normalized_data={"name": "L1", "city": "C", "state": "S"},
    )
    await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="rejected",
        normalized_data={"name": "L2", "city": "C", "state": "S"},
    )
    await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "P1", "category": "plastics", "project_type": "Assessment"},
    )

    set_current_user(user)
    page_one = await client.get(f"/api/v1/bulk-import/runs/{run.id}/items?page=1&size=2")
    assert page_one.status_code == 200
    payload = page_one.json()
    assert payload["total"] == 3
    assert payload["pages"] == 2
    assert len(payload["items"]) == 2

    only_accepted = await client.get(
        f"/api/v1/bulk-import/runs/{run.id}/items?page=1&size=50&status=accepted"
    )
    assert only_accepted.status_code == 200
    accepted_payload = only_accepted.json()
    assert accepted_payload["total"] == 1
    assert accepted_payload["items"][0]["status"] == "accepted"


@pytest.mark.asyncio
async def test_rbac_blocks_non_allowed_roles(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G", "org-import-g")
    compliance_user = await create_user(
        db_session,
        email=f"import-g-{uid}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=compliance_user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )

    set_current_user(compliance_user)
    response = await client.get(f"/api/v1/bulk-import/runs/{run.id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_rbac_allows_superuser_for_bulk_import(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G2", "org-import-g2")
    superuser = await create_user(
        db_session,
        email=f"import-g2-super-{uid}@example.com",
        org_id=None,
        role=UserRole.COMPLIANCE.value,
        is_superuser=True,
    )
    owner = await create_user(
        db_session,
        email=f"import-g2-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G2")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )

    set_current_user(superuser)
    response = await client.get(
        f"/api/v1/bulk-import/runs/{run.id}",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_superuser_can_upload_bulk_import(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G3", "org-import-g3")
    superuser = await create_user(
        db_session,
        email=f"import-g3-super-{uid}@example.com",
        org_id=None,
        role=UserRole.COMPLIANCE.value,
        is_superuser=True,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G3")

    async def _noop_upload(_stream, _storage_key: str, _content_type: str | None):
        return None

    monkeypatch.setattr(bulk_import_api, "upload_file_to_s3", _noop_upload)

    set_current_user(superuser)
    response = await client.post(
        "/api/v1/bulk-import/upload",
        headers={"X-Organization-Id": str(org.id)},
        data={
            "entrypoint_type": "company",
            "entrypoint_id": str(company.id),
        },
        files={
            "file": (
                "import.xlsx",
                BytesIO(b"fake-xlsx"),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_superuser_can_patch_bulk_import_item(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G4", "org-import-g4")
    superuser = await create_user(
        db_session,
        email=f"import-g4-super-{uid}@example.com",
        org_id=None,
        role=UserRole.CONTRACTOR.value,
        is_superuser=True,
    )
    owner = await create_user(
        db_session,
        email=f"import-g4-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G4")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
    )
    item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "P", "category": "plastics", "project_type": "Assessment"},
    )

    set_current_user(superuser)
    response = await client.patch(
        f"/api/v1/bulk-import/items/{item.id}",
        headers={"X-Organization-Id": str(org.id)},
        json={"action": "accept"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_superuser_can_finalize_bulk_import(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G5", "org-import-g5")
    superuser = await create_user(
        db_session,
        email=f"import-g5-super-{uid}@example.com",
        org_id=None,
        role=UserRole.CONTRACTOR.value,
        is_superuser=True,
    )
    owner = await create_user(
        db_session,
        email=f"import-g5-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G5")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=owner.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="review_ready",
    )
    parent = await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="accepted",
        normalized_data={"name": "L1", "city": "C", "state": "S", "address": "A"},
    )
    await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="accepted",
        parent_item_id=parent.id,
        normalized_data={
            "name": "P1",
            "category": "plastics",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "other",
            "estimated_volume": "1",
        },
    )

    async def _noop_delete(_keys: list[str]):
        return None

    import app.services.bulk_import_service as bulk_import_module

    monkeypatch.setattr(bulk_import_module, "delete_storage_keys", _noop_delete)

    set_current_user(superuser)
    response = await client.post(
        f"/api/v1/bulk-import/runs/{run.id}/finalize",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_pending_run_rejects_invalid_entrypoint_type(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G6", "org-import-g6")
    user = await create_user(
        db_session,
        email=f"import-g6-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G6")

    set_current_user(user)
    response = await client.get(
        f"/api/v1/bulk-import/runs/pending?entrypoint_type=site&entrypoint_id={company.id}"
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_pending_run_does_not_leak_cross_org(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org_a = await create_org(db_session, "Org Import G7A", "org-import-g7a")
    org_b = await create_org(db_session, "Org Import G7B", "org-import-g7b")
    user_a = await create_user(
        db_session,
        email=f"import-g7a-{uid}@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email=f"import-g7b-{uid}@example.com",
        org_id=org_b.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_b = await create_company(db_session, org_id=org_b.id, name="Import Co G7B")
    await _create_run(
        db_session,
        org_id=org_b.id,
        user_id=user_b.id,
        entrypoint_type="company",
        entrypoint_id=company_b.id,
        status="review_ready",
    )

    set_current_user(user_a)
    response = await client.get(
        f"/api/v1/bulk-import/runs/pending?entrypoint_type=company&entrypoint_id={company_b.id}"
    )
    assert response.status_code == 200
    assert response.json() is None


@pytest.mark.asyncio
async def test_pending_run_returns_only_review_ready(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G8", "org-import-g8")
    user = await create_user(
        db_session,
        email=f"import-g8-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G8")

    await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="uploaded",
    )
    expected_run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="review_ready",
    )
    await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="completed",
    )

    set_current_user(user)
    response = await client.get(
        f"/api/v1/bulk-import/runs/pending?entrypoint_type=company&entrypoint_id={company.id}"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload is not None
    assert payload["id"] == str(expected_run.id)
    assert payload["status"] == "review_ready"


@pytest.mark.asyncio
async def test_pending_run_returns_latest_review_ready(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import G9", "org-import-g9")
    user = await create_user(
        db_session,
        email=f"import-g9-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co G9")

    older_run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="review_ready",
    )
    latest_run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="review_ready",
    )

    older_run.created_at = datetime.now(UTC) - timedelta(minutes=10)
    latest_run.created_at = datetime.now(UTC)
    await db_session.commit()

    set_current_user(user)
    response = await client.get(
        f"/api/v1/bulk-import/runs/pending?entrypoint_type=company&entrypoint_id={company.id}"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload is not None
    assert payload["id"] == str(latest_run.id)
    assert payload["status"] == "review_ready"


@pytest.mark.asyncio
async def test_cross_org_tampering_blocked(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org_a = await create_org(db_session, "Org Import H1", "org-import-h1")
    org_b = await create_org(db_session, "Org Import H2", "org-import-h2")
    user_a = await create_user(
        db_session,
        email=f"import-h-{uid}@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email=f"import-hb-{uid}@example.com",
        org_id=org_b.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_b = await create_company(db_session, org_id=org_b.id, name="Import Co H")
    run_b = await _create_run(
        db_session,
        org_id=org_b.id,
        user_id=user_b.id,
        entrypoint_type="company",
        entrypoint_id=company_b.id,
    )
    item_b = await _create_item(
        db_session,
        run=run_b,
        item_type="location",
        status="pending_review",
        normalized_data={"name": "L", "city": "C", "state": "S"},
    )

    set_current_user(user_a)
    run_resp = await client.get(f"/api/v1/bulk-import/runs/{run_b.id}")
    assert run_resp.status_code == 404

    item_resp = await client.patch(
        f"/api/v1/bulk-import/items/{item_b.id}",
        json={"action": "accept"},
    )
    assert item_resp.status_code == 404


@pytest.mark.asyncio
async def test_claim_next_run_row_lock(db_session, test_engine):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import I", "org-import-i")
    user = await create_user(
        db_session,
        email=f"import-i-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co I")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="uploaded",
    )
    assert run.status == "uploaded"

    service = BulkImportService()
    maker = async_sessionmaker(test_engine, expire_on_commit=False)
    async with maker() as s1, maker() as s2:
        claimed_1 = await service.claim_next_run(s1)
        claimed_2 = await service.claim_next_run(s2)
        assert claimed_1 is not None
        assert claimed_2 is None
        await s1.rollback()
        await s2.rollback()


@pytest.mark.asyncio
async def test_process_run_parser_limits(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import J", "org-import-j")
    user = await create_user(
        db_session,
        email=f"import-j-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co J")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )

    storage_root = Path(settings.LOCAL_STORAGE_PATH)
    imports_dir = storage_root / "imports"
    imports_dir.mkdir(parents=True, exist_ok=True)
    csv_path = imports_dir / f"rows-{uuid.uuid4()}.csv"
    csv_path.write_text("name,category\nA,plastics\nB,plastics\n", encoding="utf-8")

    run.source_file_path = f"imports/{csv_path.name}"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    monkeypatch.setattr(bulk_import_module, "MAX_IMPORT_ROWS", 1)

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "failed"
    assert run.processing_error is not None


@pytest.mark.asyncio
async def test_process_run_failure_handler_survives_expired_run_state(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import Expire", "org-import-expire")
    user = await create_user(
        db_session,
        email=f"import-expire-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co Expire")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.pdf"
    run.source_file_path = "imports/input.pdf"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _boom_download(_: str) -> bytes:
        raise RuntimeError("forced_processing_failure")

    original_rollback = db_session.rollback

    async def _rollback_and_expire() -> None:
        await original_rollback()
        db_session.expire(run)

    monkeypatch.setattr(bulk_import_module, "download_file_content", _boom_download)
    monkeypatch.setattr(db_session, "rollback", _rollback_and_expire)

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "uploaded"
    assert run.processing_error == "forced_processing_failure"


def test_bulk_import_service_imports_without_openpyxl(monkeypatch):
    original_import = builtins.__import__

    def _fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "openpyxl" or name.startswith("openpyxl."):
            raise ImportError("No module named 'openpyxl'")
        return original_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", _fake_import)

    import app.services.bulk_import_service as bulk_import_module

    reloaded = importlib.reload(bulk_import_module)
    assert hasattr(reloaded, "BulkImportService")


@pytest.mark.asyncio
async def test_process_run_xlsx_without_openpyxl_marks_run_failed(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import Xlsx Missing", "org-import-xlsx-missing")
    user = await create_user(
        db_session,
        email=f"import-xlsx-missing-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co Xlsx Missing")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.xlsx"
    run.source_file_path = "imports/input.xlsx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    original_import = builtins.__import__

    def _fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "openpyxl" or name.startswith("openpyxl."):
            raise ImportError("No module named 'openpyxl'")
        return original_import(name, globals, locals, fromlist, level)

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fail_extract_xlsx(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        raise bulk_import_module.BulkImportAIExtractorError("xlsx_parse_failed")

    monkeypatch.setattr(builtins, "__import__", _fake_import)
    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fail_extract_xlsx,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "failed"
    assert run.processing_error == "xlsx_parse_failed"


@pytest.mark.asyncio
async def test_process_run_docx_parse_failure_marks_run_failed(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import Docx Fail", "org-import-docx-fail")
    user = await create_user(
        db_session,
        email=f"import-docx-fail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co Docx Fail")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.docx"
    run.source_file_path = "imports/input.docx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-docx"

    async def _fail_extract_docx(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        raise bulk_import_module.BulkImportAIExtractorError("docx_parse_failed")

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fail_extract_docx,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "failed"
    assert run.processing_error == "docx_parse_failed"


@pytest.mark.asyncio
async def test_process_run_xlsx_empty_text_results_in_no_data(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import Xlsx Empty", "org-import-xlsx-empty")
    user = await create_user(
        db_session,
        email=f"import-xlsx-empty-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co Xlsx Empty")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.xlsx"
    run.source_file_path = "imports/input.xlsx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "no_data"


@pytest.mark.asyncio
async def test_process_run_docx_empty_text_results_in_no_data(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import Docx Empty", "org-import-docx-empty")
    user = await create_user(
        db_session,
        email=f"import-docx-empty-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co Docx Empty")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.docx"
    run.source_file_path = "imports/input.docx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-docx"

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "no_data"


@pytest.mark.asyncio
async def test_ai_schema_invalid_marks_run_failed(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI1", "org-import-ai1")
    user = await create_user(
        db_session,
        email=f"import-ai1-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI1")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.pdf"
    run.source_file_path = "imports/input.pdf"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-pdf"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        raise bulk_import_module.BulkImportAIExtractorError("ai_schema_invalid")

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "failed"
    assert run.processing_error == "ai_schema_invalid"


@pytest.mark.asyncio
async def test_ai_timeout_marks_run_failed(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI2", "org-import-ai2")
    user = await create_user(
        db_session,
        email=f"import-ai2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI2")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.xlsx"
    run.source_file_path = "imports/input.xlsx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        raise bulk_import_module.BulkImportAIExtractorError("ai_timeout")

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "failed"
    assert run.processing_error == "ai_timeout"


@pytest.mark.asyncio
async def test_ai_provider_error_marks_run_failed(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI2B", "org-import-ai2b")
    user = await create_user(
        db_session,
        email=f"import-ai2b-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI2B")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.pdf"
    run.source_file_path = "imports/input.pdf"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-pdf"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        raise bulk_import_module.BulkImportAIExtractorError("ai_provider_error")

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "failed"
    assert run.processing_error == "ai_provider_error"


@pytest.mark.asyncio
async def test_ai_no_streams_marks_run_no_data(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI3", "org-import-ai3")
    user = await create_user(
        db_session,
        email=f"import-ai3-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI3")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.pdf"
    run.source_file_path = "imports/input.pdf"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-pdf"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        return []

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "no_data"


@pytest.mark.asyncio
async def test_process_run_persists_progress_checkpoints_before_atomic_item_mutation(
    db_session, test_engine, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI3B", "org-import-ai3b")
    user = await create_user(
        db_session,
        email=f"import-ai3b-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI3B")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.xlsx"
    run.source_file_path = "imports/input.xlsx"
    await db_session.commit()

    await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "Legacy", "category": "paper", "project_type": "Assessment"},
    )

    import app.services.bulk_import_service as bulk_import_module

    verify_session_maker = async_sessionmaker(test_engine, expire_on_commit=False)

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        assert filename.endswith(".xlsx")
        assert file_bytes == b"fake-xlsx"
        async with verify_session_maker() as verify_session:
            persisted_phase = await verify_session.scalar(
                select(ImportRun.progress_step).where(ImportRun.id == run.id)
            )
            staged_count = await verify_session.scalar(
                select(func.count(ImportItem.id)).where(ImportItem.run_id == run.id)
            )
        assert persisted_phase == "extracting_streams"
        assert staged_count == 1
        return []

    async def _fake_build_items(
        self: BulkImportService,
        db,
        current_run: ImportRun,
        parsed_rows: list[ParsedRow],
    ) -> list[ImportItem]:
        assert current_run.id == run.id
        assert parsed_rows == []
        async with verify_session_maker() as verify_session:
            persisted_phase = await verify_session.scalar(
                select(ImportRun.progress_step).where(ImportRun.id == run.id)
            )
            staged_count = await verify_session.scalar(
                select(func.count(ImportItem.id)).where(ImportItem.run_id == run.id)
            )
        assert persisted_phase == "categorizing"
        assert staged_count == 1
        return []

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )
    monkeypatch.setattr(BulkImportService, "_build_import_items", _fake_build_items)

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    remaining_items = await db_session.scalar(
        select(func.count(ImportItem.id)).where(ImportItem.run_id == run.id)
    )
    assert run.status == "no_data"
    assert run.progress_step is None
    assert remaining_items == 0


@pytest.mark.asyncio
async def test_process_run_rollback_restores_items_when_failure_after_delete(
    db_session, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI3C", "org-import-ai3c")
    user = await create_user(
        db_session,
        email=f"import-ai3c-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI3C")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.xlsx"
    run.source_file_path = "imports/input.xlsx"
    await db_session.commit()

    await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "Legacy", "category": "paper", "project_type": "Assessment"},
    )

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        assert filename.endswith(".xlsx")
        assert file_bytes == b"fake-xlsx"
        return [
            ParsedRow(
                location_data={"name": "L1", "city": "C", "state": "S", "address": ""},
                project_data={
                    "name": "P1",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "90", "stream_evidence": "row1"},
            )
        ]

    async def _fail_refresh(*_args, **_kwargs) -> None:
        raise RuntimeError("post_delete_failure")

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )
    monkeypatch.setattr(BulkImportService, "refresh_run_counters", _fail_refresh)

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    run_items_result = await db_session.execute(
        select(ImportItem).where(ImportItem.run_id == run.id).order_by(ImportItem.created_at)
    )
    run_items = run_items_result.scalars().all()

    assert run.status == "failed"
    assert run.processing_error == "post_delete_failure"
    assert len(run_items) == 1
    assert run_items[0].normalized_data.get("name") == "Legacy"


@pytest.mark.asyncio
async def test_confidence_routing_sets_needs_review(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI4", "org-import-ai4")
    user = await create_user(
        db_session,
        email=f"import-ai4-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI4")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.xlsx"
    run.source_file_path = "imports/input.xlsx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        return [
            ParsedRow(
                location_data={"name": "L1", "city": "C", "state": "S", "address": ""},
                project_data=None,
                raw={"location_confidence": "85", "location_evidence": "row1"},
            ),
            ParsedRow(
                location_data={"name": "L1", "city": "C", "state": "S", "address": ""},
                project_data={
                    "name": "P-high",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "90", "stream_evidence": "row2"},
            ),
            ParsedRow(
                location_data={"name": "L1", "city": "C", "state": "S", "address": ""},
                project_data={
                    "name": "P-medium",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "70", "stream_evidence": "row3"},
            ),
            ParsedRow(
                location_data={"name": "L1", "city": "C", "state": "S", "address": ""},
                project_data={
                    "name": "P-low",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "45", "stream_evidence": "row4"},
            ),
        ]

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    items_result = await db_session.execute(
        select(ImportItem)
        .where(ImportItem.run_id == run.id)
        .where(ImportItem.item_type == "project")
        .order_by(ImportItem.normalized_data["name"].astext)
    )
    items = items_result.scalars().all()

    by_name = {str(item.normalized_data.get("name")): item for item in items}
    assert run.status == "review_ready"
    assert by_name["P-high"].needs_review is False
    assert by_name["P-medium"].needs_review is True
    assert by_name["P-low"].needs_review is True


def test_xlsx_matrix_collapse_by_concept_not_month() -> None:
    extractor = BulkImportAIExtractor()
    output = BulkImportAIOutput(
        locations=[
            BulkImportAILocationOutput(
                name="Planta Norte",
                city="Monterrey",
                state="NL",
                address=None,
                confidence=90,
                evidence=["Sheet1 A2"],
            )
        ],
        waste_streams=[
            BulkImportAIWasteStreamOutput(
                name="PET Enero 2026",
                category="plastics",
                location_ref="Planta Norte",
                description="stream jan",
                metadata={"month": "enero"},
                confidence=78,
                evidence=["Sheet1 B2"],
            ),
            BulkImportAIWasteStreamOutput(
                name="PET Febrero 2026",
                category="plastics",
                location_ref="Planta Norte",
                description="stream feb",
                metadata={"month": "febrero"},
                confidence=82,
                evidence=["Sheet1 B3"],
            ),
        ],
    )

    rows = extractor._to_parsed_rows(output)
    project_rows = [row for row in rows if row.project_data is not None]
    assert len(project_rows) == 1
    assert project_rows[0].project_data is not None
    assert project_rows[0].project_data["name"].casefold().startswith("pet")


def test_xlsx_matrix_collapse_by_concept_ignores_empty_or_distinct_category() -> None:
    extractor = BulkImportAIExtractor()
    output = BulkImportAIOutput(
        locations=[
            BulkImportAILocationOutput(
                name="Planta Norte",
                city="Monterrey",
                state="NL",
                address=None,
                confidence=91,
                evidence=["Sheet1 A2"],
            )
        ],
        waste_streams=[
            BulkImportAIWasteStreamOutput(
                name="Carton Enero 2026",
                category="",
                location_ref="Planta Norte",
                description="stream jan",
                metadata={"month": "enero"},
                confidence=76,
                evidence=["Sheet1 B2"],
            ),
            BulkImportAIWasteStreamOutput(
                name="Carton Febrero 2026",
                category="paper",
                location_ref="Planta Norte",
                description="stream feb",
                metadata={"month": "febrero"},
                confidence=84,
                evidence=["Sheet1 B3"],
            ),
        ],
    )

    rows = extractor._to_parsed_rows(output)
    project_rows = [row for row in rows if row.project_data is not None]

    assert len(project_rows) == 1
    assert project_rows[0].project_data is not None
    assert project_rows[0].project_data["name"].casefold().startswith("carton")
    assert project_rows[0].project_data["category"] == "paper"


def test_media_type_mapping_rejects_legacy_doc() -> None:
    extractor = BulkImportAIExtractor()
    with pytest.raises(BulkImportAIExtractorError, match="unsupported_file_type"):
        extractor._media_type_for_extension(".doc")


@pytest.mark.asyncio
async def test_ai_extractor_routes_pdf_to_binary_agent(monkeypatch):
    extractor = BulkImportAIExtractor()
    received: dict[str, object] = {}

    async def _fake_binary(
        *, file_bytes: bytes, filename: str, media_type: str
    ) -> BulkImportAIOutput:
        received["file_bytes"] = file_bytes
        received["filename"] = filename
        received["media_type"] = media_type
        return BulkImportAIOutput(locations=[], waste_streams=[])

    async def _fail_text(*, extracted_text: str, filename: str) -> BulkImportAIOutput:
        raise AssertionError("text agent should not be called")

    def _fail_xlsx(_: bytes) -> ExtractedTextResult:
        raise AssertionError("xlsx extractor should not be called")

    def _fail_docx(_: bytes) -> ExtractedTextResult:
        raise AssertionError("docx extractor should not be called")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent",
        _fake_binary,
    )
    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent_on_text",
        _fail_text,
    )
    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_xlsx_text", _fail_xlsx)
    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_docx_text", _fail_docx)

    rows = await extractor.extract_parsed_rows(file_bytes=b"fake-pdf", filename="input.pdf")

    assert rows == []
    assert received == {
        "file_bytes": b"fake-pdf",
        "filename": "input.pdf",
        "media_type": "application/pdf",
    }


@pytest.mark.asyncio
async def test_ai_extractor_routes_xlsx_to_text_agent(monkeypatch):
    extractor = BulkImportAIExtractor()
    received: dict[str, object] = {}
    extracted = ExtractedTextResult(text="A\tB", char_count=3, truncated=False)

    def _fake_xlsx(file_bytes: bytes) -> ExtractedTextResult:
        assert file_bytes == b"fake-xlsx"
        return extracted

    async def _fake_text(*, extracted_text: str, filename: str) -> BulkImportAIOutput:
        received["extracted_text"] = extracted_text
        received["filename"] = filename
        return BulkImportAIOutput(locations=[], waste_streams=[])

    async def _fail_binary(
        *, file_bytes: bytes, filename: str, media_type: str
    ) -> BulkImportAIOutput:
        raise AssertionError("binary agent should not be called")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_xlsx_text", _fake_xlsx)
    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent_on_text",
        _fake_text,
    )
    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent",
        _fail_binary,
    )

    rows = await extractor.extract_parsed_rows(file_bytes=b"fake-xlsx", filename="input.xlsx")

    assert rows == []
    assert received == {"extracted_text": extracted.text, "filename": "input.xlsx"}


@pytest.mark.asyncio
async def test_ai_extractor_routes_docx_to_text_agent(monkeypatch):
    extractor = BulkImportAIExtractor()
    received: dict[str, object] = {}
    extracted = ExtractedTextResult(text="Line 1\nLine 2", char_count=13, truncated=False)

    def _fake_docx(file_bytes: bytes) -> ExtractedTextResult:
        assert file_bytes == b"fake-docx"
        return extracted

    async def _fake_text(*, extracted_text: str, filename: str) -> BulkImportAIOutput:
        received["extracted_text"] = extracted_text
        received["filename"] = filename
        return BulkImportAIOutput(locations=[], waste_streams=[])

    async def _fail_binary(
        *, file_bytes: bytes, filename: str, media_type: str
    ) -> BulkImportAIOutput:
        raise AssertionError("binary agent should not be called")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_docx_text", _fake_docx)
    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent_on_text",
        _fake_text,
    )
    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent",
        _fail_binary,
    )

    rows = await extractor.extract_parsed_rows(file_bytes=b"fake-docx", filename="input.docx")

    assert rows == []
    assert received == {"extracted_text": extracted.text, "filename": "input.docx"}


@pytest.mark.asyncio
async def test_ai_extractor_empty_xlsx_text_returns_no_rows(monkeypatch):
    extractor = BulkImportAIExtractor()

    def _fake_xlsx(_: bytes) -> ExtractedTextResult:
        return ExtractedTextResult(text="   ", char_count=0, truncated=False)

    async def _fail_text(*, extracted_text: str, filename: str) -> BulkImportAIOutput:
        raise AssertionError("text agent should not be called")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_xlsx_text", _fake_xlsx)
    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent_on_text",
        _fail_text,
    )

    rows = await extractor.extract_parsed_rows(file_bytes=b"fake-xlsx", filename="input.xlsx")

    assert rows == []


@pytest.mark.asyncio
async def test_ai_extractor_empty_docx_text_returns_no_rows(monkeypatch):
    extractor = BulkImportAIExtractor()

    def _fake_docx(_: bytes) -> ExtractedTextResult:
        return ExtractedTextResult(text="\n\n", char_count=0, truncated=False)

    async def _fail_text(*, extracted_text: str, filename: str) -> BulkImportAIOutput:
        raise AssertionError("text agent should not be called")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_docx_text", _fake_docx)
    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent_on_text",
        _fail_text,
    )

    rows = await extractor.extract_parsed_rows(file_bytes=b"fake-docx", filename="input.docx")

    assert rows == []


@pytest.mark.asyncio
async def test_ai_extractor_xlsx_parse_failure_maps_error(monkeypatch):
    extractor = BulkImportAIExtractor()

    def _fail_xlsx(_: bytes) -> ExtractedTextResult:
        raise RuntimeError("parse_failed")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_xlsx_text", _fail_xlsx)

    with pytest.raises(BulkImportAIExtractorError, match="xlsx_parse_failed"):
        await extractor.extract_parsed_rows(file_bytes=b"fake-xlsx", filename="input.xlsx")


@pytest.mark.asyncio
async def test_ai_extractor_docx_parse_failure_maps_error(monkeypatch):
    extractor = BulkImportAIExtractor()

    def _fail_docx(_: bytes) -> ExtractedTextResult:
        raise RuntimeError("parse_failed")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(bulk_import_ai_extractor_module, "extract_docx_text", _fail_docx)

    with pytest.raises(BulkImportAIExtractorError, match="docx_parse_failed"):
        await extractor.extract_parsed_rows(file_bytes=b"fake-docx", filename="input.docx")


@pytest.mark.asyncio
async def test_ai_extractor_rejects_legacy_doc(monkeypatch):
    extractor = BulkImportAIExtractor()

    async def _fail_binary(
        *, file_bytes: bytes, filename: str, media_type: str
    ) -> BulkImportAIOutput:
        raise AssertionError("binary agent should not be called")

    import app.services.bulk_import_ai_extractor as bulk_import_ai_extractor_module

    monkeypatch.setattr(
        bulk_import_ai_extractor_module,
        "run_bulk_import_extraction_agent",
        _fail_binary,
    )

    with pytest.raises(BulkImportAIExtractorError, match="unsupported_file_type"):
        await extractor.extract_parsed_rows(file_bytes=b"fake-doc", filename="input.doc")


@pytest.mark.asyncio
async def test_scanned_pdf_happy_path(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import AI5", "org-import-ai5")
    user = await create_user(
        db_session,
        email=f"import-ai5-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co AI5")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "scan.pdf"
    run.source_file_path = "imports/scan.pdf"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-pdf"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        return [
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "Monterrey",
                    "state": "NL",
                    "address": "",
                },
                project_data=None,
                raw={"location_confidence": "89", "location_evidence": "page1"},
            ),
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "Monterrey",
                    "state": "NL",
                    "address": "",
                },
                project_data={
                    "name": "Corriente Carton",
                    "category": "paper",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "87", "stream_evidence": "page2"},
            ),
        ]

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "review_ready"
    assert run.total_items == 2


@pytest.mark.asyncio
async def test_company_entrypoint_prefetch_dedupe_keeps_results(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import J2", "org-import-j2")
    user = await create_user(
        db_session,
        email=f"import-j2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co J2")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Planta Norte",
    )
    existing_project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Corriente PET",
    )
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "rows.xlsx"
    run.source_file_path = "imports/rows.xlsx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        assert filename.endswith(".xlsx")
        assert file_bytes == b"fake-xlsx"
        return [
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "City",
                    "state": "State",
                    "address": "",
                },
                project_data=None,
                raw={"location_confidence": "92", "location_evidence": "table row"},
            ),
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "City",
                    "state": "State",
                    "address": "",
                },
                project_data={
                    "name": "Corriente PET",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "88", "stream_evidence": "table row"},
            ),
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "City",
                    "state": "State",
                    "address": "",
                },
                project_data={
                    "name": "Corriente PET",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "88", "stream_evidence": "table row"},
            ),
        ]

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    project_items_result = await db_session.execute(
        select(ImportItem)
        .where(ImportItem.run_id == run.id)
        .where(ImportItem.item_type == "project")
        .order_by(ImportItem.created_at)
    )
    project_items = project_items_result.scalars().all()

    assert run.status == "review_ready"
    assert len(project_items) == 2
    assert all(item.duplicate_candidates for item in project_items)
    assert all(
        any(
            candidate.get("id") == str(existing_project.id)
            for candidate in item.duplicate_candidates or []
        )
        for item in project_items
    )


@pytest.mark.asyncio
async def test_location_entrypoint_prefetches_project_duplicates_single_query(
    db_session, test_engine, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import J3", "org-import-j3")
    user = await create_user(
        db_session,
        email=f"import-j3-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co J3")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Planta Norte",
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Corriente PET",
    )
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="location",
        entrypoint_id=location.id,
        status="processing",
    )
    run.source_filename = "rows.xlsx"
    run.source_file_path = "imports/rows.xlsx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        assert filename.endswith(".xlsx")
        assert file_bytes == b"fake-xlsx"
        return [
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "City",
                    "state": "State",
                    "address": "",
                },
                project_data={
                    "name": "Corriente PET",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "91", "stream_evidence": "table row"},
            ),
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "City",
                    "state": "State",
                    "address": "",
                },
                project_data={
                    "name": "Corriente PET",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "91", "stream_evidence": "table row"},
            ),
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "City",
                    "state": "State",
                    "address": "",
                },
                project_data={
                    "name": "Corriente PET",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "91", "stream_evidence": "table row"},
            ),
        ]

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    project_select_count = 0

    def _count_project_selects(_conn, _cursor, statement, _parameters, _context, _executemany):
        nonlocal project_select_count
        lowered = statement.lstrip().lower()
        if lowered.startswith("select") and " from projects" in lowered:
            project_select_count += 1

    event.listen(test_engine.sync_engine, "before_cursor_execute", _count_project_selects)
    try:
        service = BulkImportService()
        await service.process_run(db_session, run)
    finally:
        event.remove(test_engine.sync_engine, "before_cursor_execute", _count_project_selects)

    await db_session.refresh(run)
    project_items_result = await db_session.execute(
        select(ImportItem)
        .where(ImportItem.run_id == run.id)
        .where(ImportItem.item_type == "project")
    )
    project_items = project_items_result.scalars().all()

    assert run.status == "review_ready"
    assert project_select_count == 1
    assert len(project_items) == 3
    assert all(item.duplicate_candidates for item in project_items)


@pytest.mark.asyncio
async def test_upload_rejects_legacy_xls(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import K", "org-import-k")
    user = await create_user(
        db_session,
        email=f"import-k-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co K")

    set_current_user(user)
    response = await client.post(
        "/api/v1/bulk-import/upload",
        data={
            "entrypoint_type": "company",
            "entrypoint_id": str(company.id),
        },
        files={
            "file": (
                "legacy.xls",
                BytesIO(b"fake-xls"),
                "application/vnd.ms-excel",
            )
        },
    )
    assert response.status_code == 400
    assert "legacy .xls" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_upload_accepts_docx(client: AsyncClient, db_session, set_current_user, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import K2", "org-import-k2")
    user = await create_user(
        db_session,
        email=f"import-k2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co K2")

    async def _noop_upload(_stream, _storage_key: str, _content_type: str | None):
        return None

    monkeypatch.setattr(bulk_import_api, "upload_file_to_s3", _noop_upload)

    set_current_user(user)
    response = await client.post(
        "/api/v1/bulk-import/upload",
        data={
            "entrypoint_type": "company",
            "entrypoint_id": str(company.id),
        },
        files={
            "file": (
                "import.docx",
                BytesIO(b"fake-docx"),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_upload_rejects_legacy_doc(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import K3", "org-import-k3")
    user = await create_user(
        db_session,
        email=f"import-k3-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co K3")

    set_current_user(user)
    response = await client.post(
        "/api/v1/bulk-import/upload",
        data={
            "entrypoint_type": "company",
            "entrypoint_id": str(company.id),
        },
        files={
            "file": (
                "legacy.doc",
                BytesIO(b"fake-doc"),
                "application/msword",
            )
        },
    )
    assert response.status_code == 400
    assert "unsupported file type" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_upload_rejects_csv(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import K4", "org-import-k4")
    user = await create_user(
        db_session,
        email=f"import-k4-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co K4")

    set_current_user(user)
    response = await client.post(
        "/api/v1/bulk-import/upload",
        data={
            "entrypoint_type": "company",
            "entrypoint_id": str(company.id),
        },
        files={
            "file": (
                "legacy.csv",
                BytesIO(b"name,city\nA,Monterrey\n"),
                "text/csv",
            )
        },
    )
    assert response.status_code == 400
    assert "unsupported file type" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_process_run_allows_docx_extension(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import K5", "org-import-k5")
    user = await create_user(
        db_session,
        email=f"import-k5-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co K5")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="processing",
    )
    run.source_filename = "input.docx"
    run.source_file_path = "imports/input.docx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-docx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        assert file_bytes == b"fake-docx"
        assert filename.endswith(".docx")
        return []

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    assert run.status == "no_data"


@pytest.mark.asyncio
async def test_location_entrypoint_external_rows_become_invalid(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import L", "org-import-l")
    user = await create_user(
        db_session,
        email=f"import-l-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co L")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Planta Norte",
    )
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="location",
        entrypoint_id=location.id,
        status="processing",
    )
    run.source_filename = "rows.xlsx"
    run.source_file_path = "imports/rows.xlsx"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _fake_download(_: str) -> bytes:
        return b"fake-xlsx"

    async def _fake_extract(*, file_bytes: bytes, filename: str) -> list[ParsedRow]:
        assert filename.endswith(".xlsx")
        assert file_bytes == b"fake-xlsx"
        return [
            ParsedRow(
                location_data={
                    "name": "Planta Norte",
                    "city": "City",
                    "state": "State",
                    "address": "",
                },
                project_data={
                    "name": "Linea A",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "82", "stream_evidence": "sheet row 1"},
            ),
            ParsedRow(
                location_data={
                    "name": "Planta Sur",
                    "city": "Guadalajara",
                    "state": "Jalisco",
                    "address": "",
                },
                project_data={
                    "name": "Linea B",
                    "category": "plastics",
                    "project_type": "Assessment",
                    "description": "",
                    "sector": "",
                    "subsector": "",
                    "estimated_volume": "",
                },
                raw={"stream_confidence": "82", "stream_evidence": "sheet row 2"},
            ),
        ]

    monkeypatch.setattr(bulk_import_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        bulk_import_module.bulk_import_ai_extractor,
        "extract_parsed_rows",
        _fake_extract,
    )

    service = BulkImportService()
    await service.process_run(db_session, run)
    await db_session.refresh(run)

    items_result = await db_session.execute(select(ImportItem).where(ImportItem.run_id == run.id))
    items = items_result.scalars().all()
    location_items = [item for item in items if item.item_type == "location"]
    project_items = [item for item in items if item.item_type == "project"]

    assert run.status == "review_ready"
    assert len(location_items) == 2
    assert all(item.status == "invalid" for item in location_items)
    assert {item.status for item in project_items} == {"pending_review", "invalid"}


@pytest.mark.asyncio
async def test_finalize_rolls_back_all_entities_on_item_failure(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import M", "org-import-m")
    user = await create_user(
        db_session,
        email=f"import-m-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co M")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="review_ready",
    )
    parent = await _create_item(
        db_session,
        run=run,
        item_type="location",
        status="accepted",
        normalized_data={"name": "L1", "city": "City", "state": "State", "address": "A"},
    )
    await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="accepted",
        parent_item_id=parent.id,
        normalized_data={
            "name": "P1",
            "category": "plastics",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "other",
            "estimated_volume": "1 ton/month",
        },
    )

    before_location_count = await db_session.scalar(
        select(func.count(Location.id)).where(Location.organization_id == org.id)
    )
    before_project_count = await db_session.scalar(
        select(func.count(Project.id)).where(Project.organization_id == org.id)
    )

    async def _induced_failure(self: BulkImportService, **_kwargs: object) -> Location:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="induced_failure")

    monkeypatch.setattr(
        BulkImportService, "_resolve_project_location_for_finalize", _induced_failure
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert response.status_code == 409

    after_location_count = await db_session.scalar(
        select(func.count(Location.id)).where(Location.organization_id == org.id)
    )
    after_project_count = await db_session.scalar(
        select(func.count(Project.id)).where(Project.organization_id == org.id)
    )
    assert after_location_count == before_location_count
    assert after_project_count == before_project_count

    await db_session.refresh(run)
    assert run.status == "review_ready"


@pytest.mark.asyncio
async def test_finalize_fails_when_new_duplicate_appears_after_review(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import M2", "org-import-m2")
    user = await create_user(
        db_session,
        email=f"import-m2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co M2")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Planta Norte",
    )
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="location",
        entrypoint_id=location.id,
        status="review_ready",
    )
    await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="accepted",
        normalized_data={
            "name": "Corriente PET",
            "category": "plastics",
            "project_type": "Assessment",
            "description": "desc",
            "sector": "industrial",
            "subsector": "other",
            "estimated_volume": "1 ton/month",
        },
    )

    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Corriente PET",
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert response.status_code == 409
    assert "duplicate" in response.json()["error"]["message"].casefold()

    await db_session.refresh(run)
    assert run.status == "review_ready"


@pytest.mark.asyncio
async def test_finalize_conflict_when_run_not_review_ready(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import N", "org-import-n")
    user = await create_user(
        db_session,
        email=f"import-n-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co N")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="failed",
    )

    set_current_user(user)
    response = await client.post(f"/api/v1/bulk-import/runs/{run.id}/finalize")
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_parse_timeout_cancels_effectively():
    service = BulkImportService()

    started_at = time.monotonic()
    with pytest.raises(ValueError, match="parser_timeout"):
        await service._parse_source_with_hard_timeout(
            filename="slow.csv",
            file_bytes=b"name,category\nA,plastics\n",
            timeout_seconds=0.2,
            parse_callable=_slow_parse_for_timeout,
        )
    elapsed = time.monotonic() - started_at
    assert elapsed < 2.0

    lingering = [
        child
        for child in multiprocessing.active_children()
        if child.name == "bulk-import-parse-worker" and child.is_alive()
    ]
    for child in lingering:
        child.terminate()
        child.join(timeout=1)
    assert lingering == []


@pytest.mark.asyncio
async def test_large_ipc_payload_does_not_false_timeout():
    service = BulkImportService()
    header = "location_name,city,state,project_name,category\n"
    rows = [f"L{i},City,State,P{i},plastics" for i in range(1400)]
    payload_bytes = (header + "\n".join(rows) + "\n").encode("utf-8")

    result = await service._parse_source_with_hard_timeout(
        filename="large.csv",
        file_bytes=payload_bytes,
        timeout_seconds=20.0,
    )
    assert len(result) == 1400


class _UploadDbCommitFailStub:
    def __init__(self, organization_id):
        self.organization_id = organization_id
        self.rollback_called = False
        self.added_run = None

    async def get(self, _model, entrypoint_id):
        return SimpleNamespace(id=entrypoint_id, organization_id=self.organization_id)

    def add(self, run):
        self.added_run = run

    async def commit(self):
        raise RuntimeError("commit_failed")

    async def rollback(self):
        self.rollback_called = True


@pytest.mark.asyncio
async def test_upload_commit_failure_cleans_up_storage_key(monkeypatch):
    organization_id = uuid.uuid4()
    entrypoint_id = uuid.uuid4()
    user_id = uuid.uuid4()

    db_stub = _UploadDbCommitFailStub(organization_id)
    uploaded_keys: list[str] = []
    deleted_keys: list[str] = []

    async def _fake_upload(_stream, storage_key: str, _content_type):
        uploaded_keys.append(storage_key)

    async def _fake_delete(keys: list[str]):
        deleted_keys.extend(keys)

    monkeypatch.setattr(bulk_import_api, "upload_file_to_s3", _fake_upload)
    monkeypatch.setattr(bulk_import_api, "delete_storage_keys", _fake_delete)

    upload = UploadFile(
        file=BytesIO(b"fake-xlsx"),
        filename="import.xlsx",
    )

    with pytest.raises(RuntimeError, match="commit_failed"):
        await bulk_import_api.upload_bulk_import_file(
            entrypoint_type="company",
            entrypoint_id=entrypoint_id,
            file=upload,
            current_user=SimpleNamespace(id=user_id),
            org=SimpleNamespace(id=organization_id),
            db=db_stub,
        )

    assert db_stub.rollback_called is True
    assert len(uploaded_keys) == 1
    assert deleted_keys == uploaded_keys


def test_healthcheck_excludes_self_process_cmdline() -> None:
    healthcheck_raw = b"python\x00/app/scripts/healthcheck_bulk_import_worker.py\x00"
    worker_raw = b"python\x00/app/scripts/bulk_import_worker.py\x00"

    assert _cmdline_matches_worker(healthcheck_raw) is False
    assert _cmdline_matches_worker(worker_raw) is True


@pytest.mark.asyncio
async def test_local_storage_delete_failure_raises(monkeypatch):
    imports_dir = Path(settings.LOCAL_STORAGE_PATH) / "imports"
    imports_dir.mkdir(parents=True, exist_ok=True)
    file_path = imports_dir / f"unlink-fail-{uuid.uuid4()}.txt"
    file_path.write_text("x", encoding="utf-8")

    def _raise_unlink(self: Path, missing_ok: bool = False) -> None:
        raise OSError("forced unlink failure")

    monkeypatch.setattr(Path, "unlink", _raise_unlink)

    with pytest.raises(StorageDeleteError, match="Failed to delete local storage path"):
        await delete_storage_keys([f"imports/{file_path.name}"], use_s3=False)


@pytest.mark.asyncio
async def test_purge_does_not_mark_success_when_storage_delete_fails(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Import O", "org-import-o")
    user = await create_user(
        db_session,
        email=f"import-o-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Import Co O")
    run = await _create_run(
        db_session,
        org_id=org.id,
        user_id=user.id,
        entrypoint_type="company",
        entrypoint_id=company.id,
        status="failed",
    )
    item = await _create_item(
        db_session,
        run=run,
        item_type="project",
        status="pending_review",
        normalized_data={"name": "P", "category": "plastics", "project_type": "Assessment"},
    )

    original_source_path = "imports/failing-delete.csv"
    run.source_file_path = original_source_path
    run.created_at = datetime.now(UTC) - timedelta(days=120)
    item.extracted_data = {"raw": "keep"}
    item.review_notes = "keep-note"
    await db_session.commit()

    import app.services.bulk_import_service as bulk_import_module

    async def _raise_delete_error(_: list[str]) -> None:
        raise RuntimeError("delete_failed")

    monkeypatch.setattr(bulk_import_module, "delete_storage_keys", _raise_delete_error)

    service = BulkImportService()
    purged_count = await service.purge_expired_artifacts(db_session)
    await db_session.commit()

    await db_session.refresh(run)
    await db_session.refresh(item)

    assert purged_count == 0
    assert run.artifacts_purged_at is None
    assert run.source_file_path == original_source_path
    assert item.extracted_data == {"raw": "keep"}
    assert item.review_notes == "keep-note"
