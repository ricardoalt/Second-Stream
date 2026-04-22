import pytest


@pytest.mark.asyncio
async def test_chat_stream_preflight_allows_vercel_protocol_header(client):
    response = await client.options(
        "/api/v1/chat/threads",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-vercel-ai-ui-message-stream",
        },
    )

    assert response.status_code == 200

    allow_headers = {
        value.strip().lower()
        for value in response.headers["access-control-allow-headers"].split(",")
    }
    assert "x-vercel-ai-ui-message-stream" in allow_headers


@pytest.mark.asyncio
async def test_chat_stream_preflight_keeps_existing_allowed_headers(client):
    response = await client.options(
        "/api/v1/chat/threads",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type,x-organization-id",
        },
    )

    assert response.status_code == 200

    allow_headers = {
        value.strip().lower()
        for value in response.headers["access-control-allow-headers"].split(",")
    }
    assert "authorization" in allow_headers
    assert "content-type" in allow_headers
    assert "x-organization-id" in allow_headers
