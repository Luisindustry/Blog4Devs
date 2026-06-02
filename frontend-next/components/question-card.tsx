import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { UpvoteButton } from "@/components/upvote-button";

export type QuestionCardProps = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  author: string;
  votes: number;
  answersCount: number;
  createdAt: string;
};

export function QuestionCard({
  slug,
  title,
  tags,
  author,
  votes,
  answersCount,
  createdAt,
}: QuestionCardProps) {
  return (
    <div
      data-testid="question-card"
      className="flex items-start gap-1 border-b border-border px-1 py-4 transition-colors hover:bg-muted/20"
    >
      <UpvoteButton initialCount={votes} />

      <div className="min-w-0 flex-1 pl-1">
        <Link href={`/preguntas/${slug}`} className="group block">
          <h3 className="text-sm leading-snug text-foreground/90 transition-colors group-hover:text-foreground">
            {title}
          </h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="h-5 rounded-sm border-border px-1.5 font-mono text-[10px] text-muted-foreground"
            >
              [{tag}]
            </Badge>
          ))}

          <span className="font-mono text-[11px] text-muted-foreground/60">
            {author}
            {" · "}
            {createdAt}
            {" · "}
            {answersCount} {answersCount === 1 ? "resp." : "resp."}
          </span>
        </div>
      </div>
    </div>
  );
}
