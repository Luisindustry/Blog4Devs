import { cookies } from "next/headers";

export const SESSION_COOKIE = "b4d_session";

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  email: string;
};

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Decodes the JWT payload for display purposes only.
 * The backend verifies the signature on every write operation.
 */
export async function getSession(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf-8"));

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
