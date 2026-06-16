import re
from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, field_validator


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


class AnswerInDB(BaseModel):
    answer_id: ObjectIdStr = Field(default_factory=lambda: str(ObjectId()))
    content: str = Field(..., min_length=20, max_length=20_000)
    author: EmbeddedAuthor
    is_accepted: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=180)
    content: str = Field(..., min_length=30, max_length=50_000)
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


class QuestionStatusUpdate(BaseModel):
    status: QuestionStatus


class VoteResponse(BaseModel):
    votes: int
    voted: bool


class QuestionListResponse(BaseModel):
    items: list[QuestionSummary]
    total: int
    skip: int
    limit: int


class UserPublic(BaseModel):
    id: ObjectIdStr = Field(alias="_id")
    email: EmailStr
    username: str
    role: UserRole
    verified: bool = False
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)


class MagicLinkRequest(BaseModel):
    email: EmailStr
    username: str | None = Field(default=None, min_length=3, max_length=50)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, username: str | None) -> str | None:
        if username is None:
            return None
        cleaned = username.strip()
        if not cleaned:
            return None
        if not re.fullmatch(r"[a-zA-Z0-9_.-]{3,50}", cleaned):
            raise ValueError(
                "Username can only contain letters, numbers, underscores, dots and hyphens"
            )
        return cleaned.lower()


class MagicLinkResponse(BaseModel):
    sent: bool
    is_new_user: bool
    dev_link: str | None = None


class VerifyTokenRequest(BaseModel):
    token: str = Field(..., min_length=10)


class AuthSession(BaseModel):
    access_token: str
    user: UserPublic


class ChatParticipant(BaseModel):
    user_id: ObjectIdStr
    username: str


class ConversationCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class ConversationPublic(BaseModel):
    id: ObjectIdStr = Field(alias="_id")
    participants: list[ChatParticipant]
    last_message_at: datetime | None = None
    last_message_preview: str | None = None
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5_000)


class MessagePublic(BaseModel):
    id: ObjectIdStr = Field(alias="_id")
    conversation_id: ObjectIdStr
    sender: ChatParticipant
    content: str
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)


class MessageListResponse(BaseModel):
    items: list[MessagePublic]


