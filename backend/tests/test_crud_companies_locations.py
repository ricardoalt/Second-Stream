import uuid

import pytest
from conftest import create_company, create_location, create_org, create_user
from httpx import AsyncClient

from app.models.user import UserRole


@pytest.mark.asyncio
async def test_list_companies(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org List Co", "org-list-co")
    user = await create_user(
        db_session,
        email=f"list-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    await create_company(db_session, org_id=org.id, name="Company A")
    await create_company(db_session, org_id=org.id, name="Company B")

    set_current_user(user)
    response = await client.get("/api/v1/companies/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {c["name"] for c in data}
    assert "Company A" in names
    assert "Company B" in names
    allowed_customer_types = {"buyer", "generator", "both"}
    allowed_account_statuses = {"active", "prospect"}
    for company in data:
        assert "customerType" in company
        assert company["customerType"] in allowed_customer_types
        assert "accountStatus" in company
        assert company["accountStatus"] in allowed_account_statuses


@pytest.mark.asyncio
async def test_create_company_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Co", "org-create-co")
    user = await create_user(
        db_session,
        email=f"create-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "New Company",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Company"
    assert data["industry"] == "Technology"
    assert data["customerType"] == "buyer"
    assert data["accountStatus"] == "active"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_company_with_prospect_account_status(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Prospect Account", "org-prospect-account")
    user = await create_user(
        db_session,
        email=f"prospect-account-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Prospect Company",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "generator",
            "accountStatus": "prospect",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Prospect Company"
    assert data["accountStatus"] == "prospect"


@pytest.mark.asyncio
async def test_create_company_missing_required_field(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Missing Field", "org-missing-field")
    user = await create_user(
        db_session,
        email=f"missing-field-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Bad Co",
            "industry": "Tech",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_company_invalid_customer_type(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Invalid Customer Type", "org-invalid-ct")
    user = await create_user(
        db_session,
        email=f"invalid-ct-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Bad Customer Type Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "invalid",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_company_detail(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Detail Co", "org-detail-co")
    user = await create_user(
        db_session,
        email=f"detail-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Detail Company")
    await create_location(db_session, org_id=org.id, company_id=company.id, name="Location 1")

    set_current_user(user)
    response = await client.get(f"/api/v1/companies/{company.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Company"
    assert data["customerType"] == "both"
    assert "locations" in data
    assert len(data["locations"]) == 1


@pytest.mark.asyncio
async def test_get_company_not_found(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Not Found", "org-not-found")
    user = await create_user(
        db_session,
        email=f"not-found-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/v1/companies/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Co", "org-update-co")
    user = await create_user(
        db_session,
        email=f"update-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Old Name")

    set_current_user(user)
    response = await client.put(
        f"/api/v1/companies/{company.id}",
        json={"name": "New Name", "customerType": "generator"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["customerType"] == "generator"


@pytest.mark.asyncio
async def test_create_company_allows_null_subsector(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Nullable Subsector Create", "org-null-sub-create")
    user = await create_user(
        db_session,
        email=f"null-sub-create-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "No Subsector Co",
            "industry": "Manufacturing & Industrial",
            "sector": "manufacturing_industrial",
            "subsector": None,
            "customerType": "generator",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["subsector"] is None


@pytest.mark.asyncio
async def test_update_company_normalizes_blank_subsector_to_null(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Nullable Subsector Update", "org-null-sub-update")
    user = await create_user(
        db_session,
        email=f"null-sub-update-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Subsector Company")

    set_current_user(user)
    response = await client.put(
        f"/api/v1/companies/{company.id}",
        json={"subsector": "   "},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["subsector"] is None


@pytest.mark.asyncio
async def test_list_locations(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org List Loc", "org-list-loc")
    user = await create_user(
        db_session,
        email=f"list-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Loc Company")
    await create_location(db_session, org_id=org.id, company_id=company.id, name="Loc A")
    await create_location(db_session, org_id=org.id, company_id=company.id, name="Loc B")

    set_current_user(user)
    response = await client.get("/api/v1/companies/locations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    allowed_address_types = {"headquarters", "pickup", "delivery", "billing"}
    for location in data:
        assert "addressType" in location
        assert location["addressType"] in allowed_address_types
        assert "zipCode" in location


@pytest.mark.asyncio
async def test_create_location_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Loc", "org-create-loc")
    user = await create_user(
        db_session,
        email=f"create-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Loc Parent")

    set_current_user(user)
    response = await client.post(
        f"/api/v1/companies/{company.id}/locations",
        json={
            "companyId": str(company.id),
            "name": "New Location",
            "city": "Austin",
            "state": "TX",
            "addressType": "headquarters",
            "zipCode": "01234",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Location"
    assert data["city"] == "Austin"
    assert data["addressType"] == "headquarters"
    assert data["zipCode"] == "01234"
    assert "01234" in data["fullAddress"]


@pytest.mark.asyncio
async def test_create_location_missing_zip(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Missing Zip", "org-missing-zip")
    user = await create_user(
        db_session,
        email=f"missing-zip-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Missing Zip Co")

    set_current_user(user)
    response = await client.post(
        f"/api/v1/companies/{company.id}/locations",
        json={
            "companyId": str(company.id),
            "name": "Missing Zip Location",
            "city": "Austin",
            "state": "TX",
            "addressType": "headquarters",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert any(error.get("loc")[-1] == "zipCode" for error in data["details"]["errors"])


@pytest.mark.asyncio
async def test_create_location_invalid_zip(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Invalid Zip", "org-invalid-zip")
    user = await create_user(
        db_session,
        email=f"invalid-zip-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Invalid Zip Co")

    set_current_user(user)
    response = await client.post(
        f"/api/v1/companies/{company.id}/locations",
        json={
            "companyId": str(company.id),
            "name": "Invalid Zip Location",
            "city": "Austin",
            "state": "TX",
            "addressType": "headquarters",
            "zipCode": "1234",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert any(error.get("loc")[-1] == "zipCode" for error in data["details"]["errors"])


@pytest.mark.asyncio
async def test_create_location_invalid_address_type(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Invalid Address Type", "org-invalid-at")
    user = await create_user(
        db_session,
        email=f"invalid-at-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Invalid Address Co")

    set_current_user(user)
    response = await client.post(
        f"/api/v1/companies/{company.id}/locations",
        json={
            "companyId": str(company.id),
            "name": "Invalid Address Location",
            "city": "Austin",
            "state": "TX",
            "addressType": "home",
            "zipCode": "78701",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_location_detail(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Loc Detail", "org-loc-detail")
    user = await create_user(
        db_session,
        email=f"loc-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Loc Detail Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Detail Location"
    )

    set_current_user(user)
    response = await client.get(f"/api/v1/companies/locations/{location.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Location"
    assert data["addressType"] == "headquarters"
    assert data["zipCode"] is None
    assert "contacts" in data


@pytest.mark.asyncio
async def test_update_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Loc", "org-update-loc")
    user = await create_user(
        db_session,
        email=f"update-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Loc Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Old Loc Name"
    )

    set_current_user(user)
    response = await client.put(
        f"/api/v1/companies/locations/{location.id}",
        json={
            "name": "New Loc Name",
            "addressType": "delivery",
            "zipCode": "12345-6789",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Loc Name"
    assert data["addressType"] == "delivery"
    assert data["zipCode"] == "12345-6789"


@pytest.mark.asyncio
async def test_update_location_missing_zip_rejected_when_none(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Missing Zip", "org-update-missing-zip")
    user = await create_user(
        db_session,
        email=f"update-missing-zip-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Missing Zip Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="No Zip Loc"
    )

    set_current_user(user)
    response = await client.put(
        f"/api/v1/companies/locations/{location.id}",
        json={"name": "Name Without Zip"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_location_missing_zip_allowed_when_existing(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Zip Keep", "org-update-zip-keep")
    user = await create_user(
        db_session,
        email=f"update-zip-keep-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Zip Keep Co")

    set_current_user(user)
    create_response = await client.post(
        f"/api/v1/companies/{company.id}/locations",
        json={
            "companyId": str(company.id),
            "name": "Has Zip",
            "city": "Austin",
            "state": "TX",
            "addressType": "pickup",
            "zipCode": "78701",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()

    update_response = await client.put(
        f"/api/v1/companies/locations/{created['id']}",
        json={"name": "Has Zip Updated"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["zipCode"] == "78701"


@pytest.mark.asyncio
async def test_update_location_explicit_null_zip_rejected(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Zip Null", "org-update-zip-null")
    user = await create_user(
        db_session,
        email=f"update-zip-null-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Zip Null Co")

    set_current_user(user)
    create_response = await client.post(
        f"/api/v1/companies/{company.id}/locations",
        json={
            "companyId": str(company.id),
            "name": "Has Zip",
            "city": "Austin",
            "state": "TX",
            "addressType": "pickup",
            "zipCode": "78701",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()

    update_response = await client.put(
        f"/api/v1/companies/locations/{created['id']}",
        json={"zipCode": None},
    )
    assert update_response.status_code == 422


@pytest.mark.asyncio
async def test_list_locations_filters_by_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Filter Loc", "org-filter-loc")
    user = await create_user(
        db_session,
        email=f"filter-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_a = await create_company(db_session, org_id=org.id, name="Filter Co A")
    company_b = await create_company(db_session, org_id=org.id, name="Filter Co B")
    await create_location(db_session, org_id=org.id, company_id=company_a.id, name="Loc A1")
    await create_location(db_session, org_id=org.id, company_id=company_a.id, name="Loc A2")
    await create_location(db_session, org_id=org.id, company_id=company_b.id, name="Loc B1")

    set_current_user(user)
    response = await client.get(f"/api/v1/companies/locations?company_id={company_a.id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {loc["name"] for loc in data}
    assert "Loc A1" in names
    assert "Loc A2" in names
    assert "Loc B1" not in names
