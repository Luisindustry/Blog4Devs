import Link from "next/link";
import { QuestionFeed } from "@/components/question-feed";
import { fetchBackend, publicCache } from "@/lib/backend";
import { getSession, type SessionUser } from "@/lib/session";
import type { QuestionListResponse, QuestionStatus, QuestionSummary } from "@/types/api";

// Public feed revalidates on the server (ISR in prod); the moderation queue
// stays fresh. Mutations call revalidatePath("/") to bust the cache.
const PUBLIC_FEED_REVALIDATE_SECONDS = 60;

type PageProps = {
  searchParams: Promise<{ tag?: string }>;
};

function isModerator(session: SessionUser | null): boolean {
  return session?.role === "admin" || session?.role === "senior";
}

async function fetchRecentQuestions(
  tag?: string,
  status?: QuestionStatus,
): Promise<QuestionSummary[]> {
  try {
    const params = new URLSearchParams({ limit: "20" });
    if (tag) params.set("tag", tag);
    if (status) params.set("status", status);

    // Pending queue must be fresh; the approved public feed can be cached.
    const cacheOptions: RequestInit =
      status === "pending"
        ? { cache: "no-store" }
        : publicCache(PUBLIC_FEED_REVALIDATE_SECONDS);

    const res = await fetchBackend(`/questions/?${params.toString()}`, {
      ...cacheOptions,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data: QuestionListResponse = await res.json();
    return data.items;
  } catch {
    return [];
  }
}

export default async function HomePage({ searchParams }: PageProps) {
  const { tag } = await searchParams;
  const session = await getSession();
  const moderator = isModerator(session);

  const [questions, pendingQuestions] = await Promise.all([
    fetchRecentQuestions(tag),
    moderator ? fetchRecentQuestions(tag, "pending") : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
      {/* Hero */}
      <section className="border-b border-border pb-12 pt-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          blog4devs
        </p>
        <h1 className="max-w-lg text-2xl font-semibold leading-tight tracking-tight text-foreground">
          Preguntas técnicas profundas.
          <br />
          Respuestas de desarrolladores senior.
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Una plataforma donde juniors preguntan sin miedo y seniors comparten
          experiencia real — sin Stack Overflow genérico.
        </p>
      </section>

      {/* Feed */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
            {tag ? `Preguntas con [${tag}]` : "Preguntas Recientes"}
          </h2>
          {tag && (
            <Link
              href="/"
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              [quitar filtro ×]
            </Link>
          )}
        </div>
        <QuestionFeed
          initialQuestions={questions}
          pendingQuestions={pendingQuestions}
          currentUsername={session?.username ?? null}
          isModerator={moderator}
          isAdmin={session?.role === "admin"}
        />
      </section>
    </main>
  );
}
