import { QuestionCard } from "@/components/question-card";
import type { QuestionListResponse, QuestionSummary } from "@/types/api";
import { formatRelativeTime } from "@/lib/date";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000";

async function fetchRecentQuestions(): Promise<QuestionSummary[]> {
  try {
    const res = await fetch(`${apiBaseUrl}/questions/?limit=20`, {
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

export default async function HomePage() {
  const questions = await fetchRecentQuestions();

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
          Una plataforma donde juniors preguntan sin miedo y seniors comparten experiencia real —
          sin Stack Overflow genérico.
        </p>
      </section>

      {/* Feed */}
      <section className="mt-8">
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
          Preguntas Recientes
        </h2>

        {questions.length === 0 ? (
          <p className="py-12 text-center font-mono text-sm text-muted-foreground">
            No hay preguntas todavía. ¡Sé el primero en preguntar.
          </p>
        ) : (
          <div>
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                id={q.id}
                slug={q.slug}
                title={q.title}
                tags={q.tags}
                author={q.author.username}
                votes={q.votes}
                answersCount={q.answers_count}
                createdAt={formatRelativeTime(q.created_at)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
