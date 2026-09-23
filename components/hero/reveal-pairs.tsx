import type { MetricId } from "@/lib/data/telemetry";

/**
 * Server-safe half of the product reveal.
 *
 * The registry and the landing slot live here rather than in ProductReveal.tsx because that
 * file is "use client": a server component importing a value across the client boundary gets
 * a module proxy, not the array. Keeping the pairing here means the homepage can read it
 * during render and the slot stays a server component.
 *
 * Hero source `[data-flip-id]` pairs with dashboard target `[data-flip-target]`. Both keys
 * are MetricId, so a pairing cannot silently drift.
 */
export const REVEAL_PAIRS: MetricId[] = ["days-in-ar", "queue-depth"];

/**
 * The slot a hero object lands in. Renders its real content unconditionally — no React state,
 * no hydration branch. The hero hides these pre-paint (inside useGSAP, which runs before first
 * paint) only when a flight is actually going to happen, and restores them on landing or on
 * unmount. With motion disabled or JavaScript off, the card is visible from the first frame.
 */
export function FlipTarget({ id, children }: { id: MetricId; children: React.ReactNode }) {
  return <div data-flip-target={id}>{children}</div>;
}
