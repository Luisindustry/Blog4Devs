from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING


async def connect_to_mongo(uri: str, database_name: str) -> tuple[AsyncIOMotorClient, AsyncIOMotorDatabase]:
    client: AsyncIOMotorClient = AsyncIOMotorClient(
        uri,
        serverSelectionTimeoutMS=5000,
        uuidRepresentation="standard",
    )
    await client.admin.command("ping")

    database: AsyncIOMotorDatabase = client[database_name]
    await database.questions.create_index(
        [("slug", ASCENDING)],
        unique=True,
        name="uq_questions_slug",
    )
    await database.questions.create_index(
        [("status", ASCENDING), ("created_at", ASCENDING)],
        name="idx_questions_status_created_at",
    )

    return client, database
