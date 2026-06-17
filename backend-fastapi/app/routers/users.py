from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.time import utc_now
from app.dependencies import ensure_admin, get_current_user, get_database
from app.models.schemas import RoleUpdate, UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserPublic], response_model_by_alias=False)
async def list_users(
    current_user: UserPublic = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> list[UserPublic]:
    ensure_admin(current_user)

    cursor = database.users.find({"verified": True}).sort("created_at", -1).limit(200)
    docs = await cursor.to_list(length=200)
    return [UserPublic.model_validate(doc) for doc in docs]


@router.patch(
    "/{username}/role",
    response_model=UserPublic,
    response_model_by_alias=False,
)
async def update_user_role(
    username: str,
    payload: RoleUpdate,
    current_user: UserPublic = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> UserPublic:
    ensure_admin(current_user)

    # Bump sessions_valid_after so the user's existing tokens (carrying the old
    # role) are revoked and they re-login with the new permissions.
    updated = await database.users.find_one_and_update(
        {"username": username.strip().lower()},
        {"$set": {"role": payload.role.value, "sessions_valid_after": utc_now()}},
        return_document=True,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserPublic.model_validate(updated)
