import { contrast } from "@/lib/design/color";
import { choice, color, defaultsOf, group, toggle, type PageDef } from "./fields";
import { themePage } from "./pages/theme";

/**
 * Text and heading sizes for the public site, and the per-page style every editable page
 * carries: its own background, text and accent colours and sizes, used instead of the site
 * theme when switched on. Sizes are a fixed set of percentages and colours are checked hex
 * values, so nothing but those can reach the CSS.
 *
 * Pure module: safe for client components.
 */

const TEXT_SIZES = (themePage.fields.sizes.fields.text.options).map((o) => ({ value: o.value, label: o.label.replace(" (current)", "") }));
const HEADING_SIZES = (themePage.fields.sizes.fields.headings.options).map((o) => ({ value: o.value, label: o.label.replace(" (current)", "") }));

const SAME = { value: "site", label: "Same as the site theme" } as const;
const theme = defaultsOf(themePage.fields).colours;

export const pageStyleField = group(
  "Page style: colours and sizes",
  {
    custom: toggle("Give this page its own style", false, { help: "Off: the page follows the site theme. On: the colours and sizes below apply to this page only." }),
    background: color("Page background", theme.background),
    text: color("Main text", theme.foreground),
    accent: color("Accent (links, highlights)", theme.brand),
    textSize: choice("Text size", [SAME, ...TEXT_SIZES], "site"),
    headingSize: choice("Heading size", [SAME, ...HEADING_SIZES], "site"),
  },
  { help: "Text must stay readable: saving is refused if the main text or accent has less than 4.5:1 contrast with the page background." },
);

export type PageStyle = { custom: boolean; background: string; text: string; accent: string; textSize: string; headingSize: string };

/** The page definition with the per-page style section added (theme and navigation pages have none). */
export function withPageStyle(def: PageDef): PageDef {
  if (def.key === "theme" || def.key === "site") return def;
  return { ...def, fields: { ...def.fields, pageStyle: pageStyleField } };
}

/** Refuses unreadable per-page colours. Null when the page style is off or readable. */
export function checkPageStyle(value: Record<string, unknown>): string | null {
  const s = value.pageStyle as PageStyle | undefined;
  if (!s?.custom) return null;
  for (const [label, c] of [
    ["Main text", s.text],
    ["Accent", s.accent],
  ] as const) {
    const r = contrast(c, s.background);
    if (r < 4.5) return `Page style: ${label} on the page background has a contrast of ${r.toFixed(1)}:1. It needs at least 4.5:1 so everyone can read it.`;
  }
  return null;
}

/**
 * The size rules for a scope: the page content is scaled to the text size, and headings to
 * the heading size (relative to the text size they already sit in).
 */
export function sizeCss(scope: string, textSize: string, headingSize: string) {
  const t = Number(textSize) / 100;
  const h = Number(headingSize) / 100;
  if (!(t > 0) || !(h > 0)) return "";
  const out: string[] = [];
  out.push(`${scope} main.editorial{zoom:${t}}`);
  out.push(`${scope} main.editorial :is(h1,h2,h3){zoom:${+(h / t).toFixed(4)}}`);
  return out.join("");
}
