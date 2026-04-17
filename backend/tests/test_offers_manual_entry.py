import io
import uuid

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient
from sqlalchemy import select

from app.models.file import ProjectFile
from app.models.offer_document import OfferDocument
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_create_manual_offer_requires_file(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Missing File", f"org-manual-no-file-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-no-file-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    response = await client.post(
        "/api/v1/offers",
        data={
            "client": "Acme",
            "location": "Plant 1",
            "title": "External offer",
            "initial_status": "waiting_response",
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("field", "value", "expected_status"),
    [
        ("client", "", 422),
        ("location", "", 422),
        ("title", "", 422),
        ("client", "   ", 400),
        ("location", "\t", 400),
        ("title", "\n", 400),
    ],
)
async def test_create_manual_offer_rejects_missing_or_whitespace_required_text_fields(
    client: AsyncClient,
    db_session,
    set_current_user,
    field: str,
    value: str,
    expected_status: int,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Required Fields", f"org-manual-required-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-required-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    payload = {
        "client": "Acme",
        "location": "Plant 1",
        "title": "External offer",
        "initial_status": "uploaded",
    }
    payload[field] = value

    response = await client.post(
        "/api/v1/offers",
        data=payload,
        files={
            "file": (
                "manual-offer.pdf",
                io.BytesIO(b"manual offer content"),
                "application/pdf",
            )
        },
    )

    assert response.status_code == expected_status


@pytest.mark.asyncio
async def test_create_manual_offer_rejects_missing_client_location_or_title_keys(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Missing Keys", f"org-manual-missing-keys-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-missing-keys-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    for missing_key in ("client", "location", "title"):
        payload = {
            "client": "Acme",
            "location": "Plant 1",
            "title": "External offer",
            "initial_status": "uploaded",
        }
        payload.pop(missing_key)

        response = await client.post(
            "/api/v1/offers",
            data=payload,
            files={
                "file": (
                    "manual-offer.pdf",
                    io.BytesIO(b"manual offer content"),
                    "application/pdf",
                )
            },
        )

        assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_manual_offer_and_list_pipeline(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Offer", f"org-manual-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    response = await client.post(
        "/api/v1/offers",
        data={
            "client": "Acme",
            "location": "Plant 1",
            "title": "External offer",
            "initial_status": "waiting_response",
        },
        files={
            "file": (
                "manual-offer.pdf",
                io.BytesIO(b"manual offer content"),
                "application/pdf",
            )
        },
    )

    assert response.status_code == 201
    created = response.json()
    assert created["offerId"]
    assert created["projectId"] is None
    assert created["sourceType"] == "manual"
    assert created["followUpState"] == "waiting_response"
    assert created["offerDocument"]["filename"] == "manual-offer.pdf"

    pipeline_response = await client.get("/api/v1/offers/pipeline")
    assert pipeline_response.status_code == 200
    pipeline_payload = pipeline_response.json()
    assert pipeline_payload["counts"]["total"] == 1
    assert pipeline_payload["counts"]["waitingResponse"] == 1
    assert pipeline_payload["items"][0]["offerId"] == created["offerId"]
    assert pipeline_payload["items"][0]["projectId"] is None
    assert pipeline_payload["items"][0]["streamName"] == "External offer"


@pytest.mark.asyncio
async def test_manual_offer_detail_uses_offer_context_card(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Detail", f"org-manual-detail-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    create_response = await client.post(
        "/api/v1/offers",
        data={
            "client": "Acme",
            "location": "Plant 1",
            "title": "Manual detail offer",
            "initial_status": "uploaded",
        },
        files={
            "file": (
                "manual-offer.pdf",
                io.BytesIO(b"manual offer content"),
                "application/pdf",
            )
        },
    )
    assert create_response.status_code == 201
    offer_id = create_response.json()["offerId"]

    detail_response = await client.get(f"/api/v1/offers/{offer_id}")
    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["sourceType"] == "manual"
    assert payload["contextCard"]["title"] == "Offer context"
    fields = {item["label"]: item["value"] for item in payload["contextCard"]["fields"]}
    assert fields["Client"] == "Acme"
    assert fields["Location"] == "Plant 1"
    assert fields["Offer title"] == "Manual detail offer"
    assert "Material type" not in fields
    assert "Material name" not in fields
    assert "Composition" not in fields
    assert "Volume" not in fields
    assert "Frequency" not in fields
    assert all((value or "").strip() for value in fields.values())


@pytest.mark.asyncio
async def test_stream_offer_detail_alias_works_with_context_card(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Stream Alias", f"org-stream-alias-{uid}")
    user = await create_user(
        db_session,
        email=f"stream-alias-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Stream Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Stream Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Stream Offer",
    )
    project.project_data = {
        "workspace_v1": {
            "base_fields": {
                "material_type": "Plastic",
                "material_name": "LDPE",
            }
        }
    }
    project.proposal_follow_up_state = "uploaded"
    await db_session.commit()
    set_current_user(user)

    alias_response = await client.get(f"/api/v1/projects/{project.id}/offer")
    assert alias_response.status_code == 200
    payload = alias_response.json()
    assert payload["sourceType"] == "stream"
    assert payload["projectId"] == str(project.id)
    assert payload["contextCard"]["title"] == "Stream snapshot"


@pytest.mark.asyncio
async def test_manual_offer_not_listed_in_projects_views(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Isolation", f"org-manual-isolation-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-isolation-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    create_response = await client.post(
        "/api/v1/offers",
        data={
            "client": "Acme",
            "location": "Plant 1",
            "title": "Manual isolated offer",
            "initial_status": "uploaded",
        },
        files={
            "file": (
                "manual-offer.pdf",
                io.BytesIO(b"manual offer content"),
                "application/pdf",
            )
        },
    )
    assert create_response.status_code == 201

    projects_response = await client.get("/api/v1/projects")
    assert projects_response.status_code == 200
    assert projects_response.json()["total"] == 0

    dashboard_total_response = await client.get("/api/v1/projects/dashboard?bucket=total")
    assert dashboard_total_response.status_code == 200
    dashboard_total_payload = dashboard_total_response.json()
    assert dashboard_total_payload["total"] == 0
    assert dashboard_total_payload["counts"]["total"] == 0

    dashboard_proposal_response = await client.get("/api/v1/projects/dashboard?bucket=proposal")
    assert dashboard_proposal_response.status_code == 200
    dashboard_proposal_payload = dashboard_proposal_response.json()
    assert dashboard_proposal_payload["total"] == 0
    assert dashboard_proposal_payload["counts"]["proposal"] == 0


@pytest.mark.asyncio
async def test_manual_offer_status_moves_between_pipeline_and_archive(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Status", f"org-manual-status-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-status-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    create_response = await client.post(
        "/api/v1/offers",
        data={
            "client": "Acme",
            "location": "Plant 1",
            "title": "Manual status offer",
            "initial_status": "under_negotiation",
        },
        files={
            "file": (
                "manual-offer.pdf",
                io.BytesIO(b"manual offer content"),
                "application/pdf",
            )
        },
    )
    assert create_response.status_code == 201
    offer_id = create_response.json()["offerId"]

    initial_pipeline = await client.get("/api/v1/offers/pipeline")
    assert initial_pipeline.status_code == 200
    assert initial_pipeline.json()["counts"]["underNegotiation"] == 1

    transition_response = await client.patch(
        f"/api/v1/offers/{offer_id}/status",
        json={"state": "rejected"},
    )
    assert transition_response.status_code == 200
    assert transition_response.json()["followUpState"] == "rejected"

    archived_pipeline = await client.get("/api/v1/offers/pipeline")
    assert archived_pipeline.status_code == 200
    assert archived_pipeline.json()["counts"]["total"] == 0

    archive = await client.get("/api/v1/offers/archive")
    assert archive.status_code == 200
    assert archive.json()["counts"]["declined"] == 1
    assert archive.json()["items"][0]["offerId"] == offer_id


@pytest.mark.asyncio
async def test_manual_offer_document_replace_keeps_offer_identity(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Replace", f"org-manual-replace-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-replace-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    create_response = await client.post(
        "/api/v1/offers",
        data={
            "client": "Acme",
            "location": "Plant 1",
            "title": "Manual replace offer",
            "initial_status": "uploaded",
        },
        files={
            "file": (
                "manual-offer-v1.pdf",
                io.BytesIO(b"manual offer content v1"),
                "application/pdf",
            )
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    offer_id = created["offerId"]

    replace_response = await client.post(
        f"/api/v1/offers/{offer_id}/document",
        files={
            "file": (
                "manual-offer-v2.pdf",
                io.BytesIO(b"manual offer content v2"),
                "application/pdf",
            )
        },
    )
    assert replace_response.status_code == 200
    replaced = replace_response.json()
    assert replaced["offerId"] == offer_id
    assert replaced["followUpState"] == "uploaded"
    assert replaced["offerDocument"]["filename"] == "manual-offer-v2.pdf"


@pytest.mark.asyncio
async def test_stream_offer_document_replace_via_canonical_offer_endpoint(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Stream Canonical Replace", f"org-stream-replace-{uid}")
    user = await create_user(
        db_session,
        email=f"stream-replace-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Stream Replace Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Stream Replace Loc",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Stream Replace Offer",
    )
    set_current_user(user)

    detail_response = await client.get(f"/api/v1/projects/{project.id}/offer")
    assert detail_response.status_code == 200
    stream_offer_id = detail_response.json()["offerId"]

    first_upload_response = await client.post(
        f"/api/v1/offers/{stream_offer_id}/document",
        files={
            "file": (
                "stream-offer-v1.pdf",
                io.BytesIO(b"stream v1"),
                "application/pdf",
            )
        },
    )
    assert first_upload_response.status_code == 200
    assert first_upload_response.json()["offerDocument"]["filename"] == "stream-offer-v1.pdf"

    second_upload_response = await client.post(
        f"/api/v1/offers/{stream_offer_id}/document",
        files={
            "file": (
                "stream-offer-v2.pdf",
                io.BytesIO(b"stream v2"),
                "application/pdf",
            )
        },
    )
    assert second_upload_response.status_code == 200
    payload = second_upload_response.json()
    assert payload["offerId"] == stream_offer_id
    assert payload["projectId"] == str(project.id)
    assert payload["offerDocument"]["filename"] == "stream-offer-v2.pdf"

    offer_documents = (
        await db_session.execute(
            select(OfferDocument).where(
                OfferDocument.organization_id == org.id,
                OfferDocument.offer_id == uuid.UUID(stream_offer_id),
                OfferDocument.is_active.is_(True),
            )
        )
    ).scalars().all()
    assert len(offer_documents) == 1

    stream_offer_files = (
        await db_session.execute(
            select(ProjectFile).where(
                ProjectFile.organization_id == org.id,
                ProjectFile.project_id == project.id,
                ProjectFile.category == "offer_document",
            )
        )
    ).scalars().all()
    assert len(stream_offer_files) == 1
    assert stream_offer_files[0].filename == "stream-offer-v2.pdf"
