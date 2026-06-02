import os
import pytest
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import create_app

TEST_DB = os.getenv("MONGODB_DATABASE", "community_qa_test")
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")


@pytest.fixture(scope="session")
async def app():
    """Create app and override DB with a test database."""
    application = create_app()
    yield application


@pytest.fixture(scope="session")
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture(autouse=True)
async def clean_db():
    """Drop the test collections before each test."""
    mongo = AsyncIOMotorClient(MONGO_URI)
    db = mongo[TEST_DB]
    await db.questions.drop()
    yield
    await db.questions.drop()
    mongo.close()


AUTHOR_PAYLOAD = {
    "user_id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "role": "junior",
}
