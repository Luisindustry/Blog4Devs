import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-start justify-center px-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        error 404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Esta página no existe.
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        El enlace que seguiste está roto o la pregunta fue eliminada.
      </p>
      <Link
        href="/"
        className="mt-6 border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted/40"
      >
        [volver al inicio]
      </Link>
    </main>
  );
}
