"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="inline-block size-7" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  function handleToggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next = isDark ? "light" : "dark";
    const doc = document as DocumentWithViewTransition;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Circular reveal from the click point (Chromium); plain switch elsewhere
    if (!doc.startViewTransition || reducedMotion) {
      setTheme(next);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 550,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="group flex size-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors duration-300 hover:text-foreground"
    >
      {isDark ? (
        <SunIcon className="size-3.5 transition-transform duration-500 group-hover:rotate-45" />
      ) : (
        <MoonIcon className="size-3.5 transition-transform duration-500 group-hover:-rotate-12" />
      )}
    </button>
  );
}
