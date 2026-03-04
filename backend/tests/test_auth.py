import uuid

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient

from app.models.user import UserRole


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Auth", "org-auth")
    user = await create_user(
        db_session,
        email=f"login-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": user.email, "password": "Password1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Auth Wrong", "org-auth-wrong")
    user = await create_user(
        db_session,
        email=f"wrong-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": user.email, "password": "WrongPassword123"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": "nonexistent@example.com", "password": "Password1"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Me", "org-me")
    user = await create_user(
        db_session,
        email=f"me-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    login_resp = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": user.email, "password": "Password1"},
    )
    token = login_resp.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user.email
    assert data["id"] == str(user.id)


@pytest.mark.asyncio
async def test_get_me_route_precedence_does_not_resolve_as_user_id(client: AsyncClient, db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Me Route Precedence", "org-me-route-precedence")
    user = await create_user(
        db_session,
        email=f"me-route-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    login_resp = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": user.email, "password": "Password1"},
    )
    token = login_resp.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == str(user.id)
    assert payload["email"] == user.email
    assert "permissions" in payload
    assert "organization_id" in payload


@pytest.mark.asyncio
async def test_get_user_by_id_route_still_works_for_superuser(client: AsyncClient, db_session):
    uid = uuid.uuid4().hex[:8]
    superuser = await create_user(
        db_session,
        email=f"auth-super-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    regular_org = await create_org(db_session, "Org Auth Get User", "org-auth-get-user")
    regular_user = await create_user(
        db_session,
        email=f"auth-regular-{uid}@example.com",
        org_id=regular_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    login_resp = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": superuser.email, "password": "Password1"},
    )
    token = login_resp.json()["access_token"]

    response = await client.get(
        f"/api/v1/auth/{regular_user.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == str(regular_user.id)
    assert payload["email"] == regular_user.email


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient, db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Me", "org-update-me")
    user = await create_user(
        db_session,
        email=f"update-me-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    login_resp = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": user.email, "password": "Password1"},
    )
    token = login_resp.json()["access_token"]

    response = await client.patch(
        "/api/v1/auth/me",
        json={"first_name": "Updated", "last_name": "Name"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Name"


@pytest.mark.asyncio
async def test_protected_endpoint_no_token(client: AsyncClient):
    response = await client.get("/api/v1/projects")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer invalid-token-here"},
    )
    assert response.status_code == 401
