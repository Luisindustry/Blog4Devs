"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchBackend } from "@/lib/backend";
import { SESSION_COOKIE, getSessionToken } from "@/lib/session";

export type QuestionFormData = {
  title: string;
  content: string;
  tags: string[];
};

export type MagicLinkResult = {
  sent: boolean;
  is_new_user: boolean;
  dev_link: string | null;
};

export type VoteResult = {
  votes: number;
  voted: boolean;
};

function parseError(err: Record<string, unknown>, fallback: string): string {
  const detail = err.detail;
  if (Array.isArray(detail)) return detail[0]?.msg ?? fallback;
  if (typeof detail === "string") return detail;
  return fallback;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  if (!token) {
    throw new Error("Debes iniciar sesión para continuar");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function requestMagicLink(
  email: string,
  username: string,
): Promise<MagicLinkResult> {
  const body: Record<string, string> = { email };
  if (username.trim()) body.username = username.trim();

  const res = await fetchBackend("/auth/request-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al enviar el enlace"));
  }

  return res.json();
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}

export async function signOutEverywhere() {
  // Revokes every session token server-side, then clears this device's cookie.
  try {
    await fetchBackend("/auth/logout-all", {
      method: "POST",
      headers: await authHeaders(),
    });
  } catch {
    // Clear the local cookie regardless of the backend result.
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}

export async function createQuestion(data: QuestionFormData) {
  const res = await fetchBackend("/questions/", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      title: data.title,
      content: data.content,
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
  const res = await fetchBackend(`/questions/${slug}`, {
    method: "PATCH",
    headers: await authHeaders(),
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
  revalidatePath(`/preguntas/${slug}`);
}

export async function createAnswer(slug: string, content: string) {
  const res = await fetchBackend(`/questions/${slug}/answers`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al publicar la respuesta"));
  }

  revalidatePath(`/preguntas/${slug}`);
  return res.json();
}

export async function deleteQuestion(slug: string) {
  const res = await fetchBackend(`/questions/${slug}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al eliminar la pregunta"));
  }

  revalidatePath("/");
}

export async function toggleVote(slug: string): Promise<VoteResult> {
  // No revalidatePath here: votes are high-frequency and the authoritative
  // count comes back in the response, so we avoid busting the feed cache.
  const res = await fetchBackend(`/questions/${slug}/vote`, {
    method: "POST",
    headers: await authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al votar"));
  }

  return res.json();
}

export async function acceptAnswer(slug: string, answerId: string) {
  const res = await fetchBackend(
    `/questions/${slug}/answers/${answerId}/accept`,
    {
      method: "POST",
      headers: await authHeaders(),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al aceptar la respuesta"));
  }

  revalidatePath(`/preguntas/${slug}`);
  return res.json();
}

export async function updateQuestionStatus(
  slug: string,
  status: "approved" | "rejected",
) {
  const res = await fetchBackend(`/questions/${slug}/status`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al moderar la pregunta"));
  }

  revalidatePath("/");
  return res.json();
}

export async function setUserRole(
  username: string,
  role: "junior" | "senior" | "admin",
) {
  const res = await fetchBackend(
    `/users/${encodeURIComponent(username)}/role`,
    {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ role }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseError(err, "Error al cambiar el rol"));
  }

  revalidatePath("/admin");
  return res.json();
}
