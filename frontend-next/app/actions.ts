"use server";

import { revalidatePath } from "next/cache";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export type QuestionFormData = {
  title: string;
  content: string;
  tags: string[];
  username: string;
};

function parseError(err: Record<string, unknown>, fallback: string): string {
  const detail = err.detail;
  if (Array.isArray(detail)) return detail[0]?.msg ?? fallback;
  if (typeof detail === "string") return detail;
  return fallback;
}

export async function createQuestion(data: QuestionFormData) {
  const res = await fetch(`${API_BASE}/questions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      author: {
        user_id: "507f1f77bcf86cd799439011",
        username: data.username || "anon",
        role: "junior",
      },
      tags: data.tags,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al crear la pregunta"));
  }

  revalidatePath("/");
  return res.json();
}

export async function updateQuestion(slug: string, data: QuestionFormData) {
  const res = await fetch(`${API_BASE}/questions/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      tags: data.tags,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al actualizar la pregunta"));
  }

  revalidatePath("/");
}

export async function createAnswer(slug: string, content: string, username: string) {
  const res = await fetch(`${API_BASE}/questions/${slug}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      author: {
        user_id: "507f1f77bcf86cd799439011",
        username: username || "anon",
        role: "junior",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al publicar la respuesta"));
  }

  revalidatePath(`/preguntas/${slug}`);
  return res.json();
}

export async function deleteQuestion(slug: string) {
  const res = await fetch(`${API_BASE}/questions/${slug}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al eliminar la pregunta"));
  }

  revalidatePath("/");
}
