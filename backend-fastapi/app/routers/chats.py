import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.time import utc_now
from app.dependencies import get_current_user, get_database
from app.models.schemas import (
    ConversationCreate,
    ConversationPublic,
    MessageCreate,
    MessageListResponse,
    MessagePublic,
    UserPublic,
)

router = APIRouter(prefix="/chats", tags=["chats"])


async def get_conversation_for_user(
    database: AsyncIOMotorDatabase,
    conversation_id: str,
    user: UserPublic,
) -> dict[str, Any]:
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    conversation = await database.conversations.find_one(
        {
            "_id": ObjectId(conversation_id),
            "participant_ids": ObjectId(user.id),
        }
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return conversation


@router.post(
    "/",
    response_model=ConversationPublic,
    response_model_by_alias=False,
    status_code=status.HTTP_201_CREATED,
)
async def start_conversation(
    payload: ConversationCreate,
    current_user: UserPublic = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> ConversationPublic:
    target_username = payload.username.strip().lower()

    if target_username == current_user.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot start a conversation with yourself",
        )

    target = await database.users.find_one(
        {"username": target_username, "verified": True}
    )
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    participant_ids = sorted([ObjectId(current_user.id), target["_id"]])

    existing = await database.conversations.find_one(
        {"participant_ids": participant_ids}
    )
    if existing is not None:
        return ConversationPublic.model_validate(existing)

    document = {
        "participant_ids": participant_ids,
        "participants": [
            {"user_id": ObjectId(current_user.id), "username": current_user.username},
            {"user_id": target["_id"], "username": target["username"]},
        ],
        "last_message_at": None,
        "last_message_preview": None,
        "created_at": utc_now(),
    }
    result = await database.conversations.insert_one(document)
    created = await database.conversations.find_one({"_id": result.inserted_id})

    return ConversationPublic.model_validate(created)


@router.get("/", response_model=list[ConversationPublic], response_model_by_alias=False)
async def list_conversations(
    current_user: UserPublic = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> list[ConversationPublic]:
    cursor = (
        database.conversations.find({"participant_ids": ObjectId(current_user.id)})
        .sort([("last_message_at", -1), ("created_at", -1)])
        .limit(100)
    )
    docs = await cursor.to_list(length=100)
    return [ConversationPublic.model_validate(doc) for doc in docs]


@router.get(
    "/{conversation_id}/messages",
    response_model=MessageListResponse,
    response_model_by_alias=False,
)
async def list_messages(
    conversation_id: str,
    after_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    current_user: UserPublic = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageListResponse:
    conversation = await get_conversation_for_user(database, conversation_id, current_user)

    query: dict[str, Any] = {"conversation_id": conversation["_id"]}
    if after_id is not None and ObjectId.is_valid(after_id):
        query["_id"] = {"$gt": ObjectId(after_id)}

    cursor = database.messages.find(query).sort("_id", 1).limit(limit)
    docs = await cursor.to_list(length=limit)

    return MessageListResponse(
        items=[MessagePublic.model_validate(doc) for doc in docs]
    )


SSE_POLL_SECONDS = 1.5


@router.get("/{conversation_id}/stream")
async def stream_messages(
    conversation_id: str,
    request: Request,
    after_id: str | None = Query(default=None),
    current_user: UserPublic = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> StreamingResponse:
    """Server-Sent Events stream of new messages.

    Uses a short server-side poll (works on single-node Mongo without change
    streams) but holds a single long-lived connection per client instead of the
    repeated request churn of client polling.
    """
    conversation = await get_conversation_for_user(
        database, conversation_id, current_user
    )

    async def event_generator() -> AsyncIterator[str]:
        last_id: ObjectId | None = (
            ObjectId(after_id) if after_id and ObjectId.is_valid(after_id) else None
        )
        while True:
            if await request.is_disconnected():
                break

            query: dict[str, Any] = {"conversation_id": conversation["_id"]}
            if last_id is not None:
                query["_id"] = {"$gt": last_id}

            cursor = database.messages.find(query).sort("_id", 1).limit(100)
            docs = await cursor.to_list(length=100)
            for doc in docs:
                last_id = doc["_id"]
                message = MessagePublic.model_validate(doc)
                payload = json.dumps(message.model_dump(mode="json"))
                yield f"id: {message.id}\ndata: {payload}\n\n"

            # Comment line doubles as a heartbeat to surface dropped clients.
            yield ": keep-alive\n\n"
            await asyncio.sleep(SSE_POLL_SECONDS)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/{conversation_id}/messages",
    response_model=MessagePublic,
    response_model_by_alias=False,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: str,
    payload: MessageCreate,
    current_user: UserPublic = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> MessagePublic:
    conversation = await get_conversation_for_user(database, conversation_id, current_user)

    content = payload.content.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty",
        )

    document = {
        "conversation_id": conversation["_id"],
        "sender": {
            "user_id": ObjectId(current_user.id),
            "username": current_user.username,
        },
        "content": content,
        "created_at": utc_now(),
    }
    result = await database.messages.insert_one(document)

    await database.conversations.update_one(
        {"_id": conversation["_id"]},
        {
            "$set": {
                "last_message_at": document["created_at"],
                "last_message_preview": content[:80],
            }
        },
    )

    created = await database.messages.find_one({"_id": result.inserted_id})
    return MessagePublic.model_validate(created)
