import { NextRequest, NextResponse } from "next/server";
import { backendUrl, requireToken } from "@/lib/backend";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Proxies the FastAPI SSE stream, injecting the session as a Bearer token
// (EventSource cannot set headers, so it goes through this route).
export async function GET(request: NextRequest, context: RouteContext) {
  const token = await requireToken();
  if (token instanceof NextResponse) return token;

  const { id } = await context.params;
  const afterId = request.nextUrl.searchParams.get("after_id");
  const params = new URLSearchParams();
  if (afterId) params.set("after_id", afterId);

  const upstream = await fetch(
    backendUrl(`/chats/${encodeURIComponent(id)}/stream?${params.toString()}`),
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      cache: "no-store",
      signal: request.signal,
    },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { detail: "No se pudo abrir el stream" },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
