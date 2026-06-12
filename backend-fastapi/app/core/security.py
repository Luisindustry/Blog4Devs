import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import get_settings

JWT_ALGORITHM = "HS256"


def generate_magic_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_session_token(user_id: str, username: str, role: str, email: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "email": email,
        "iat": now,
        "exp": now + timedelta(days=settings.session_ttl_days),
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.auth_secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None
