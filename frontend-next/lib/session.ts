import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "b4d_session";

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  email: string;
};

// Shared with the backend's AUTH_SECRET_KEY. When present we verify the JWT
// signature so role-based UI can be trusted; when absent (dev convenience) we
// fall back to decoding only. The backend always re-verifies on every write.
const AUTH_SECRET = process.env.AUTH_SECRET_KEY;

function verifySignature(token: string): boolean {
  if (!AUTH_SECRET) return true;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);
  return provided.length === computed.length && timingSafeEqual(provided, computed);
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    if (!verifySignature(token)) return null;

    const payloadPart = token.split(".")[1];
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf-8"),
    );

    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
