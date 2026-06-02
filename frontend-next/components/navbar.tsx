import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-mono text-sm font-medium tracking-tight text-foreground transition-colors hover:text-muted-foreground"
        >
          blog4devs
        </Link>

        <Button
          variant="outline"
          size="sm"
          className="h-7 border-border px-3 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          Sign In
        </Button>
      </div>
    </header>
  );
}
