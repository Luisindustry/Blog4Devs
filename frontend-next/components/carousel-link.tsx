"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { setNavDirection } from "@/lib/carousel-nav";

type CarouselLinkProps = {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
};

/**
 * A Link that records the swipe direction (based on the carousel page order)
 * right before navigating, so the next page can rotate in from the correct
 * side. Also marks itself as the active section when the route matches.
 */
export function CarouselLink({
  href,
  className,
  activeClassName,
  children,
}: CarouselLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClassName)}
      onClick={() => setNavDirection(pathname, href)}
    >
      {children}
    </Link>
  );
}
