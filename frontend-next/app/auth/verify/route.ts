import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * The external origin the visitor actually used. Behind a tunnel/proxy
 * request.url resolves to the internal host (localhost), which would redirect
 * a remote visitor back to their own machine. The forwarded headers carry the
 * real public host instead.
 */
function externalOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const origin = externalOrigin(request);
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", origin));
  }

  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin));
  }

  const data = await res.json();

  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set(SESSION_COOKIE, data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
