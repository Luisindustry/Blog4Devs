from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.db.migrate import ensure_schema


async def connect_to_mongo(
    uri: str, database_name: str
) -> tuple[AsyncIOMotorClient, AsyncIOMotorDatabase]:
    client: AsyncIOMotorClient = AsyncIOMotorClient(
        uri,
        serverSelectionTimeoutMS=5000,
        uuidRepresentation="standard",
    )
    await client.admin.command("ping")

    database: AsyncIOMotorDatabase = client[database_name]
    await ensure_schema(database)

    return client, database
