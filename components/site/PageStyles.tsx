import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getPageContent, previewingDrafts } from "@/lib/site/content";
import { resolvePage, type PageDef } from "@/lib/site/fields";
import { BUILT_IN_PAGES } from "@/lib/site/registry";
import { customPage } from "@/lib/site/pages/custom";
import { themePage } from "@/lib/site/pages/theme";
import { sizeCss, type PageStyle } from "@/lib/site/style";

/**
 * The site-wide text sizes and each page's own style, as CSS scoped to the page's address
 * (SiteScope marks the current address on the page). Only pages whose style is switched on
 * produce rules; values are checked colours and fixed percentages, so nothing else reaches
 * the CSS.
 */

/** The address a page's style applies to: its own path, or every course page for the course template. */
function scopeFor(def: PageDef) {
  if (def.key === "course") return `.site-scope[data-site-path^="/catalog/"]`;
  return `.site-scope[data-site-path="${def.path.replace(/["\\]/g, "")}"]`;
}

const customRows = unstable_cache(
  () => prisma.sitePage.findMany({ where: { custom: true, archivedAt: null }, select: { key: true, slug: true, title: true, published: true } }),
  ["site-custom-styles"],
  { tags: ["site"], revalidate: 3600 },
);

async function customStyles(preview: boolean) {
  const rows = preview
    ? await prisma.sitePage.findMany({ where: { custom: true, archivedAt: null }, select: { key: true, slug: true, title: true, published: true, draft: true } })
    : await customRows();
  return rows
    .filter((r) => r.slug)
    .map((r) => {
      const def = customPage(r.key, r.slug!, r.title ?? "");
      const stored = preview ? ((r as { draft?: unknown }).draft ?? r.published) : r.published;
      return { def: def as PageDef, style: (resolvePage(def.fields, stored) as { pageStyle: PageStyle }).pageStyle };
    });
}

/**
 * A page's colours as theme variables. Panels, lines and secondary text are mixed from the
 * page's background and text, so they stay in the same family (and readable) on any background.
 */
function paletteFor(s: PageStyle) {
  const mix = (pct: number) => `color-mix(in srgb, ${s.text} ${pct}%, ${s.background})`;
  return [
    `--background:${s.background}`,
    `--foreground:${s.text}`,
    `--card:${mix(4)}`,
    `--card-foreground:${s.text}`,
    `--popover:${mix(4)}`,
    `--popover-foreground:${s.text}`,
    `--paper:${mix(4)}`,
    `--muted:${mix(7)}`,
    `--secondary:${mix(7)}`,
    `--secondary-foreground:${s.text}`,
    `--accent-foreground:${s.text}`,
    `--muted-foreground:${mix(75)}`,
    `--subtle:${mix(62)}`,
    `--border:${mix(18)}`,
    `--input:${mix(22)}`,
    `--brand:${s.accent}`,
    `--ring:${s.accent}`,
  ].join(";");
}

export async function PageStyles() {
  try {
    const theme = await getPageContent(themePage);
    const site = { text: theme.sizes.text, headings: theme.sizes.headings };
    const rules: string[] = [];
    if (site.text !== "100" || site.headings !== "100") rules.push(sizeCss(".site-scope", site.text, site.headings));

    const builtIn = await Promise.all(
      BUILT_IN_PAGES.filter((d) => "pageStyle" in d.fields).map(async (def) => ({ def, style: ((await getPageContent(def)) as { pageStyle: PageStyle }).pageStyle })),
    );
    const pages = [...builtIn, ...(await customStyles(await previewingDrafts()))];

    for (const { def, style } of pages) {
      if (!style?.custom) continue;
      const scope = scopeFor(def);
      rules.push(`${scope}{${paletteFor(style)}}`);
      const t = style.textSize === "site" ? site.text : style.textSize;
      const h = style.headingSize === "site" ? site.headings : style.headingSize;
      if (t !== site.text || h !== site.headings) rules.push(sizeCss(scope, t, h));
    }
    if (!rules.length) return null;
    return <style>{rules.join("")}</style>;
  } catch (error) {
    console.error("[site] page styles unavailable; showing the theme", error);
    return null;
  }
}
