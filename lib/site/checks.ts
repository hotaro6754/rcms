import { contrast } from "@/lib/design/color";

/**
 * Extra rules for particular pages, applied when saving and publishing (server side; page
 * definitions themselves stay plain data so they can be sent to the editor).
 */
export const PAGE_CHECKS: Record<string, (value: Record<string, unknown>) => string | null> = {
  theme(v) {
    const c = (v.colours ?? {}) as Record<string, string>;
    const pairs: [string, string, string][] = [
      ["Main text", "Page background", `${c.foreground}|${c.background}`],
      ["Main text", "Cards and panels", `${c.foreground}|${c.card}`],
      ["Secondary text", "Cards and panels", `${c.muted}|${c.card}`],
      ["Button text", "Buttons", `${c.primaryText}|${c.primary}`],
      ["Accent", "Cards and panels", `${c.brand}|${c.card}`],
    ];
    for (const [a, b, pair] of pairs) {
      const [x, y] = pair.split("|");
      if (!x || !y) continue;
      const r = contrast(x, y);
      if (r < 4.5) return `${a} on ${b} has a contrast of ${r.toFixed(1)}:1. It needs at least 4.5:1 so everyone can read it.`;
    }
    return null;
  },
};
