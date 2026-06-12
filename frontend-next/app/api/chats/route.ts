import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

async function requireToken(): Promise<string | NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  }
  return token;
}

export async function GET() {
  const token = await requireToken();
  if (token instanceof NextResponse) return token;

  const res = await fetch(`${API_BASE}/chats/`, {
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

  const res = await fetch(`${API_BASE}/chats/`, {
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
