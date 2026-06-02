import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Question } from "@/types/api";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 60;

async function fetchQuestion(slug: string): Promise<Question | null> {
  const response = await fetch(`${apiBaseUrl}/questions/${encodeURIComponent(slug)}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Backend error ${response.status} for question "${slug}"`);
  }

  return response.json() as Promise<Question>;
}

function toExcerpt(value: string, maxLength = 155): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
  }).format(new Date(value));
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
    return {
      title: "Pregunta no encontrada",
      robots: { index: false, follow: false },
    };
  }

  const description = toExcerpt(question.content);
  const url = `${siteUrl}/preguntas/${question.slug}`;
  const shouldIndex = question.status === "approved";

  return {
    title: question.title,
    description,
    keywords: question.tags,
    alternates: { canonical: url },
    openGraph: {
      title: question.title,
      description,
      type: "article",
      url,
    },
    robots: { index: shouldIndex, follow: shouldIndex },
  };
}

export default async function QuestionPage({ params }: PageProps) {
  const { slug } = await params;
  const question = await fetchQuestion(slug);

  if (!question) {
    notFound();
  }

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
          </p>
          <ul className="tag-list" aria-label="Tags">
            {question.tags.map((tag) => (
              <li className="tag" key={tag}>
                {tag}
              </li>
            ))}
          </ul>
        </header>

        <section className="content" itemProp="text">
          {question.content}
        </section>

        <section className="answers" aria-labelledby="answers-heading">
          <h2 id="answers-heading">Respuestas</h2>
          {question.answers.length === 0 ? (
            <p className="meta">Aun no hay respuestas publicadas.</p>
          ) : (
            question.answers.map((answer) => (
              <article
                className={answer.is_accepted ? "answer accepted" : "answer"}
                itemProp="suggestedAnswer"
                itemScope
                itemType="https://schema.org/Answer"
                key={answer.answer_id}
              >
                <p className="content" itemProp="text">
                  {answer.content}
                </p>
                <p className="answer-meta">
                  Respondio <strong>{answer.author.username}</strong> el{" "}
                  <time dateTime={answer.created_at}>{formatDate(answer.created_at)}</time>
                  {answer.is_accepted ? " · Respuesta aceptada" : null}
                </p>
              </article>
            ))
          )}
        </section>
      </article>
    </main>
  );
}
