import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mensajes",
};

type PageProps = {
  searchParams: Promise<{ con?: string }>;
};

export default async function MessagesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { con } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
      <section className="border-b border-border pb-8 pt-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          @{session.username}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Mensajes privados
        </h1>
      </section>

      <ChatPanel currentUsername={session.username} startWith={con ?? null} />
    </main>
  );
}
