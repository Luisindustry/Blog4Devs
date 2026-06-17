import os

# Force test-safe settings BEFORE the app reads them (env vars override .env,
# which may point to a production Atlas cluster).
os.environ["MONGODB_URI"] = os.getenv("TEST_MONGODB_URI", "mongodb://localhost:27017")
os.environ["MONGODB_DATABASE"] = "community_qa_test"
os.environ["AUTH_SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ENVIRONMENT"] = "local"
os.environ["RESEND_API_KEY"] = ""

from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.security import create_session_token
from app.db.mongodb import connect_to_mongo
from app.main import create_app

TEST_DB = "community_qa_test"
MONGO_URI = os.environ["MONGODB_URI"]

COLLECTIONS = [
    "questions",
    "users",
    "magic_links",
    "conversations",
    "messages",
    "votes",
    "auth_attempts",
]


@pytest.fixture(autouse=True)
async def clean_db():
    """Drop the test collections before and after each test."""
    mongo = AsyncIOMotorClient(MONGO_URI)
    db = mongo[TEST_DB]
    for name in COLLECTIONS:
        await db[name].drop()
    yield
    for name in COLLECTIONS:
        await db[name].drop()
    mongo.close()


@pytest.fixture
async def app(clean_db):
    """App wired to the test database (ASGITransport does not run the lifespan)."""
    application = create_app()
    mongo, database = await connect_to_mongo(MONGO_URI, TEST_DB)
    application.state.db = database
    yield application
    mongo.close()


@pytest.fixture
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


async def create_test_user(
    username: str = "testuser",
    email: str | None = None,
    role: str = "junior",
    verified: bool = True,
) -> str:
    mongo = AsyncIOMotorClient(MONGO_URI)
    db = mongo[TEST_DB]
    result = await db.users.insert_one(
        {
            "email": email or f"{username}@example.com",
            "username": username,
            "role": role,
            "verified": verified,
            "created_at": datetime.now(timezone.utc),
        }
    )
    mongo.close()
    return str(result.inserted_id)


def make_auth_headers(user_id: str, username: str, role: str = "junior") -> dict:
    token = create_session_token(
        user_id=user_id,
        username=username,
        role=role,
        email=f"{username}@example.com",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers() -> dict:
    """A verified default user with a valid session token."""
    user_id = await create_test_user()
    return make_auth_headers(user_id, "testuser")
