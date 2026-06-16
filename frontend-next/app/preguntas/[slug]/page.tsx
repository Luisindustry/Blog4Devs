import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnswerSection } from "@/components/answer-section";
import { fetchBackend, publicCache } from "@/lib/backend";
import { formatDate } from "@/lib/date";
import { getSession } from "@/lib/session";
import type { Question } from "@/types/api";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DETAIL_REVALIDATE_SECONDS = 300;

// cache() dedupes the call shared by generateMetadata and the page within one
// request; revalidate caches the approved question across requests (ISR).
const fetchQuestion = cache(async (slug: string): Promise<Question | null> => {
  const response = await fetchBackend(`/questions/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
    ...publicCache(DETAIL_REVALIDATE_SECONDS),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Backend error ${response.status} for question "${slug}"`);
  }

  return response.json() as Promise<Question>;
});

function toExcerpt(value: string, maxLength = 155): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  let question: Question | null = null;
  try {
    question = await fetchQuestion(slug);
  } catch {
    return { title: "Error al cargar la pregunta", robots: { index: false, follow: false } };
  }

  if (!question) {
    return { title: "Pregunta no encontrada", robots: { index: false, follow: false } };
  }

  const description = toExcerpt(question.content);
  const url = `${siteUrl}/preguntas/${question.slug}`;
  const shouldIndex = question.status === "approved";

  return {
    title: question.title,
    description,
    keywords: question.tags,
    alternates: { canonical: url },
    openGraph: { title: question.title, description, type: "article", url },
    robots: { index: shouldIndex, follow: shouldIndex },
  };
}

export default async function QuestionPage({ params }: PageProps) {
  const { slug } = await params;
  const [question, session] = await Promise.all([fetchQuestion(slug), getSession()]);

  if (!question) notFound();

  const canMessageAuthor =
    session !== null && session.username !== question.author.username;

  return (
    <main className="page-shell">
      <article itemScope itemType="https://schema.org/Question">
        <header className="question-header">
          <h1 className="question-title" itemProp="name">
            {question.title}
          </h1>
          <p className="meta">
            Por <strong>{question.author.username}</strong> el{" "}
            <time dateTime={question.created_at}>{formatDate(question.created_at)}</time>
            {canMessageAuthor && (
              <>
                {" · "}
                <Link
                  href={`/mensajes?con=${encodeURIComponent(question.author.username)}`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  [mensaje privado]
                </Link>
              </>
            )}
          </p>
          <ul className="tag-list" aria-label="Tags">
            {question.tags.map((tag) => (
              <li key={tag}>
                <Link className="tag" href={`/?tag=${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </header>

        <section className="content" itemProp="text">
          {question.content}
        </section>
      </article>

      <AnswerSection
        slug={question.slug}
        initialAnswers={question.answers}
        currentUsername={session?.username ?? null}
      />
    </main>
  );
}
