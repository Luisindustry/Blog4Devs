"use client";

import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleVote } from "@/app/actions";
import { cn } from "@/lib/utils";

type UpvoteButtonProps = {
  slug: string;
  initialCount: number;
  canVote: boolean;
  className?: string;
};

export function UpvoteButton({
  slug,
  initialCount,
  canVote,
  className,
}: UpvoteButtonProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!canVote) {
      toast.error("Inicia sesión para votar");
      router.push("/login");
      return;
    }

    const prevCount = count;
    const prevVoted = voted;

    // Optimistic toggle; reconcile with the authoritative server count.
    setVoted(!prevVoted);
    setCount(prevCount + (prevVoted ? -1 : 1));

    startTransition(async () => {
      try {
        const result = await toggleVote(slug);
        setCount(result.votes);
        setVoted(result.voted);
      } catch (err) {
        setCount(prevCount);
        setVoted(prevVoted);
        toast.error(err instanceof Error ? err.message : "Error al votar");
      }
    });
  }

  return (
    <button
      data-testid="upvote-button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={voted ? "Quitar voto" : "Votar a favor"}
      className={cn(
        "flex w-10 shrink-0 flex-col items-center gap-0.5 rounded py-1.5 transition-colors disabled:opacity-60",
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
