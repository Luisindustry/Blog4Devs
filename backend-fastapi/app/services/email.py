import html
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def magic_link_html(username: str, link: str) -> str:
    # username is user-controlled; escape it to prevent HTML injection in the
    # email body. The link is a server-generated URL but we escape it too.
    safe_username = html.escape(username)
    link = html.escape(link, quote=True)
    return f"""
    <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin-bottom: 8px;">blog4devs</h2>
      <p>Hola <strong>{safe_username}</strong>,</p>
      <p>Haz clic en el siguiente enlace para confirmar tu correo e iniciar sesión:</p>
      <p style="margin: 24px 0;">
        <a href="{link}"
           style="background: #18181b; color: #fafafa; padding: 10px 20px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Confirmar e iniciar sesión
        </a>
      </p>
      <p style="color: #71717a; font-size: 12px;">
        Este enlace expira pronto. Si no solicitaste este correo, ignóralo.
      </p>
    </div>
    """


async def send_magic_link(to_email: str, username: str, link: str) -> None:
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not configured. Magic link for %s: %s",
            to_email,
            link,
        )
        return

    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": "Confirma tu correo — blog4devs",
        "html": magic_link_html(username, link),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                RESEND_API_URL,
                json=payload,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        logger.exception("Failed to send magic link email to %s", to_email)
        raise
