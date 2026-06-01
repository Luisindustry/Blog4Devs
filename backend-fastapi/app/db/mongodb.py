from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global _client, _database

    settings = get_settings()
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        uuidRepresentation="standard",
    )
    await _client.admin.command("ping")

    _database = _client[settings.mongodb_database]
    await _database.questions.create_index(
        [("slug", ASCENDING)],
        unique=True,
        name="uq_questions_slug",
    )
    await _database.questions.create_index(
        [("status", ASCENDING), ("created_at", ASCENDING)],
        name="idx_questions_status_created_at",
    )
    await _database.users.create_index(
        [("email", ASCENDING)],
        unique=True,
        name="uq_users_email",
    )
    await _database.users.create_index(
        [("github_id", ASCENDING)],
        unique=True,
        sparse=True,
        name="uq_users_github_id",
    )


async def close_mongo_connection() -> None:
    global _client, _database

    if _client is not None:
        _client.close()

    _client = None
    _database = None


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("MongoDB is not connected")

    return _database
