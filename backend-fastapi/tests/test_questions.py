import pytest
from httpx import AsyncClient

from tests.conftest import AUTHOR_PAYLOAD


def question_payload(**overrides) -> dict:
    base = {
        "title": "Como funciona el event loop en Python asyncio",
        "content": "Quiero entender como asyncio maneja las corutinas internamente y cuando debo usar gather vs create_task.",
        "author": AUTHOR_PAYLOAD,
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

async def test_create_question_returns_201(client: AsyncClient):
    response = await client.post("/questions/", json=question_payload())
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == question_payload()["title"]
    assert data["status"] == "pending"
    assert data["answers"] == []
    assert "slug" in data
    assert "id" in data


async def test_create_question_normalizes_tags(client: AsyncClient):
    response = await client.post(
        "/questions/",
        json=question_payload(tags=["  Python  ", "ASYNCIO", "python"]),
    )
    assert response.status_code == 201
    assert response.json()["tags"] == ["asyncio", "python"]


async def test_create_question_short_title_returns_422(client: AsyncClient):
    response = await client.post("/questions/", json=question_payload(title="Corto"))
    assert response.status_code == 422


async def test_create_question_empty_tags_returns_422(client: AsyncClient):
    response = await client.post("/questions/", json=question_payload(tags=[]))
    assert response.status_code == 422


async def test_create_question_slug_collision_resolved(client: AsyncClient):
    payload = question_payload()
    r1 = await client.post("/questions/", json=payload)
    r2 = await client.post("/questions/", json=payload)
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["slug"] != r2.json()["slug"]


# ---------------------------------------------------------------------------
# GET /questions/{slug}
# ---------------------------------------------------------------------------

async def test_get_question_by_slug(client: AsyncClient):
    created = (await client.post("/questions/", json=question_payload())).json()
    response = await client.get(f"/questions/{created['slug']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


async def test_get_question_not_found(client: AsyncClient):
    response = await client.get("/questions/slug-que-no-existe")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /questions/{slug}/answers
# ---------------------------------------------------------------------------

async def test_add_answer_returns_201(client: AsyncClient):
    created = (await client.post("/questions/", json=question_payload())).json()
    answer_payload = {
        "content": "El event loop de asyncio ejecuta corutinas cooperativamente en un solo hilo. Usa gather para paralelismo IO-bound y create_task cuando necesitas referencias.",
        "author": AUTHOR_PAYLOAD,
    }
    response = await client.post(f"/questions/{created['slug']}/answers", json=answer_payload)
    assert response.status_code == 201
    data = response.json()
    assert len(data["answers"]) == 1
    assert data["answers"][0]["is_accepted"] is False
    assert data["answers"][0]["author"]["username"] == "testuser"


async def test_add_answer_to_nonexistent_question(client: AsyncClient):
    answer_payload = {
        "content": "Esta respuesta no deberia guardarse porque la pregunta no existe aqui.",
        "author": AUTHOR_PAYLOAD,
    }
    response = await client.post("/questions/no-existe/answers", json=answer_payload)
    assert response.status_code == 404


async def test_add_answer_short_content_returns_422(client: AsyncClient):
    created = (await client.post("/questions/", json=question_payload())).json()
    response = await client.post(
        f"/questions/{created['slug']}/answers",
        json={"content": "Muy corto", "author": AUTHOR_PAYLOAD},
    )
    assert response.status_code == 422
