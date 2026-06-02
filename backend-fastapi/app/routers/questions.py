import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.dependencies import get_database
from app.models.schemas import (
    AnswerCreate,
    AnswerInDB,
    QuestionCreate,
    QuestionListResponse,
    QuestionPublic,
    QuestionStatus,
    QuestionSummary,
)
from app.services.webhooks import publish_question_created

router = APIRouter(prefix="/questions", tags=["questions"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug or f"question-{ObjectId()}"


def author_to_mongo(author: Any) -> dict[str, Any]:
    return {
        "user_id": ObjectId(author.user_id),
        "username": author.username,
        "role": author.role,
    }


def serialize_question(document: dict[str, Any]) -> QuestionPublic:
    return QuestionPublic.model_validate(document)


async def insert_with_unique_slug(
    collection: AsyncIOMotorCollection,
    base_document: dict[str, Any],
) -> ObjectId:
    base_slug = slugify(base_document["title"])

    for suffix in range(0, 10):
        candidate_slug = base_slug if suffix == 0 else f"{base_slug}-{suffix + 1}"
        document = {**base_document, "slug": candidate_slug}

        try:
            result = await collection.insert_one(document)
            return result.inserted_id
        except DuplicateKeyError:
            continue

    fallback_document = {
        **base_document,
        "slug": f"{base_slug}-{ObjectId()}",
    }
    result = await collection.insert_one(fallback_document)
    return result.inserted_id


@router.post(
    "/",
    response_model=QuestionPublic,
    response_model_by_alias=False,
    status_code=status.HTTP_201_CREATED,
)
async def create_question(
    payload: QuestionCreate,
    background_tasks: BackgroundTasks,
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> QuestionPublic:
    questions = database.get_collection("questions")
    base_document = payload.model_dump(mode="python")
    base_document.update(
        {
            "author": author_to_mongo(payload.author),
            "status": QuestionStatus.PENDING.value,
            "votes": 0,
            "answers": [],
            "created_at": utc_now(),
        }
    )

    inserted_id = await insert_with_unique_slug(questions, base_document)
    created = await questions.find_one({"_id": inserted_id})

    if created is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Question was created but could not be loaded",
        )

    public_question = serialize_question(created)
    background_tasks.add_task(
        publish_question_created,
        public_question.model_dump(mode="json"),
    )

    return public_question


@router.get("/", response_model=QuestionListResponse, response_model_by_alias=False)
async def list_questions(
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    status_filter: QuestionStatus | None = Query(default=None, alias="status"),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> QuestionListResponse:
    query: dict[str, Any] = {}
    if status_filter is not None:
        query["status"] = status_filter.value

    col = database.get_collection("questions")
    cursor = col.find(query, {"content": 0}).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    total = await col.count_documents(query)

    items = []
    for doc in docs:
        doc["answers_count"] = len(doc.get("answers", []))
        items.append(QuestionSummary.model_validate(doc))

    return QuestionListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{slug}", response_model=QuestionPublic, response_model_by_alias=False)
async def get_question_by_slug(
    slug: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> QuestionPublic:
    document = await database.questions.find_one({"slug": slug})

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    return serialize_question(document)


@router.post(
    "/{slug}/answers",
    response_model=QuestionPublic,
    response_model_by_alias=False,
    status_code=status.HTTP_201_CREATED,
)
async def add_answer(
    slug: str,
    payload: AnswerCreate,
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> QuestionPublic:
    questions = database.get_collection("questions")

    document = await questions.find_one({"slug": slug})
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    answer = AnswerInDB(content=payload.content, author=payload.author)
    answer_doc = answer.model_dump(mode="python")
    answer_doc["author"] = author_to_mongo(payload.author)

    updated = await questions.find_one_and_update(
        {"slug": slug},
        {"$push": {"answers": answer_doc}},
        return_document=True,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add answer",
        )

    return serialize_question(updated)
