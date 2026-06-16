from httpx import AsyncClient

from tests.conftest import create_test_user, make_auth_headers


async def admin_headers() -> dict:
    admin_id = await create_test_user(username="superadmin", role="admin")
    return make_auth_headers(admin_id, "superadmin", role="admin")


async def test_list_users_requires_admin(client: AsyncClient, auth_headers: dict):
    # auth_headers is a junior user.
    response = await client.get("/users/", headers=auth_headers)
    assert response.status_code == 403


async def test_admin_can_list_users(client: AsyncClient):
    headers = await admin_headers()
    response = await client.get("/users/", headers=headers)
    assert response.status_code == 200
    assert any(u["username"] == "superadmin" for u in response.json())


async def test_admin_can_promote_user(client: AsyncClient):
    headers = await admin_headers()
    await create_test_user(username="ascendido", role="junior")

    response = await client.patch(
        "/users/ascendido/role",
        json={"role": "senior"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["role"] == "senior"


async def test_non_admin_cannot_change_role(client: AsyncClient, auth_headers: dict):
    await create_test_user(username="victima", role="junior")
    response = await client.patch(
        "/users/victima/role",
        json={"role": "admin"},
        headers=auth_headers,
    )
    assert response.status_code == 403


async def test_change_role_unknown_user_returns_404(client: AsyncClient):
    headers = await admin_headers()
    response = await client.patch(
        "/users/fantasma/role",
        json={"role": "senior"},
        headers=headers,
    )
    assert response.status_code == 404
