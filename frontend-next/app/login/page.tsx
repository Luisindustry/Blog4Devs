import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (session) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-4 pb-20 pt-32">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        blog4devs
      </p>
      <h1 className="mb-8 text-xl font-semibold tracking-tight text-foreground">
        Entra con tu correo
      </h1>
      <LoginForm initialError={error} />
    </main>
  );
}
