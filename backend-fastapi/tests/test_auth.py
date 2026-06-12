from urllib.parse import parse_qs, urlparse

from httpx import AsyncClient


def extract_token(dev_link: str) -> str:
    query = parse_qs(urlparse(dev_link).query)
    return query["token"][0]


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
