"use client";

import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type UpvoteButtonProps = {
  initialCount: number;
  className?: string;
};

export function UpvoteButton({ initialCount, className }: UpvoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);

  function toggle() {
    setVoted((v) => !v);
    setCount((c) => (voted ? c - 1 : c + 1));
  }

  return (
    <button
      data-testid="upvote-button"
      onClick={toggle}
      aria-label={voted ? "Quitar voto" : "Votar a favor"}
      className={cn(
        "flex w-10 shrink-0 flex-col items-center gap-0.5 rounded py-1.5 transition-colors",
        "text-muted-foreground hover:text-foreground",
        voted && "text-blue-400 hover:text-blue-300",
        className,
      )}
    >
      <ChevronUp
        className={cn(
          "h-4 w-4 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
          voted && "-translate-y-0.5 scale-110",
        )}
        strokeWidth={2.5}
      />
      <span
        key={count}
        data-testid="vote-count"
        className="vote-pop font-mono text-[11px] leading-none"
      >
        {count}
      </span>
    </button>
  );
}
