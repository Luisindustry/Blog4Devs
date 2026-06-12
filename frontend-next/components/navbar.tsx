import Link from "next/link";
import { signOut } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function Navbar() {
  const user = await getSession();

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-mono text-sm font-medium tracking-tight text-foreground transition-colors hover:text-muted-foreground"
        >
          blog4devs
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/mis-preguntas"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                mis preguntas
              </Link>
              <Link
                href="/mensajes"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                mensajes
              </Link>
              <span className="font-mono text-xs text-foreground">
                @{user.username}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  [salir]
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 border-border px-3 font-mono text-xs text-muted-foreground hover:text-foreground",
              )}
            >
              Sign In
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
