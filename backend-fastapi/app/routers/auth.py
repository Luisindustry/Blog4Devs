from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import Settings, get_settings
from app.core.security import (
    create_session_token,
    generate_magic_token,
    hash_token,
)
from app.dependencies import get_current_user, get_database
from app.models.schemas import (
    AuthSession,
    MagicLinkRequest,
    MagicLinkResponse,
    UserPublic,
    UserRole,
    VerifyTokenRequest,
)
from app.services.email import send_magic_link

router = APIRouter(prefix="/auth", tags=["auth"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(
    request: Request,
    database: AsyncIOMotorDatabase,
    email: str,
    settings: Settings,
) -> None:
    """Throttle magic-link requests per email and per IP using a TTL collection."""
    attempts = database.get_collection("auth_attempts")
    ip = get_client_ip(request)
    window_start = utc_now() - timedelta(minutes=settings.rate_limit_window_minutes)

    email_count = await attempts.count_documents(
        {"email": email, "created_at": {"$gte": window_start}}
    )
    if email_count >= settings.rate_limit_max_per_email:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login links requested for this email. Try again later.",
        )

    ip_count = await attempts.count_documents(
        {"ip": ip, "created_at": {"$gte": window_start}}
    )
    if ip_count >= settings.rate_limit_max_per_ip:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Try again later.",
        )

    await attempts.insert_one({"email": email, "ip": ip, "created_at": utc_now()})


@router.post("/request-link", response_model=MagicLinkResponse)
async def request_magic_link(
    payload: MagicLinkRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> MagicLinkResponse:
    settings = get_settings()
    users = database.get_collection("users")
    email = payload.email.lower()

    await enforce_rate_limit(request, database, email, settings)

    user = await users.find_one({"email": email})
    is_new_user = user is None

    if is_new_user:
        if payload.username is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Username is required to register",
            )

        username_taken = await users.find_one({"username": payload.username})
        if username_taken is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken",
            )

        result = await users.insert_one(
            {
                "email": email,
                "username": payload.username,
                "role": UserRole.JUNIOR.value,
                "verified": False,
                "created_at": utc_now(),
            }
        )
        user = await users.find_one({"_id": result.inserted_id})

    raw_token = generate_magic_token()
    await database.magic_links.insert_one(
        {
            "token_hash": hash_token(raw_token),
            "user_id": user["_id"],
            "created_at": utc_now(),
            "expires_at": utc_now() + timedelta(minutes=settings.magic_link_ttl_minutes),
        }
    )

    link = f"{settings.frontend_origin}/auth/verify?token={raw_token}"
    background_tasks.add_task(send_magic_link, email, user["username"], link)

    dev_link = None
    if settings.environment == "local" and not settings.resend_api_key:
        dev_link = link

    return MagicLinkResponse(sent=True, is_new_user=is_new_user, dev_link=dev_link)


@router.post("/verify", response_model=AuthSession)
async def verify_magic_link(
    payload: VerifyTokenRequest,
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> AuthSession:
    record = await database.magic_links.find_one_and_delete(
        {"token_hash": hash_token(payload.token)}
    )

    if record is None or record["expires_at"].replace(tzinfo=None) < utc_now().replace(
        tzinfo=None
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired link",
        )

    user = await database.users.find_one_and_update(
        {"_id": record["user_id"]},
        {"$set": {"verified": True}},
        return_document=True,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    public_user = UserPublic.model_validate(user)
    token = create_session_token(
        user_id=public_user.id,
        username=public_user.username,
        role=str(public_user.role),
        email=public_user.email,
    )

    return AuthSession(access_token=token, user=public_user)


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return current_user
