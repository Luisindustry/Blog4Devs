import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def publish_question_created(question: dict[str, Any]) -> None:
    settings = get_settings()
    webhook_url = settings.n8n_question_created_webhook_url

    if not webhook_url:
        return

    payload = {
        "event": "question.created",
        "data": question,
    }

    try:
        async with httpx.AsyncClient(
            timeout=settings.n8n_webhook_timeout_seconds,
        ) as client:
            response = await client.post(webhook_url, json=payload)
            response.raise_for_status()
    except httpx.HTTPError:
        logger.exception("Failed to publish question.created webhook to n8n")
