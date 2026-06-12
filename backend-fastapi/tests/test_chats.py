from httpx import AsyncClient

from tests.conftest import create_test_user, make_auth_headers


async def two_users() -> tuple[dict, dict]:
    ana_id = await create_test_user(username="ana")
    leo_id = await create_test_user(username="leo")
    return make_auth_headers(ana_id, "ana"), make_auth_headers(leo_id, "leo")


async def test_chats_require_auth(client: AsyncClient):
    assert (await client.get("/chats/")).status_code == 401
    assert (
        await client.post("/chats/", json={"username": "alguien"})
    ).status_code == 401


async def test_start_conversation(client: AsyncClient):
    ana, _leo = await two_users()

    response = await client.post("/chats/", json={"username": "leo"}, headers=ana)
    assert response.status_code == 201
    data = response.json()
    usernames = {p["username"] for p in data["participants"]}
    assert usernames == {"ana", "leo"}


async def test_start_conversation_is_idempotent(client: AsyncClient):
    ana, leo = await two_users()

    first = await client.post("/chats/", json={"username": "leo"}, headers=ana)
    second = await client.post("/chats/", json={"username": "ana"}, headers=leo)
    assert first.json()["id"] == second.json()["id"]


async def test_cannot_chat_with_yourself(client: AsyncClient):
    ana, _leo = await two_users()
    response = await client.post("/chats/", json={"username": "ana"}, headers=ana)
    assert response.status_code == 400


async def test_cannot_chat_with_unknown_user(client: AsyncClient):
    ana, _leo = await two_users()
    response = await client.post("/chats/", json={"username": "fantasma"}, headers=ana)
    assert response.status_code == 404


async def test_send_and_receive_messages(client: AsyncClient):
    ana, leo = await two_users()

    conversation = (
        await client.post("/chats/", json={"username": "leo"}, headers=ana)
    ).json()
    conversation_id = conversation["id"]

    sent = await client.post(
        f"/chats/{conversation_id}/messages",
        json={"content": "Hola Leo, vi tu respuesta sobre asyncio"},
        headers=ana,
    )
    assert sent.status_code == 201
    assert sent.json()["sender"]["username"] == "ana"

    received = await client.get(
        f"/chats/{conversation_id}/messages", headers=leo
    )
    assert received.status_code == 200
    items = received.json()["items"]
    assert len(items) == 1
    assert items[0]["content"] == "Hola Leo, vi tu respuesta sobre asyncio"


async def test_messages_after_id_returns_only_new(client: AsyncClient):
    ana, leo = await two_users()

    conversation_id = (
        await client.post("/chats/", json={"username": "leo"}, headers=ana)
    ).json()["id"]

    first = (
        await client.post(
            f"/chats/{conversation_id}/messages",
            json={"content": "Primer mensaje"},
            headers=ana,
        )
    ).json()
    await client.post(
        f"/chats/{conversation_id}/messages",
        json={"content": "Segundo mensaje"},
        headers=leo,
    )

    response = await client.get(
        f"/chats/{conversation_id}/messages",
        params={"after_id": first["id"]},
        headers=ana,
    )
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["content"] == "Segundo mensaje"


async def test_outsider_cannot_read_conversation(client: AsyncClient):
    ana, _leo = await two_users()
    intruder_id = await create_test_user(username="intruso")
    intruder = make_auth_headers(intruder_id, "intruso")

    conversation_id = (
        await client.post("/chats/", json={"username": "leo"}, headers=ana)
    ).json()["id"]

    response = await client.get(
        f"/chats/{conversation_id}/messages", headers=intruder
    )
    assert response.status_code == 404
