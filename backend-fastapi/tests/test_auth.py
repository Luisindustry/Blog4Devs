import asyncio
from urllib.parse import parse_qs, urlparse

from httpx import AsyncClient


def extract_token(dev_link: str) -> str:
    query = parse_qs(urlparse(dev_link).query)
    return query["token"][0]


async def login(client: AsyncClient, email: str, username: str) -> dict:
    requested = await client.post(
        "/auth/request-link", json={"email": email, "username": username}
    )
    token = extract_token(requested.json()["dev_link"])
    session = (await client.post("/auth/verify", json={"token": token})).json()
    return {"Authorization": f"Bearer {session['access_token']}"}


async def test_register_requires_username(client: AsyncClient):
    response = await client.post(
        "/auth/request-link", json={"email": "nuevo@example.com"}
    )
    assert response.status_code == 422


async def test_register_and_verify_flow(client: AsyncClient):
    response = await client.post(
        "/auth/request-link",
        json={"email": "nuevo@example.com", "username": "nuevodev"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] is True
    assert data["is_new_user"] is True
    assert data["dev_link"] is not None

    token = extract_token(data["dev_link"])
    verify = await client.post("/auth/verify", json={"token": token})
    assert verify.status_code == 200
    session = verify.json()
    assert session["access_token"]
    assert session["user"]["username"] == "nuevodev"
    assert session["user"]["verified"] is True

    me = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {session['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "nuevo@example.com"


async def test_login_existing_user_without_username(client: AsyncClient):
    await client.post(
        "/auth/request-link",
        json={"email": "luis@example.com", "username": "luisdev"},
    )

    response = await client.post(
        "/auth/request-link", json={"email": "luis@example.com"}
    )
    assert response.status_code == 200
    assert response.json()["is_new_user"] is False


async def test_username_conflict_returns_409(client: AsyncClient):
    await client.post(
        "/auth/request-link",
        json={"email": "uno@example.com", "username": "duplicado"},
    )

    response = await client.post(
        "/auth/request-link",
        json={"email": "dos@example.com", "username": "duplicado"},
    )
    assert response.status_code == 409


async def test_verify_invalid_token_returns_401(client: AsyncClient):
    response = await client.post(
        "/auth/verify", json={"token": "token-invalido-123456"}
    )
    assert response.status_code == 401


async def test_magic_link_is_single_use(client: AsyncClient):
    response = await client.post(
        "/auth/request-link",
        json={"email": "single@example.com", "username": "singleuse"},
    )
    token = extract_token(response.json()["dev_link"])

    first = await client.post("/auth/verify", json={"token": token})
    assert first.status_code == 200

    second = await client.post("/auth/verify", json={"token": token})
    assert second.status_code == 401


async def test_me_requires_auth(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401


async def test_request_link_rate_limited_per_email(client: AsyncClient):
    payload = {"email": "spam@example.com", "username": "spammer"}

    # Default limit is 3 per email per window.
    for _ in range(3):
        ok = await client.post("/auth/request-link", json=payload)
        assert ok.status_code == 200

    blocked = await client.post("/auth/request-link", json=payload)
    assert blocked.status_code == 429


async def test_logout_all_revokes_existing_tokens(client: AsyncClient):
    headers = await login(client, "revoke@example.com", "revoker")

    assert (await client.get("/auth/me", headers=headers)).status_code == 200

    # iat has second granularity; ensure the token predates the cutoff.
    await asyncio.sleep(1.1)

    revoked = await client.post("/auth/logout-all", headers=headers)
    assert revoked.status_code == 204

    # The same token is now dead everywhere.
    assert (await client.get("/auth/me", headers=headers)).status_code == 401
