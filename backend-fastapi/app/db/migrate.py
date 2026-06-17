"""Index/schema setup, runnable as a standalone migration:

    python -m app.db.migrate

connect_to_mongo() also calls ensure_schema() on startup so dev/CI stay
self-healing; in production you can run this once before deploy instead.
All operations are idempotent.
"""

import asyncio

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING


async def ensure_schema(database: AsyncIOMotorDatabase) -> None:
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

    # Rate-limit bookkeeping for magic-link requests; rows self-expire.
    await database.auth_attempts.create_index(
        [("created_at", ASCENDING)],
        expireAfterSeconds=3600,
        name="ttl_auth_attempts_created_at",
    )
    await database.auth_attempts.create_index(
        [("email", ASCENDING), ("created_at", ASCENDING)],
        name="idx_auth_attempts_email",
    )
    await database.auth_attempts.create_index(
        [("ip", ASCENDING), ("created_at", ASCENDING)],
        name="idx_auth_attempts_ip",
    )

    await database.votes.create_index(
        [("question_id", ASCENDING), ("user_id", ASCENDING)],
        unique=True,
        name="uq_votes_question_user",
    )

    await database.conversations.create_index(
        [("participant_ids", ASCENDING)],
        name="idx_conversations_participants",
    )
    await database.messages.create_index(
        [("conversation_id", ASCENDING), ("_id", ASCENDING)],
        name="idx_messages_conversation",
    )

    # Backfill answers_count for documents created before denormalization.
    await database.questions.update_many(
        {"answers_count": {"$exists": False}},
        [{"$set": {"answers_count": {"$size": {"$ifNull": ["$answers", []]}}}}],
    )


async def _run() -> None:
    from app.core.config import get_settings

    settings = get_settings()
    client: AsyncIOMotorClient = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        uuidRepresentation="standard",
    )
    try:
        await client.admin.command("ping")
        await ensure_schema(client[settings.mongodb_database])
        print(f"Schema ensured on database '{settings.mongodb_database}'.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(_run())
