"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  QUESTION_CONTENT_MIN as CONTENT_MIN,
  QUESTION_TAGS_MAX as TAGS_MAX,
  QUESTION_TITLE_MIN as TITLE_MIN,
} from "@/lib/validation";
import type { QuestionFormData } from "@/app/actions";
import type { QuestionSummary } from "@/types/api";

type QuestionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: QuestionSummary | null;
  content: string;
  loadingContent: boolean;
  onSubmit: (data: QuestionFormData) => void;
  isPending: boolean;
};

export function QuestionSheet({
  open,
  onOpenChange,
  question,
  content,
  loadingContent,
  onSubmit,
  isPending,
}: QuestionSheetProps) {
  const isEdit = question !== null;

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");

  const titleRef = useRef<HTMLInputElement>(null);

  // Reset form when switching between create / edit
  useEffect(() => {
    if (isEdit && question) {
      setTitle(question.title);
      setTags(question.tags.join(", "));
    } else {
      setTitle("");
      setTags("");
      setBody("");
    }
  }, [question, isEdit]);

  // Populate body when full content arrives for edit
  useEffect(() => {
    if (isEdit) setBody(content);
  }, [content, isEdit]);

  // Focus title when sheet opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => titleRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  function handleSubmit() {
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (trimmedTitle.length < TITLE_MIN) {
      toast.error(`El título necesita al menos ${TITLE_MIN} caracteres`);
      titleRef.current?.focus();
      return;
    }
    if (trimmedBody.length < CONTENT_MIN) {
      toast.error(`El contenido necesita al menos ${CONTENT_MIN} caracteres`);
      return;
    }
    if (parsedTags.length === 0) {
      toast.error("Agrega al menos un tag");
      return;
    }
    if (parsedTags.length > TAGS_MAX) {
      toast.error(`Máximo ${TAGS_MAX} tags`);
      return;
    }

    onSubmit({
      title: trimmedTitle,
      content: trimmedBody,
      tags: parsedTags,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[520px] max-w-full flex-col border-l border-border bg-background p-6 duration-400 [transition-timing-function:var(--ease-out-expo)]"
        onKeyDown={handleKeyDown}
      >
        <SheetHeader className="mb-5">
          <SheetTitle className="font-mono text-xs text-muted-foreground">
            {isEdit ? "// editar pregunta" : "// nueva pregunta"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
          {/* Título */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                título
              </label>
              <span
                className={cn(
                  "font-mono text-[10px]",
                  trimmedTitle.length >= TITLE_MIN
                    ? "text-muted-foreground/40"
                    : "text-amber-500/80",
                )}
              >
                {trimmedTitle.length}/{TITLE_MIN} mín
              </span>
            </div>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Cuál es tu pregunta técnica?"
              className="w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              tags
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="python, fastapi, async"
              className="w-full border-0 border-b border-border bg-transparent py-2 font-mono text-xs text-muted-foreground placeholder:text-muted-foreground/30 focus:border-ring focus:outline-none"
            />
          </div>

          {/* Contenido */}
          <div className="flex flex-1 flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                contenido
                {loadingContent && (
                  <span className="ml-2 text-muted-foreground/40">(cargando...)</span>
                )}
              </label>
              <span
                className={cn(
                  "font-mono text-[10px]",
                  trimmedBody.length >= CONTENT_MIN
                    ? "text-muted-foreground/40"
                    : "text-amber-500/80",
                )}
              >
                {trimmedBody.length}/{CONTENT_MIN} mín
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={loadingContent}
              placeholder={"Describe tu pregunta en detalle.\nSoporta Markdown."}
              className="min-h-[240px] flex-1 resize-none rounded border border-border bg-transparent p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-ring focus:outline-none disabled:opacity-40"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground/40">⌘ Enter</span>
              <button
                onClick={handleSubmit}
                disabled={isPending || loadingContent}
                className="border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
              >
                {isPending ? "[publicando...]" : isEdit ? "[guardar]" : "[publicar]"}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
