import { NextResponse } from "next/server";
import { fetchBackend, requireToken } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Full question content (incl. non-approved) is only needed for editing,
  // which requires a session. Passing the token also lets authors load their
  // own pending questions.
  const token = await requireToken();
  if (token instanceof NextResponse) return token;

  const { slug } = await params;

  const res = await fetchBackend(`/questions/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));

  return NextResponse.json(data, { status: res.status });
}
