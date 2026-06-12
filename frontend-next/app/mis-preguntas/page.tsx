import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatRelativeTime } from "@/lib/date";
import { getSession, getSessionToken } from "@/lib/session";
import type { QuestionListResponse, QuestionSummary } from "@/types/api";

export const metadata: Metadata = {
  title: "Mis preguntas",
};

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000";

async function fetchMyQuestions(token: string): Promise<QuestionSummary[]> {
  try {
    const res = await fetch(`${apiBaseUrl}/questions/mine`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const data: QuestionListResponse = await res.json();
    return data.items;
  } catch {
    return [];
  }
}

export default async function MyQuestionsPage() {
  const [session, token] = await Promise.all([getSession(), getSessionToken()]);
  if (!session || !token) redirect("/login");

  const questions = await fetchMyQuestions(token);
  const answered = questions.filter((q) => q.answers_count > 0).length;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
      <section className="border-b border-border pb-8 pt-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          @{session.username}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Mis preguntas
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {questions.length} enviadas · {answered} con respuesta ·{" "}
          {questions.length - answered} esperando
        </p>
      </section>

      <section className="mt-6">
        {questions.length === 0 ? (
          <p className="py-12 text-center font-mono text-sm text-muted-foreground">
            Todavía no has enviado preguntas.{" "}
            <Link href="/" className="underline underline-offset-4 hover:text-foreground">
              Crea la primera
            </Link>
          </p>
        ) : (
          <ul>
            {questions.map((q) => (
              <li
                key={q.id}
                className="flex items-start justify-between gap-4 border-b border-border px-1 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/preguntas/${q.slug}`}
                    className="text-sm leading-snug text-foreground/90 hover:text-foreground"
                  >
                    {q.title}
                  </Link>
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/60">
                    {formatRelativeTime(q.created_at)}
                    {" · "}
                    {q.tags.map((t) => `[${t}]`).join(" ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] ${
                    q.answers_count > 0
                      ? "border-emerald-900 text-emerald-500"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {q.answers_count > 0
                    ? `✓ ${q.answers_count} resp.`
                    : "sin responder"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
