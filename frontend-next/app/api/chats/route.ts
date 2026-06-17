import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, requireToken } from "@/lib/backend";

export async function GET() {
  const token = await requireToken();
  if (token instanceof NextResponse) return token;

  const res = await fetchBackend("/chats/", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const token = await requireToken();
  if (token instanceof NextResponse) return token;

  const body = await request.json().catch(() => ({}));

  const res = await fetchBackend("/chats/", {
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
