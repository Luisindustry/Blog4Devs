export const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

// Unique suffix per test-run so titles don't collide across runs
const RUN_ID = Math.random().toString(36).slice(2, 7);

const TEST_AUTHOR = {
  user_id: "507f1f77bcf86cd799439011",
  username: "e2e_tester",
  role: "junior" as const,
};

type SeedOptions = {
  title?: string;
  content?: string;
  tags?: string[];
};

export type SeededQuestion = {
  id: string;
  slug: string;
  title: string;
};

export async function seedQuestion(opts: SeedOptions = {}): Promise<SeededQuestion> {
  const baseTitle = opts.title ?? "Pregunta de prueba para tests E2E automatizados";
  // Append run ID so re-runs don't produce duplicate-title cards in the feed
  const title = `${baseTitle} [${RUN_ID}]`;

  const res = await fetch(`${API_BASE}/questions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      content:
        opts.content ??
        "Contenido de prueba que cumple el mínimo de 30 caracteres requerido por la validación de la API para ser aceptado.",
      author: TEST_AUTHOR,
      tags: opts.tags ?? ["test", "e2e"],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`seedQuestion failed ${res.status}: ${body}`);
  }

  return res.json();
}
