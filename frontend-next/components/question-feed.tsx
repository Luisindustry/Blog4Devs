"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { QuestionCard } from "@/components/question-card";
import { QuestionSheet } from "@/components/question-sheet";
import {
  createQuestion,
  deleteQuestion,
  updateQuestion,
  updateQuestionStatus,
  type QuestionFormData,
} from "@/app/actions";
import { formatRelativeTime } from "@/lib/date";
import type { QuestionSummary } from "@/types/api";

type OptimisticAction =
  | { type: "create"; item: QuestionSummary }
  | { type: "update"; item: QuestionSummary }
  | { type: "delete"; id: string };

function makeOptimisticItem(
  data: QuestionFormData,
  username: string,
): QuestionSummary {
  return {
    id: `optimistic-${Date.now()}`,
    slug: data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60),
    title: data.title,
    tags: data.tags,
    author: { user_id: "temp", username, role: "junior" },
    status: "pending",
    votes: 0,
    answers_count: 0,
    created_at: new Date().toISOString(),
  };
}

export function QuestionFeed({
  initialQuestions,
  pendingQuestions = [],
  currentUsername,
  isModerator = false,
  isAdmin = false,
}: {
  initialQuestions: QuestionSummary[];
  pendingQuestions?: QuestionSummary[];
  currentUsername: string | null;
  isModerator?: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QuestionSummary | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [optimisticItems, dispatch] = useOptimistic(
    initialQuestions,
    (state: QuestionSummary[], action: OptimisticAction) => {
      switch (action.type) {
        case "create":
          return [action.item, ...state];
        case "update":
          return state.map((q) => (q.id === action.item.id ? action.item : q));
        case "delete":
          return state.filter((q) => q.id !== action.id);
        default:
          return state;
      }
    },
  );

  const [optimisticPending, dispatchPending] = useOptimistic(
    pendingQuestions,
    (state: QuestionSummary[], action: OptimisticAction) => {
      if (action.type === "delete") {
        return state.filter((q) => q.id !== action.id);
      }
      return state;
    },
  );

  function canModify(question: QuestionSummary): boolean {
    if (isAdmin) return true;
    return currentUsername !== null && question.author.username === currentUsername;
  }

  function openCreateSheet() {
    if (!currentUsername) {
      toast.error("Inicia sesión para crear una pregunta");
      router.push("/login");
      return;
    }
    setEditTarget(null);
    setEditContent("");
    setSheetOpen(true);
  }

  // Global shortcut: C → open create sheet
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") {
        if (!currentUsername) {
          toast.error("Inicia sesión para crear una pregunta");
          router.push("/login");
          return;
        }
        setEditTarget(null);
        setEditContent("");
        setSheetOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentUsername, router]);

  async function handleEdit(question: QuestionSummary) {
    setEditTarget(question);
    setEditContent("");
    setSheetOpen(true);
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/questions/${question.slug}`);
      const full = await res.json();
      setEditContent(full.content ?? "");
    } catch {
      setEditContent("");
    } finally {
      setLoadingContent(false);
    }
  }

  function handleCreate(data: QuestionFormData) {
    const tempItem = makeOptimisticItem(data, currentUsername ?? "yo");
    setSheetOpen(false);

    startTransition(async () => {
      dispatch({ type: "create", item: tempItem });
      try {
        await createQuestion(data);
        toast.success("Pregunta publicada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al publicar");
      }
    });
  }

  function handleUpdate(data: QuestionFormData) {
    if (!editTarget) return;

    const updatedItem: QuestionSummary = {
      ...editTarget,
      title: data.title,
      tags: data.tags,
    };
    setSheetOpen(false);
    setEditTarget(null);

    startTransition(async () => {
      dispatch({ type: "update", item: updatedItem });
      try {
        await updateQuestion(editTarget.slug, data);
        toast.success("Pregunta actualizada");
      } catch {
        toast.error("Error al actualizar");
      }
    });
  }

  function handleDelete(question: QuestionSummary) {
    setPendingDeleteId(question.id);

    startTransition(async () => {
      dispatch({ type: "delete", id: question.id });
      try {
        await deleteQuestion(question.slug);
        toast.success("Pregunta eliminada");
      } catch {
        toast.error("Error al eliminar");
      } finally {
        setPendingDeleteId(null);
      }
    });
  }

  function handleModerate(
    question: QuestionSummary,
    status: "approved" | "rejected",
  ) {
    startTransition(async () => {
      dispatchPending({ type: "delete", id: question.id });
      try {
        await updateQuestionStatus(question.slug, status);
        toast.success(
          status === "approved" ? "Pregunta aprobada" : "Pregunta rechazada",
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al moderar");
        router.refresh();
      }
    });
  }

  function renderCard(q: QuestionSummary, index: number, moderation = false) {
    return (
      <QuestionCard
        key={q.id}
        index={index}
        id={q.id}
        slug={q.slug}
        title={q.title}
        tags={q.tags}
        author={q.author.username}
        votes={q.votes}
        answersCount={q.answers_count}
        createdAt={formatRelativeTime(q.created_at)}
        status={q.status}
        canVote={currentUsername !== null}
        isPendingDelete={pendingDeleteId === q.id}
        onEdit={canModify(q) ? () => handleEdit(q) : undefined}
        onDelete={canModify(q) ? () => handleDelete(q) : undefined}
        onApprove={moderation ? () => handleModerate(q, "approved") : undefined}
        onReject={moderation ? () => handleModerate(q, "rejected") : undefined}
      />
    );
  }

  return (
    <>
      {/* Keyboard hint */}
      <p className="mb-5 font-mono text-[10px] text-muted-foreground/40">
        {currentUsername ? (
          <>
            Presiona{" "}
            <kbd className="rounded border border-border px-1 font-mono">c</kbd>{" "}
            para crear una pregunta
          </>
        ) : (
          <>
            <button
              onClick={() => router.push("/login")}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Inicia sesión
            </button>{" "}
            para crear preguntas y responder
          </>
        )}
      </p>

      {/* Moderation queue */}
      {isModerator && optimisticPending.length > 0 && (
        <section className="mb-8 rounded border border-amber-500/30 bg-amber-500/5 p-3">
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-amber-600/80">
            Pendientes de moderación ({optimisticPending.length})
          </h3>
          <div>{optimisticPending.map((q, i) => renderCard(q, i, true))}</div>
        </section>
      )}

      {optimisticItems.length === 0 ? (
        <p className="py-12 text-center font-mono text-sm text-muted-foreground">
          No hay preguntas todavía.{" "}
          <button
            onClick={openCreateSheet}
            className="underline underline-offset-4 hover:text-foreground"
          >
            ¡Sé el primero en preguntar!
          </button>
        </p>
      ) : (
        <div>{optimisticItems.map((q, index) => renderCard(q, index))}</div>
      )}

      <QuestionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        question={editTarget}
        content={editContent}
        loadingContent={loadingContent}
        onSubmit={editTarget ? handleUpdate : handleCreate}
        isPending={isPending}
      />
    </>
  );
}
