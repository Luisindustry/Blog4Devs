"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function QuestionError({ error, reset }: ErrorProps) {
  return (
    <main className="page-shell">
      <h1 className="question-title">Error al cargar la pregunta</h1>
      <p className="meta">{error.message}</p>
      <button className="tag" onClick={reset} type="button">
        Intentar de nuevo
      </button>
    </main>
  );
}
