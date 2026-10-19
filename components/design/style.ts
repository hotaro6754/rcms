import type { CSSProperties } from "react";
import type { StyleValue } from "@/lib/design/schema";

/** Turns a component's checked style settings into CSS. Empty settings leave the theme alone. */

const SIZE: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "clamp(1.25rem, 2.2vw, 1.5rem)",
  "3xl": "clamp(1.5rem, 3vw, 1.875rem)",
  "4xl": "clamp(1.75rem, 3.8vw, 2.25rem)",
  "5xl": "clamp(2rem, 5vw, 3rem)",
  "6xl": "clamp(2.25rem, 6.5vw, 3.75rem)",
};

/** Sizes on a scaled canvas, relative to the canvas width so the layout keeps its proportions. */
const CANVAS_SIZE: Record<string, number> = { xs: 1.2, sm: 1.4, base: 1.6, lg: 1.8, xl: 2, "2xl": 2.4, "3xl": 3, "4xl": 3.6, "5xl": 4.8, "6xl": 6 };

const FONT: Record<string, string> = {
  display: "var(--font-display)",
  sans: "var(--font-sans)",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono)",
};

export function css(s: Partial<StyleValue> | undefined, opts: { canvas?: boolean } = {}): CSSProperties {
  if (!s) return {};
  const out: CSSProperties = {};
  if (s.color) out.color = s.color;
  if (s.background) out.backgroundColor = s.background;
  if (s.border) out.border = `1px solid ${s.border}`;
  if (s.align) out.textAlign = s.align as CSSProperties["textAlign"];
  if (s.size) out.fontSize = opts.canvas ? `${CANVAS_SIZE[s.size] ?? 1.6}cqw` : SIZE[s.size];
  if (s.weight) out.fontWeight = Number(s.weight);
  if (s.font) out.fontFamily = FONT[s.font];
  if (s.italic) out.fontStyle = "italic";
  if (s.uppercase) {
    out.textTransform = "uppercase";
    out.letterSpacing = "0.06em";
  }
  if (s.padding) out.padding = `${s.padding}px`;
  if (s.radius) out.borderRadius = `${s.radius}px`;
  return out;
}

export { contrast } from "@/lib/design/color";
