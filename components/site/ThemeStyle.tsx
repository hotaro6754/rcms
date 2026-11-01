import { getPageContent } from "@/lib/site/content";
import { defaultsOf } from "@/lib/site/fields";
import { themePage } from "@/lib/site/pages/theme";

/**
 * The theme edits from the website editor, as CSS variables over app/globals.css. Only
 * values that differ from the shipped theme are written. Every value was checked to be a hex
 * colour or one of a fixed set of fonts and corner styles, so nothing else can reach the CSS.
 */
const FONTS: Record<string, string> = {
  display: '"Cabinet Grotesk", "Helvetica Neue", Arial, sans-serif',
  sans: '"Satoshi", "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};
const RADIUS: Record<string, string> = { square: "0.25rem", soft: "0.6rem", round: "1rem" };

export async function ThemeStyle() {
  const t = await getPageContent(themePage);
  const d = defaultsOf(themePage.fields);
  const vars: string[] = [];
  const c = t.colours;
  const dc = d.colours;
  const set = (name: string, value: string, base: string) => value !== base && vars.push(`${name}:${value}`);
  set("--background", c.background, dc.background);
  set("--foreground", c.foreground, dc.foreground);
  set("--card-foreground", c.foreground, dc.foreground);
  set("--card", c.card, dc.card);
  set("--popover", c.card, dc.card);
  set("--muted-foreground", c.muted, dc.muted);
  set("--primary", c.primary, dc.primary);
  if (c.primary !== dc.primary) vars.push(`--primary-hover:color-mix(in srgb, ${c.primary} 85%, #ffffff)`);
  set("--primary-foreground", c.primaryText, dc.primaryText);
  set("--brand", c.brand, dc.brand);
  set("--ring", c.brand, dc.brand);
  set("--border", c.border, dc.border);
  if (t.type.headings !== d.type.headings) vars.push(`--font-display:${FONTS[t.type.headings]}`, `--font-heading:${FONTS[t.type.headings]}`);
  if (t.type.body !== d.type.body) vars.push(`--font-sans:${FONTS[t.type.body]}`);
  if (t.shape.corners !== d.shape.corners) vars.push(`--radius:${RADIUS[t.shape.corners]}`);
  if (!vars.length) return null;
  return <style>{`:root,.site-scope{${vars.join(";")}}`}</style>;
}
