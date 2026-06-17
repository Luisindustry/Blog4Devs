"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/date";
import type { ChatMessage, Conversation } from "@/types/api";

function otherParticipant(conversation: Conversation, me: string): string {
  const other = conversation.participants.find((p) => p.username !== me);
  return other?.username ?? me;
}

export function ChatPanel({
  currentUsername,
  startWith,
}: {
  currentUsername: string;
  startWith: string | null;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [newChatUser, setNewChatUser] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      setConversations(data);
    } catch {
      // red caída: el siguiente poll reintenta
    } finally {
      setLoaded(true);
    }
  }, []);

  const openConversationWith = useCallback(async (username: string) => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          typeof data.detail === "string" ? data.detail : "No se pudo abrir el chat",
        );
        return;
      }
      setActiveId(data.id);
      await loadConversations();
    } catch {
      toast.error("No se pudo abrir el chat");
    }
  }, [loadConversations]);

  // Initial load + optional deep-link (?con=username)
  useEffect(() => {
    loadConversations();
    if (startWith) {
      openConversationWith(startWith);
    }
  }, [loadConversations, openConversationWith, startWith]);

  // Subscribe to the conversation's live message stream (SSE). Replaces the
  // previous 4s polling with a single long-lived connection per conversation.
  useEffect(() => {
    setMessages([]);
    if (!activeId) return;

    const source = new EventSource(`/api/chats/${activeId}/stream`);
    source.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message],
        );
      } catch {
        // ignore malformed event
      }
    };
    // EventSource auto-reconnects on error; the id-dedupe above keeps the
    // message list clean when the stream replays after a reconnect.

    return () => source.close();
  }, [activeId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || !activeId) return;

    setSending(true);
    setDraft("");
    try {
      const res = await fetch(`/api/chats/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("No se pudo enviar el mensaje");
        setDraft(content);
        return;
      }
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      loadConversations();
    } catch {
      toast.error("No se pudo enviar el mensaje");
      setDraft(content);
    } finally {
      setSending(false);
    }
  }

  function handleStartNewChat(e: React.FormEvent) {
    e.preventDefault();
    const username = newChatUser.trim().toLowerCase();
    if (!username) return;
    setNewChatUser("");
    openConversationWith(username);
  }

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <section className="mt-6 grid min-h-[480px] grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
      {/* Conversation list */}
      <aside className="border border-border rounded">
        <form onSubmit={handleStartNewChat} className="border-b border-border p-3">
          <input
            value={newChatUser}
            onChange={(e) => setNewChatUser(e.target.value)}
            placeholder="@username + Enter"
            className="w-full bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </form>

        {!loaded ? (
          <p className="p-3 font-mono text-xs text-muted-foreground/60">cargando...</p>
        ) : conversations.length === 0 ? (
          <p className="p-3 font-mono text-xs text-muted-foreground/60">
            Sin conversaciones. Escribe un @username arriba para empezar.
          </p>
        ) : (
          <ul>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`w-full border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/30 ${
                    c.id === activeId ? "bg-muted/40" : ""
                  }`}
                >
                  <span className="block font-mono text-xs text-foreground">
                    @{otherParticipant(c, currentUsername)}
                  </span>
                  {c.last_message_preview && (
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {c.last_message_preview}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Active conversation */}
      <div className="flex flex-col border border-border rounded">
        {activeConversation === null ? (
          <p className="m-auto p-8 text-center font-mono text-xs text-muted-foreground/60">
            Selecciona una conversación o empieza una nueva.
          </p>
        ) : (
          <>
            <header className="border-b border-border px-4 py-2.5">
              <span className="font-mono text-xs text-foreground">
                @{otherParticipant(activeConversation, currentUsername)}
              </span>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground/50">
                  Aún no hay mensajes. ¡Rompe el hielo!
                </p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender.username === currentUsername;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`message-in max-w-[75%] rounded border px-3 py-2 ${
                          isMine
                            ? "border-ring/40 bg-muted/40"
                            : "border-border bg-transparent"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {m.content}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/50">
                          {formatRelativeTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-end gap-2 border-t border-border p-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribe un mensaje... (Enter para enviar)"
                rows={2}
                className="flex-1 resize-none rounded border border-border bg-transparent p-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-ring focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="border border-border px-3 py-2 font-mono text-xs text-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
              >
                [enviar]
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
