// Horizontal "cylinder" order of the navbar pages:
//   /mensajes  ←  /  (main)  →  /mis-preguntas
export const CAROUSEL_ORDER = ["/mensajes", "/", "/mis-preguntas"] as const;

export type SwipeDirection = "left" | "right";

// Module-level state survives client-side navigations (same JS runtime).
// We key it by the target path and never clear it on read, so React Strict
// Mode's double render in dev stays consistent.
let pending: { target: string; direction: SwipeDirection } | null = null;

export function setNavDirection(from: string, to: string): void {
  const fromIndex = CAROUSEL_ORDER.indexOf(from as (typeof CAROUSEL_ORDER)[number]);
  const toIndex = CAROUSEL_ORDER.indexOf(to as (typeof CAROUSEL_ORDER)[number]);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    pending = null;
    return;
  }

  pending = { target: to, direction: toIndex > fromIndex ? "right" : "left" };
}

export function getNavDirection(pathname: string): SwipeDirection | null {
  return pending && pending.target === pathname ? pending.direction : null;
}
