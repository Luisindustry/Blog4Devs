"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { requestMagicLink, type MagicLinkResult } from "@/app/actions";

// The backend builds the dev link with its configured FRONTEND_ORIGIN
// (localhost), which breaks for anyone testing through a tunnel. Rebuild it
// against the origin the visitor is actually on, keeping the token.
function toLocalVerifyLink(devLink: string): string {
  if (typeof window === "undefined") return devLink;
  try {
    return `${window.location.origin}/auth/verify${new URL(devLink).search}`;
  } catch {
    return devLink;
  }
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<MagicLinkResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Escribe tu correo electrónico");
      return;
    }

    setIsPending(true);
    try {
      const res = await requestMagicLink(email.trim(), username);
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar el enlace");
    } finally {
      setIsPending(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <p className="font-mono text-xs text-muted-foreground">
          {"// "}enlace enviado
        </p>
        <p className="text-sm text-foreground">
          Revisa tu correo <strong>{email}</strong> y haz clic en el enlace para{" "}
          {result.is_new_user ? "confirmar tu cuenta" : "iniciar sesión"}.
        </p>
        <p className="text-xs text-muted-foreground">
          El enlace expira en 15 minutos. Revisa también tu carpeta de spam.
        </p>
        {result.dev_link && (
          <p className="rounded border border-border p-3 font-mono text-xs text-muted-foreground">
            modo dev (sin RESEND_API_KEY):{" "}
            <a
              href={toLocalVerifyLink(result.dev_link)}
              className="text-foreground underline underline-offset-4"
            >
              [entrar directamente]
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {initialError && (
        <p className="rounded border border-red-900/50 p-3 font-mono text-xs text-red-500">
          {initialError === "invalid_token"
            ? "El enlace es inválido o ya expiró. Solicita uno nuevo."
            : "Falta el token de verificación. Solicita un enlace nuevo."}
        </p>
      )}

      <div className="space-y-2">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          correo electrónico
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoFocus
          className="w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          username <span className="normal-case">(solo si es tu primera vez)</span>
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="tu_username"
          className="w-full border-0 border-b border-border bg-transparent py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link
          href="/"
          className="font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          [volver]
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="border border-border px-4 py-2 font-mono text-xs text-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
        >
          {isPending ? "[enviando...]" : "[enviar enlace mágico]"}
        </button>
      </div>

      <p className="pt-4 text-xs text-muted-foreground">
        Sin contraseñas. Te enviamos un enlace a tu correo para confirmar que
        existes y listo.
      </p>
    </form>
  );
}
