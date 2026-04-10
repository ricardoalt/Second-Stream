import uuid

import pytest
from conftest import create_company, create_location, create_org, create_user

from app.models.user import UserRole
from app.services.discovery_session_service import DiscoverySessionService


@pytest.mark.asyncio
async def test_create_session_ignores_location_without_client_for_ai_discovery(db_session) -> None:
    org = await create_org(db_session, "Discovery Service Scope Org", "discovery-service-scope")
    user = await create_user(
        db_session,
        email=f"discovery-service-scope-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Service Scope Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Discovery Service Scope Plant",
    )

    service = DiscoverySessionService()
    session = await service.create_session(
        db_session,
        organization_id=org.id,
        company_id=None,
        location_id=location.id,
        user_id=user.id,
        assigned_owner_user_id=None,
    )

    assert session.company_id is None
    assert session.location_id is None


@pytest.mark.asyncio
async def test_create_session_ignores_mismatched_preselected_client_location_pair(
    db_session,
) -> None:
    org = await create_org(db_session, "Discovery Service Pair Org", "discovery-service-pair")
    user = await create_user(
        db_session,
        email=f"discovery-service-pair-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company_a = await create_company(db_session, org_id=org.id, name="Discovery Service Pair Co A")
    company_b = await create_company(db_session, org_id=org.id, name="Discovery Service Pair Co B")
    location_b = await create_location(
        db_session,
        org_id=org.id,
        company_id=company_b.id,
        name="Discovery Service Pair Plant B",
    )

    service = DiscoverySessionService()
    session = await service.create_session(
        db_session,
        organization_id=org.id,
        company_id=company_a.id,
        location_id=location_b.id,
        user_id=user.id,
        assigned_owner_user_id=None,
    )

    assert session.company_id is None
    assert session.location_id is None


@pytest.mark.asyncio
async def test_create_session_with_preselected_client_keeps_org_scope_for_ai_discovery(
    db_session,
) -> None:
    org = await create_org(db_session, "Discovery Service Client Org", "discovery-service-client")
    user = await create_user(
        db_session,
        email=f"discovery-service-client-{uuid.uuid4().hex[:6]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Discovery Service Client Co")

    service = DiscoverySessionService()
    session = await service.create_session(
        db_session,
        organization_id=org.id,
        company_id=company.id,
        location_id=None,
        user_id=user.id,
        assigned_owner_user_id=None,
    )

    assert session.company_id is None
    assert session.location_id is None
