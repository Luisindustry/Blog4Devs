"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { UpvoteButton } from "@/components/upvote-button";

import type { QuestionStatus } from "@/types/api";

export type QuestionCardProps = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  author: string;
  votes: number;
  answersCount: number;
  createdAt: string;
  status?: QuestionStatus;
  index?: number;
  canVote?: boolean;
  isPendingDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [state, setState] = useState<"idle" | "confirming">("idle");

  function handleClick() {
    if (state === "idle") {
      setState("confirming");
      setTimeout(() => setState("idle"), 3000);
    } else {
      setState("idle");
      onDelete();
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`font-mono text-[10px] transition-colors ${
        state === "confirming"
          ? "rounded border border-red-900 px-1 py-0.5 text-red-700"
          : "text-muted-foreground hover:text-red-600"
      }`}
    >
      {state === "confirming" ? "[confirmar borrado?]" : "[delete]"}
    </button>
  );
}

export function QuestionCard({
  slug,
  title,
  tags,
  author,
  votes,
  answersCount,
  createdAt,
  index = 0,
  canVote = false,
  isPendingDelete,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: QuestionCardProps) {
  return (
    <div
      data-testid="question-card"
      style={{ "--stagger": index } as React.CSSProperties}
      className="feed-item group flex items-start gap-1 border-b border-border px-1 py-4 transition-colors duration-300 hover:bg-muted/20"
    >
      <UpvoteButton slug={slug} initialCount={votes} canVote={canVote} />

      <div className="min-w-0 flex-1 pl-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/preguntas/${slug}`} className="group/link min-w-0 flex-1">
            <h3
              className={`text-sm leading-snug transition-colors group-hover/link:text-foreground ${
                isPendingDelete
                  ? "text-muted-foreground/30 line-through"
                  : "text-foreground/90"
              }`}
            >
              {title}
            </h3>
          </Link>

          {(onEdit || onDelete || onApprove || onReject) && (
            <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              {onApprove && (
                <button
                  onClick={onApprove}
                  className="font-mono text-[10px] text-emerald-600 hover:text-emerald-500"
                >
                  [aprobar]
                </button>
              )}
              {onReject && (
                <button
                  onClick={onReject}
                  className="font-mono text-[10px] text-red-600 hover:text-red-500"
                >
                  [rechazar]
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  [edit]
                </button>
              )}
              {onDelete && <DeleteButton onDelete={onDelete} />}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
              <Badge
                variant="outline"
                className="h-5 cursor-pointer rounded-sm border-border px-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              >
                [{tag}]
              </Badge>
            </Link>
          ))}
          <span className="font-mono text-[11px] text-muted-foreground/60">
            {author}
            {" · "}
            {createdAt}
            {" · "}
            {answersCount} resp.
          </span>
        </div>
      </div>
    </div>
  );
}
