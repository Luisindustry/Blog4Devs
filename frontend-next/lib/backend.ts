import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";

/**
 * Single source of truth for the FastAPI base URL. Previously this string was
 * duplicated in ~8 files; import from here instead.
 */
export const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export function backendUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Thin fetch wrapper that prefixes the backend base URL. */
export function fetchBackend(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(backendUrl(path), init);
}

/**
 * Cache options for public (non-user-specific) reads. Uses ISR in production
 * to spare the backend, but stays fresh in dev/test so E2E and local work see
 * mutations immediately. Mutations also call revalidatePath to bust the cache.
 */
export function publicCache(revalidateSeconds: number): RequestInit {
  return process.env.NODE_ENV === "production"
    ? { next: { revalidate: revalidateSeconds } }
    : { cache: "no-store" };
}

/**
 * Route Handler guard: returns the session token, or a 401 NextResponse the
 * caller should return directly when the request is unauthenticated.
 */
export async function requireToken(): Promise<string | NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  }
  return token;
}
