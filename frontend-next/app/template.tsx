"use client";

import { usePathname } from "next/navigation";
import { getNavDirection } from "@/lib/carousel-nav";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const direction = getNavDirection(pathname);

  const className =
    direction === "right"
      ? "swipe-from-right"
      : direction === "left"
        ? "swipe-from-left"
        : "page-enter";

  return <div className={className}>{children}</div>;
}
