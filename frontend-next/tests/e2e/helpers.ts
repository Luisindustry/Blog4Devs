export const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

// Unique suffix per test-run so titles don't collide across runs
const RUN_ID = Math.random().toString(36).slice(2, 7);

// Fixed identity so request-link is idempotent across runs (same email = same user)
const E2E_USER = {
  email: "e2e_tester@example.com",
  username: "e2e_tester",
};

let cachedToken: string | null = null;

/**
 * Runs the passwordless magic-link flow against the API and returns a session
 * token. Works in CI because RESEND_API_KEY is unset there, so the backend
 * returns the link directly (dev_link) instead of sending an email.
 */
export async function getAuthToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const requestRes = await fetch(`${API_BASE}/auth/request-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(E2E_USER),
  });

  if (!requestRes.ok) {
    throw new Error(
      `request-link failed ${requestRes.status}: ${await requestRes.text()}`,
    );
  }

  const { dev_link: devLink } = await requestRes.json();
  if (!devLink) {
    throw new Error(
      "request-link did not return dev_link — is RESEND_API_KEY set on the test backend?",
    );
  }

  const token = new URL(devLink).searchParams.get("token");
  const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!verifyRes.ok) {
    throw new Error(`verify failed ${verifyRes.status}: ${await verifyRes.text()}`);
  }

  const { access_token: accessToken } = await verifyRes.json();
  cachedToken = accessToken;
  return accessToken;
}

type SeedOptions = {
  title?: string;
  content?: string;
  tags?: string[];
};

export type SeededQuestion = {
  id: string;
  slug: string;
  title: string;
};

export async function seedQuestion(opts: SeedOptions = {}): Promise<SeededQuestion> {
  const baseTitle = opts.title ?? "Pregunta de prueba para tests E2E automatizados";
  // Append run ID so re-runs don't produce duplicate-title cards in the feed
  const title = `${baseTitle} [${RUN_ID}]`;

  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/questions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      content:
        opts.content ??
        "Contenido de prueba que cumple el mínimo de 30 caracteres requerido por la validación de la API para ser aceptado.",
      tags: opts.tags ?? ["test", "e2e"],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`seedQuestion failed ${res.status}: ${body}`);
  }

  return res.json();
}
