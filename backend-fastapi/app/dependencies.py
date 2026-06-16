from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_session_token
from app.models.schemas import UserPublic, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_database(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db


async def _resolve_user(
    credentials: HTTPAuthorizationCredentials | None,
    database: AsyncIOMotorDatabase,
) -> UserPublic | None:
    if credentials is None:
        return None

    payload = decode_session_token(credentials.credentials)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        return None

    user = await database.users.find_one({"_id": ObjectId(user_id)})
    if user is None or not user.get("verified", False):
        return None

    return UserPublic.model_validate(user)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> UserPublic:
    user = await _resolve_user(credentials, database)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> UserPublic | None:
    return await _resolve_user(credentials, database)


def ensure_moderator(user: UserPublic) -> None:
    if user.role not in (UserRole.ADMIN.value, UserRole.SENIOR.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator role required",
        )
