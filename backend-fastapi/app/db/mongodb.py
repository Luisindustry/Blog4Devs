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
    await database.questions.create_index(
        [("tags", ASCENDING), ("created_at", ASCENDING)],
        name="idx_questions_tags_created_at",
    )
    await database.questions.create_index(
        [("author.user_id", ASCENDING), ("created_at", ASCENDING)],
        name="idx_questions_author_created_at",
    )

    await database.users.create_index(
        [("email", ASCENDING)],
        unique=True,
        name="uq_users_email",
    )
    await database.users.create_index(
        [("username", ASCENDING)],
        unique=True,
        name="uq_users_username",
    )

    await database.magic_links.create_index(
        [("token_hash", ASCENDING)],
        unique=True,
        name="uq_magic_links_token_hash",
    )
    await database.magic_links.create_index(
        [("expires_at", ASCENDING)],
        expireAfterSeconds=0,
        name="ttl_magic_links_expires_at",
    )

    await database.conversations.create_index(
        [("participant_ids", ASCENDING)],
        name="idx_conversations_participants",
    )
    await database.messages.create_index(
        [("conversation_id", ASCENDING), ("_id", ASCENDING)],
        name="idx_messages_conversation",
    )

    return client, database
