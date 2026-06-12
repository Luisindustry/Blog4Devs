from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def validate_object_id(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, str) and ObjectId.is_valid(value):
        return value

    raise ValueError("Invalid ObjectId")


ObjectIdStr = Annotated[str, BeforeValidator(validate_object_id)]


class UserRole(str, Enum):
    JUNIOR = "junior"
    SENIOR = "senior"
    ADMIN = "admin"


class QuestionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EmbeddedAuthor(BaseModel):
    user_id: ObjectIdStr
    username: str = Field(..., min_length=3, max_length=50)
    role: UserRole

    model_config = ConfigDict(use_enum_values=True)


class AnswerCreate(BaseModel):
    content: str = Field(..., min_length=20, max_length=20_000)
    author: EmbeddedAuthor


class AnswerInDB(AnswerCreate):
    answer_id: ObjectIdStr = Field(default_factory=lambda: str(ObjectId()))
    is_accepted: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=180)
    content: str = Field(..., min_length=30, max_length=50_000)
    author: EmbeddedAuthor
    tags: list[str] = Field(default_factory=list, min_length=1, max_length=8)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        normalized = sorted({tag.strip().lower() for tag in tags if tag.strip()})
        if not normalized:
            raise ValueError("At least one tag is required")

        return normalized


class QuestionPublic(BaseModel):
    id: ObjectIdStr = Field(alias="_id")
    title: str
    slug: str
    content: str
    author: EmbeddedAuthor
    tags: list[str]
    status: QuestionStatus
    votes: int = 0
    answers: list[AnswerInDB] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)


class QuestionSummary(BaseModel):
    id: ObjectIdStr = Field(alias="_id")
    title: str
    slug: str
    author: EmbeddedAuthor
    tags: list[str]
    status: QuestionStatus
    votes: int = 0
    answers_count: int = 0
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)


class QuestionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=10, max_length=180)
    content: str | None = Field(default=None, min_length=30, max_length=50_000)
    tags: list[str] | None = Field(default=None, min_length=1, max_length=8)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str] | None) -> list[str] | None:
        if tags is None:
            return None
        normalized = sorted({tag.strip().lower() for tag in tags if tag.strip()})
        if not normalized:
            raise ValueError("At least one tag is required")
        return normalized


class QuestionListResponse(BaseModel):
    items: list[QuestionSummary]
    total: int
    skip: int
    limit: int


