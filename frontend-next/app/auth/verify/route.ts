import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { SESSION_COOKIE } from "@/lib/session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function isAllowedHost(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase();
  if (bare === "localhost" || bare === "127.0.0.1") return true;
  if (bare.endsWith(".devtunnels.ms")) return true;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      if (new URL(siteUrl).host.toLowerCase() === host.toLowerCase()) return true;
    } catch {
      // ignore malformed env value
    }
  }
  return false;
}

/**
 * The external origin the visitor actually used. Behind a tunnel/proxy
 * request.url resolves to the internal host (localhost). We use the forwarded
 * host only when it's allow-listed — otherwise an attacker could set
 * x-forwarded-host to redirect the post-login victim to a phishing site.
 */
function externalOrigin(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const host =
    forwarded && isAllowedHost(forwarded)
      ? forwarded
      : request.headers.get("host");

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

  const res = await fetchBackend("/auth/verify", {
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
