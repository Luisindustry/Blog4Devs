"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createAnswer } from "@/app/actions";
import { formatDate } from "@/lib/date";
import type { Answer } from "@/types/api";

type AnswerSectionProps = {
  slug: string;
  initialAnswers: Answer[];
  currentUsername: string | null;
};

function AnswerItem({ answer }: { answer: Answer & { isOptimistic?: boolean } }) {
  return (
    <article
      className={[
        "answer",
        answer.is_accepted ? "accepted" : "",
        answer.isOptimistic ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      itemProp="suggestedAnswer"
      itemScope
      itemType="https://schema.org/Answer"
    >
      <p className="content" itemProp="text">
        {answer.content}
      </p>
      <p className="answer-meta">
        {answer.isOptimistic ? "Publicando" : "Respondió"}{" "}
        <strong>{answer.author.username}</strong>
        {!answer.isOptimistic && (
          <>
            {" "}
            el{" "}
            <time dateTime={answer.created_at}>{formatDate(answer.created_at)}</time>
          </>
        )}
        {answer.is_accepted && " · Respuesta aceptada"}
      </p>
    </article>
  );
}

export function AnswerSection({
  slug,
  initialAnswers,
  currentUsername,
}: AnswerSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [optimisticAnswers, dispatch] = useOptimistic(
    initialAnswers,
    (state: (Answer & { isOptimistic?: boolean })[], newAnswer: Answer & { isOptimistic?: boolean }) => [
      ...state,
      newAnswer,
    ],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    if (!currentUsername) return;

    const trimmed = content.trim();
    if (trimmed.length < 20) {
      toast.error("La respuesta debe tener al menos 20 caracteres");
      textareaRef.current?.focus();
      return;
    }

    const tempAnswer: Answer & { isOptimistic: boolean } = {
      answer_id: `temp-${Date.now()}`,
      content: trimmed,
      author: { user_id: "temp", username: currentUsername, role: "junior" },
      is_accepted: false,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setContent("");

    startTransition(async () => {
      dispatch(tempAnswer);
      try {
        await createAnswer(slug, trimmed);
        toast.success("Respuesta publicada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al publicar");
      }
    });
  }

  return (
    <section className="answers" aria-labelledby="answers-heading">
      <h2 id="answers-heading">Respuestas</h2>

      {optimisticAnswers.length === 0 ? (
        <p className="meta">Aún no hay respuestas publicadas.</p>
      ) : (
        optimisticAnswers.map((answer) => (
          <AnswerItem key={answer.answer_id} answer={answer} />
        ))
      )}

      {/* Formulario de respuesta */}
      <div className="mt-10 border-t border-border pt-8">
        {currentUsername ? (
          <>
            <p className="font-mono text-xs text-muted-foreground mb-4">
              // nueva respuesta como @{currentUsername}
            </p>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"Escribe tu respuesta aquí.\nSoporta Markdown. Mínimo 20 caracteres."}
              rows={7}
              className="w-full resize-none rounded border border-border bg-transparent p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-ring focus:outline-none"
            />

            <div className="mt-3 flex items-center justify-end gap-3">
              <span className="font-mono text-[10px] text-muted-foreground/40">⌘ Enter</span>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
              >
                {isPending ? "[respondiendo...]" : "[responder]"}
              </button>
            </div>
          </>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">
            //{" "}
            <Link
              href="/login"
              className="underline underline-offset-4 hover:text-foreground"
            >
              inicia sesión
            </Link>{" "}
            para responder
          </p>
        )}
      </div>
    </section>
  );
}
