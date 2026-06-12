export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

  const res = await fetch(`${API_BASE}/questions/${slug}`, { cache: "no-store" });
  const data = await res.json();

  return Response.json(data, { status: res.status });
}
