import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def _publish(event: str, data: dict[str, Any]) -> None:
    settings = get_settings()
    webhook_url = settings.n8n_question_created_webhook_url

    if not webhook_url:
        return

    try:
        async with httpx.AsyncClient(
            timeout=settings.n8n_webhook_timeout_seconds,
        ) as client:
            response = await client.post(
                webhook_url, json={"event": event, "data": data}
            )
            response.raise_for_status()
    except httpx.HTTPError:
        logger.exception("Failed to publish %s webhook to n8n", event)


async def publish_question_created(question: dict[str, Any]) -> None:
    await _publish("question.created", question)


async def publish_question_status_changed(
    question: dict[str, Any], status: str
) -> None:
    await _publish(f"question.{status}", question)
