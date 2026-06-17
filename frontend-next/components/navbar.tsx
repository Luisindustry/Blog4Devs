import Link from "next/link";
import { signOut, signOutEverywhere } from "@/app/actions";
import { CarouselLink } from "@/components/carousel-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/session";

export async function Navbar() {
  const user = await getSession();

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <CarouselLink
          href="/"
          className="font-mono text-sm font-medium tracking-tight text-foreground transition-colors hover:text-muted-foreground"
        >
          blog4devs
        </CarouselLink>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              {/* Sections */}
              <CarouselLink
                href="/mis-preguntas"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="text-foreground underline decoration-muted-foreground/50 underline-offset-[6px]"
              >
                mis preguntas
              </CarouselLink>
              <CarouselLink
                href="/mensajes"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="text-foreground underline decoration-muted-foreground/50 underline-offset-[6px]"
              >
                mensajes
              </CarouselLink>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="font-mono text-xs text-amber-600/80 transition-colors hover:text-amber-500"
                >
                  admin
                </Link>
              )}

              <span className="h-4 w-px bg-border" aria-hidden />

              {/* Identity */}
              <span className="font-mono text-xs text-foreground">
                @{user.username}
              </span>

              <span className="h-4 w-px bg-border" aria-hidden />

              {/* Account actions */}
              <form action={signOut}>
                <button
                  type="submit"
                  className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  [salir]
                </button>
              </form>
              <form action={signOutEverywhere}>
                <button
                  type="submit"
                  title="Cierra la sesión en todos tus dispositivos"
                  className="font-mono text-[10px] text-muted-foreground/50 transition-colors hover:text-foreground"
                >
                  [salir de todo]
                </button>
              </form>
              <ThemeToggle />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-7 border-border px-3 font-mono text-xs text-muted-foreground hover:text-foreground",
                )}
              >
                Sign In
              </Link>
              <ThemeToggle />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
