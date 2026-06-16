from datetime import datetime, timezone

from bson import ObjectId
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from tests.conftest import (
    MONGO_URI,
    TEST_DB,
    create_test_user,
    make_auth_headers,
)


def question_payload(**overrides) -> dict:
    base = {
        "title": "Como funciona el event loop en Python asyncio",
        "content": "Quiero entender como asyncio maneja las corutinas internamente y cuando debo usar gather vs create_task.",
        "tags": ["python", "asyncio", "concurrencia"],
    }
    return {**base, **overrides}


async def insert_pending_question(slug: str, **overrides) -> None:
    mongo = AsyncIOMotorClient(MONGO_URI)
    db = mongo[TEST_DB]
    document = {
        "_id": ObjectId(),
        "title": "Pregunta pendiente para pruebas de moderacion en la API",
        "slug": slug,
        "content": "Contenido suficientemente largo para pasar validacion minima.",
        "author": {"user_id": ObjectId(), "username": "ghost", "role": "junior"},
        "tags": ["test"],
        "status": "pending",
        "votes": 0,
        "answers": [],
        "answers_count": 0,
        "created_at": datetime.now(timezone.utc),
        **overrides,
    }
    await db.questions.insert_one(document)
    mongo.close()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

async def test_healthz(client: AsyncClient):
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /questions
# ---------------------------------------------------------------------------

async def test_create_question_requires_auth(client: AsyncClient):
    response = await client.post("/questions/", json=question_payload())
    assert response.status_code == 401


async def test_create_question_returns_201(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/questions/", json=question_payload(), headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == question_payload()["title"]
    # ENVIRONMENT=local in tests, so new questions are auto-approved.
    assert data["status"] == "approved"
    assert data["answers"] == []
    assert data["author"]["username"] == "testuser"
    assert "slug" in data
    assert "id" in data


async def test_create_question_normalizes_tags(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/questions/",
        json=question_payload(tags=["  Python  ", "ASYNCIO", "python"]),
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["tags"] == ["asyncio", "python"]


async def test_create_question_short_title_returns_422(
    client: AsyncClient, auth_headers: dict
):
    response = await client.post(
        "/questions/", json=question_payload(title="Corto"), headers=auth_headers
    )
    assert response.status_code == 422


async def test_create_question_empty_tags_returns_422(
    client: AsyncClient, auth_headers: dict
):
    response = await client.post(
        "/questions/", json=question_payload(tags=[]), headers=auth_headers
    )
    assert response.status_code == 422


async def test_create_question_slug_collision_resolved(
    client: AsyncClient, auth_headers: dict
):
    payload = question_payload()
    r1 = await client.post("/questions/", json=payload, headers=auth_headers)
    r2 = await client.post("/questions/", json=payload, headers=auth_headers)
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["slug"] != r2.json()["slug"]


# ---------------------------------------------------------------------------
# GET /questions (list + filters)
# ---------------------------------------------------------------------------

async def test_list_questions_filter_by_tag(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/questions/", json=question_payload(tags=["python"]), headers=auth_headers
    )
    await client.post(
        "/questions/",
        json=question_payload(
            title="Como tipar props en React con TypeScript", tags=["react"]
        ),
        headers=auth_headers,
    )

    response = await client.get("/questions/", params={"tag": "react"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["tags"] == ["react"]


async def test_list_my_questions(client: AsyncClient, auth_headers: dict):
    other_id = await create_test_user(username="otrodev")
    other_headers = make_auth_headers(other_id, "otrodev")

    await client.post("/questions/", json=question_payload(), headers=auth_headers)
    await client.post(
        "/questions/",
        json=question_payload(title="Pregunta de otro usuario sobre testing"),
        headers=other_headers,
    )

    response = await client.get("/questions/mine", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["author"]["username"] == "testuser"


async def test_list_my_questions_requires_auth(client: AsyncClient):
    response = await client.get("/questions/mine")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /questions/{slug}
# ---------------------------------------------------------------------------

async def test_get_question_by_slug(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    response = await client.get(f"/questions/{created['slug']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


async def test_get_question_not_found(client: AsyncClient):
    response = await client.get("/questions/slug-que-no-existe")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /questions/{slug}/answers
# ---------------------------------------------------------------------------

async def test_add_answer_returns_201(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    answer_payload = {
        "content": "El event loop de asyncio ejecuta corutinas cooperativamente en un solo hilo. Usa gather para paralelismo IO-bound y create_task cuando necesitas referencias.",
    }
    response = await client.post(
        f"/questions/{created['slug']}/answers",
        json=answer_payload,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["answers"]) == 1
    assert data["answers"][0]["is_accepted"] is False
    assert data["answers"][0]["author"]["username"] == "testuser"


async def test_add_answer_updates_count(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    await client.post(
        f"/questions/{created['slug']}/answers",
        json={"content": "Una respuesta valida con mas de veinte caracteres aqui."},
        headers=auth_headers,
    )

    listed = await client.get("/questions/")
    item = next(i for i in listed.json()["items"] if i["slug"] == created["slug"])
    assert item["answers_count"] == 1


async def test_add_answer_requires_auth(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    response = await client.post(
        f"/questions/{created['slug']}/answers",
        json={"content": "Una respuesta valida con mas de veinte caracteres."},
    )
    assert response.status_code == 401


async def test_add_answer_to_nonexistent_question(
    client: AsyncClient, auth_headers: dict
):
    response = await client.post(
        "/questions/no-existe/answers",
        json={"content": "Esta respuesta no deberia guardarse porque no existe."},
        headers=auth_headers,
    )
    assert response.status_code == 404


async def test_add_answer_short_content_returns_422(
    client: AsyncClient, auth_headers: dict
):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    response = await client.post(
        f"/questions/{created['slug']}/answers",
        json={"content": "Muy corto"},
        headers=auth_headers,
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# PATCH /questions/{slug}
# ---------------------------------------------------------------------------

async def test_update_question_title(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    new_title = "Como funciona el GIL de Python en programas multihilo"

    response = await client.patch(
        f"/questions/{created['slug']}",
        json={"title": new_title},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["title"] == new_title


async def test_update_question_by_other_user_returns_403(
    client: AsyncClient, auth_headers: dict
):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    intruder_id = await create_test_user(username="intruso")
    intruder_headers = make_auth_headers(intruder_id, "intruso")

    response = await client.patch(
        f"/questions/{created['slug']}",
        json={"title": "Titulo modificado por alguien que no es el autor"},
        headers=intruder_headers,
    )
    assert response.status_code == 403


async def test_update_question_empty_body_returns_422(
    client: AsyncClient, auth_headers: dict
):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    response = await client.patch(
        f"/questions/{created['slug']}", json={}, headers=auth_headers
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# DELETE /questions/{slug}
# ---------------------------------------------------------------------------

async def test_delete_question_returns_204(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    response = await client.delete(
        f"/questions/{created['slug']}", headers=auth_headers
    )
    assert response.status_code == 204


async def test_delete_question_by_other_user_returns_403(
    client: AsyncClient, auth_headers: dict
):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    intruder_id = await create_test_user(username="intruso")
    intruder_headers = make_auth_headers(intruder_id, "intruso")

    response = await client.delete(
        f"/questions/{created['slug']}", headers=intruder_headers
    )
    assert response.status_code == 403


async def test_delete_question_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.delete(
        "/questions/slug-que-no-existe", headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Moderation & visibility
# ---------------------------------------------------------------------------

async def test_list_excludes_pending_by_default(client: AsyncClient, auth_headers: dict):
    await insert_pending_question("pregunta-pendiente-oculta")
    await client.post("/questions/", json=question_payload(), headers=auth_headers)

    response = await client.get("/questions/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert all(item["status"] == "approved" for item in data["items"])


async def test_pending_question_hidden_from_anonymous_view(client: AsyncClient):
    await insert_pending_question("pendiente-anon")
    response = await client.get("/questions/pendiente-anon")
    assert response.status_code == 404


async def test_moderator_can_approve_question(client: AsyncClient):
    await insert_pending_question("para-aprobar")

    admin_id = await create_test_user(username="modera", role="admin")
    mod_headers = make_auth_headers(admin_id, "modera", role="admin")

    response = await client.patch(
        "/questions/para-aprobar/status",
        json={"status": "approved"},
        headers=mod_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    listed = await client.get("/questions/")
    assert listed.json()["total"] >= 1


async def test_non_moderator_cannot_change_status(
    client: AsyncClient, auth_headers: dict
):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    response = await client.patch(
        f"/questions/{created['slug']}/status",
        json={"status": "rejected"},
        headers=auth_headers,
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# POST /questions/{slug}/vote
# ---------------------------------------------------------------------------

async def test_vote_requires_auth(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()
    response = await client.post(f"/questions/{created['slug']}/vote")
    assert response.status_code == 401


async def test_vote_increments_and_persists(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    response = await client.post(
        f"/questions/{created['slug']}/vote", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json() == {"votes": 1, "voted": True}

    detail = await client.get(f"/questions/{created['slug']}")
    assert detail.json()["votes"] == 1


async def test_vote_toggles_off_on_second_call(
    client: AsyncClient, auth_headers: dict
):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    await client.post(f"/questions/{created['slug']}/vote", headers=auth_headers)
    second = await client.post(
        f"/questions/{created['slug']}/vote", headers=auth_headers
    )
    assert second.json() == {"votes": 0, "voted": False}


async def test_vote_is_per_user(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    other_id = await create_test_user(username="votante2")
    other_headers = make_auth_headers(other_id, "votante2")

    await client.post(f"/questions/{created['slug']}/vote", headers=auth_headers)
    response = await client.post(
        f"/questions/{created['slug']}/vote", headers=other_headers
    )
    assert response.json() == {"votes": 2, "voted": True}


async def test_vote_nonexistent_question_returns_404(
    client: AsyncClient, auth_headers: dict
):
    response = await client.post("/questions/no-existe/vote", headers=auth_headers)
    assert response.status_code == 404
