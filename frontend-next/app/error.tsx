"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <html lang="es">
      <body>
        <main className="page-shell">
          <h1 className="question-title">Algo salio mal</h1>
          <p className="meta">{error.message}</p>
          <button className="tag" onClick={reset} type="button">
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
