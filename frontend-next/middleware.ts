import { NextRequest, NextResponse } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/session.ts. (Middleware runs on the
// Edge runtime, so it can't import the server-only session module.)
const SESSION_COOKIE = "b4d_session";

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/mis-preguntas/:path*", "/mensajes/:path*", "/admin/:path*"],
};
