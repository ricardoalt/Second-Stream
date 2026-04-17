import uuid

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from sqlalchemy.exc import IntegrityError

from app.models.offer import Offer
from app.models.offer_document import OfferDocument
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_stream_offer_requires_project_id(db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Model", f"org-offer-model-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-model-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    db_session.add(
        Offer(
            organization_id=org.id,
            source_kind="stream",
            project_id=None,
            status="uploaded",
            display_title="Offer without project",
            created_by_user_id=user.id,
        )
    )

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_manual_offer_must_not_link_project(db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Manual Offer", f"org-manual-offer-{uid}")
    user = await create_user(
        db_session,
        email=f"manual-offer-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Offer Company")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Offer Location",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Offer Stream",
    )

    db_session.add(
        Offer(
            organization_id=org.id,
            source_kind="manual",
            project_id=project.id,
            status="uploaded",
            display_title="Manual offer",
            created_by_user_id=user.id,
        )
    )

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_one_stream_offer_per_project(db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Stream Offer", f"org-stream-offer-{uid}")
    user = await create_user(
        db_session,
        email=f"stream-offer-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Stream Company")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Stream Location",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Stream Project",
    )

    first_offer = Offer(
        organization_id=org.id,
        source_kind="stream",
        project_id=project.id,
        status="uploaded",
        display_title="First",
        created_by_user_id=user.id,
    )
    db_session.add(first_offer)
    await db_session.commit()

    db_session.add(
        Offer(
            organization_id=org.id,
            source_kind="stream",
            project_id=project.id,
            status="uploaded",
            display_title="Second",
            created_by_user_id=user.id,
        )
    )

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_only_one_active_offer_document_per_offer(db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Offer Docs", f"org-offer-docs-{uid}")
    user = await create_user(
        db_session,
        email=f"offer-docs-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    offer = Offer(
        organization_id=org.id,
        source_kind="manual",
        project_id=None,
        status="uploaded",
        display_title="Manual with docs",
        display_client="Client",
        display_location="Location",
        created_by_user_id=user.id,
    )
    db_session.add(offer)
    await db_session.flush()

    db_session.add(
        OfferDocument(
            offer_id=offer.id,
            organization_id=org.id,
            filename="offer-v1.pdf",
            file_path="offers/manual/offer-v1.pdf",
            file_size=1024,
            mime_type="application/pdf",
            uploaded_by=user.id,
            is_active=True,
        )
    )
    await db_session.commit()

    db_session.add(
        OfferDocument(
            offer_id=offer.id,
            organization_id=org.id,
            filename="offer-v2.pdf",
            file_path="offers/manual/offer-v2.pdf",
            file_size=2048,
            mime_type="application/pdf",
            uploaded_by=user.id,
            is_active=True,
        )
    )

    with pytest.raises(IntegrityError):
        await db_session.commit()
