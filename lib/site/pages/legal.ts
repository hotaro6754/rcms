import { area, definePage, group, list, text, texts, type PageContent } from "../fields";

/**
 * The shared shape of the legal pages: a header, a "last updated" line and numbered clauses,
 * each a heading and its paragraphs. Each legal page calls this with its own copy.
 */
export interface LegalDefaults {
  key: string;
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  lead: string;
  /** The date only; "Last updated " is put in front of it. */
  updated: string;
  clauses: { h: string; p: string[] }[];
}

export function legalPage(d: LegalDefaults) {
  return definePage({
    key: d.key,
    path: d.path,
    label: d.label,
    group: "Legal",
    legal: true,
    fields: {
      seo: group("Search and browser tab", {
        title: text("Page title", d.title, { max: 70 }),
        description: text("Search description", "", { max: 300, optional: true, help: "Leave empty to use the site's default description." }),
      }),
      header: group("Page header", {
        eyebrow: text("Label", d.eyebrow, { max: 60 }),
        title: text("Title", d.title, { max: 120 }),
        lead: area("Introduction", d.lead, { max: 400 }),
        updated: text("Last updated line", `Last updated ${d.updated}`, { max: 80 }),
      }),
      clauses: list(
        "Clauses",
        {
          heading: text("Heading", "", { max: 120 }),
          paragraphs: texts("Paragraphs", [], { max: 1200, maxItems: 12 }),
        },
        d.clauses.map((c) => ({ heading: c.h, paragraphs: c.p })),
        { min: 1, max: 30, titleField: "heading" },
      ),
    },
  });
}

export type LegalContent = PageContent<ReturnType<typeof legalPage>>;
