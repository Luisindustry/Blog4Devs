import Link from "next/link";
import { QuestionFeed } from "@/components/question-feed";
import { getSession } from "@/lib/session";
import type { QuestionListResponse, QuestionSummary } from "@/types/api";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000";

type PageProps = {
  searchParams: Promise<{ tag?: string }>;
};

async function fetchRecentQuestions(tag?: string): Promise<QuestionSummary[]> {
  try {
    const params = new URLSearchParams({ limit: "20" });
    if (tag) params.set("tag", tag);

    const res = await fetch(`${apiBaseUrl}/questions/?${params.toString()}`, {
      cache: "no-store",
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
  const [questions, session] = await Promise.all([
    fetchRecentQuestions(tag),
    getSession(),
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
          currentUsername={session?.username ?? null}
          isAdmin={session?.role === "admin"}
        />
      </section>
    </main>
  );
}
