import uuid

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient

from app.models.user import UserRole


@pytest.mark.asyncio
async def test_org_admin_denied_admin_only_endpoints_with_forbidden_code(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Admin Denied", "org-admin-denied")
    org_admin = await create_user(
        db_session,
        email=f"org-admin-denied-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(org_admin)
    list_response = await client.get("/api/v1/admin/users")
    assert list_response.status_code == 403
    assert list_response.json()["code"] == "FORBIDDEN"

    create_response = await client.post(
        "/api/v1/admin/users",
        json={
            "email": f"new-admin-{uid}@example.com",
            "password": "Password1",
            "first_name": "New",
            "last_name": "Admin",
            "is_superuser": True,
            "role": UserRole.ADMIN.value,
        },
    )
    assert create_response.status_code == 403
    assert create_response.json()["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_create_admin_user_duplicate_email_returns_409(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    superadmin = await create_user(
        db_session,
        email=f"superadmin-admin-users-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    duplicate_email = f"duplicate-admin-{uid}@example.com"
    await create_user(
        db_session,
        email=duplicate_email,
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(superadmin)
    response = await client.post(
        "/api/v1/admin/users",
        json={
            "email": duplicate_email,
            "password": "Password1",
            "first_name": "Platform",
            "last_name": "Admin",
            "is_superuser": True,
            "role": UserRole.ADMIN.value,
        },
    )

    assert response.status_code == 409
    payload = response.json()
    assert payload["code"] == "USER_ALREADY_EXISTS"
    assert payload["message"] == "A user with this email already exists in this organization."
    assert payload["details"]["email"] == duplicate_email
