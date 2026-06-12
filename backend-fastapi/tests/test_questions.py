import pytest
from httpx import AsyncClient


def question_payload(**overrides) -> dict:
    base = {
        "title": "Como funciona el event loop en Python asyncio",
        "content": "Quiero entender como asyncio maneja las corutinas internamente y cuando debo usar gather vs create_task.",
        "tags": ["python", "asyncio", "concurrencia"],
    }
    return {**base, **overrides}


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
    assert data["status"] == "pending"
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
    from tests.conftest import create_test_user, make_auth_headers

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
    answer_payload = {
        "content": "Esta respuesta no deberia guardarse porque la pregunta no existe aqui.",
    }
    response = await client.post(
        "/questions/no-existe/answers", json=answer_payload, headers=auth_headers
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


async def test_update_question_tags(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    response = await client.patch(
        f"/questions/{created['slug']}",
        json={"tags": ["python", "gil", "threads"]},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["tags"] == ["gil", "python", "threads"]


async def test_update_question_by_other_user_returns_403(
    client: AsyncClient, auth_headers: dict
):
    from tests.conftest import create_test_user, make_auth_headers

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


async def test_update_question_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.patch(
        "/questions/slug-que-no-existe",
        json={"title": "Titulo nuevo valido para el test de not found"},
        headers=auth_headers,
    )
    assert response.status_code == 404


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
    from tests.conftest import create_test_user, make_auth_headers

    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    intruder_id = await create_test_user(username="intruso")
    intruder_headers = make_auth_headers(intruder_id, "intruso")

    response = await client.delete(
        f"/questions/{created['slug']}", headers=intruder_headers
    )
    assert response.status_code == 403


async def test_delete_question_removes_from_db(client: AsyncClient, auth_headers: dict):
    created = (
        await client.post("/questions/", json=question_payload(), headers=auth_headers)
    ).json()

    await client.delete(f"/questions/{created['slug']}", headers=auth_headers)

    get_response = await client.get(f"/questions/{created['slug']}")
    assert get_response.status_code == 404


async def test_delete_question_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.delete(
        "/questions/slug-que-no-existe", headers=auth_headers
    )
    assert response.status_code == 404
