import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, requireToken } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const token = await requireToken();
  if (token instanceof NextResponse) return token;

  const { id } = await context.params;
  const afterId = request.nextUrl.searchParams.get("after_id");

  const params = new URLSearchParams();
  if (afterId) params.set("after_id", afterId);

  const res = await fetchBackend(
    `/chats/${encodeURIComponent(id)}/messages?${params.toString()}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const data = await res.json().catch(() => ({ items: [] }));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const token = await requireToken();
  if (token instanceof NextResponse) return token;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const res = await fetchBackend(`/chats/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
