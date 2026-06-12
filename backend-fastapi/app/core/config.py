from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Junior Senior QA API"
    environment: str = "local"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "community_qa"
    frontend_origin: str = "http://localhost:3000"
    auth_secret_key: str = "dev-secret-change-me-in-production"
    magic_link_ttl_minutes: int = Field(default=15, ge=5, le=60)
    session_ttl_days: int = Field(default=30, ge=1, le=365)
    resend_api_key: str | None = None
    email_from: str = "blog4devs <onboarding@resend.dev>"
    n8n_question_created_webhook_url: str | None = None
    n8n_webhook_timeout_seconds: float = Field(default=5.0, ge=1.0, le=30.0)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
