import type { LibraryKind } from "@prisma/client";
import { SECTIONS } from "@/lib/library-sections";
import { area, definePage, group, link, text, toggle } from "../fields";

const sectionFields = (kind: LibraryKind) => {
  const s = SECTIONS.find((x) => x.kind === kind)!;
  return group(s.title, {
    title: text("Name", s.title, { max: 80 }),
    lead: area("Introduction", s.lead, { max: 300 }),
  });
};

/**
 * The resources landing page. Also holds the name and introduction of each library section,
 * which the section pages and entry pages use too. The entries themselves are edited in the library.
 */
export const resourcesPage = definePage({
  key: "resources",
  path: "/resources",
  label: "Resources",
  group: "Pages",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Resources", { max: 70 }),
      description: text("Search description", "Glossary, RCM process library, case studies, leadership toolkit and practice tests. Reviewed, dated, synthetic examples only.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Resources", { max: 60 }),
      title: text("Title", "Reference you can trust.", { max: 160 }),
      lead: area("Introduction", "Every entry is reviewed by someone other than its author, dated, and lists the sources it relies on. Examples are synthetic: no real patient, provider or payer data.", { max: 600 }),
    }),
    search: group("Search", {
      placeholder: text("Search box hint", "Search terms, processes and case studies", { max: 100 }),
      button: text("Search button", "Search", { max: 40 }),
      resultOne: text("Word after one result", "result", { max: 40, help: "Shown as “1 result”." }),
      resultMany: text("Word after several results", "results", { max: 40, help: "Shown as “3 results”." }),
    }),
    sections: group(
      "Library sections",
      {
        entriesLabel: text("Word after the entry count", "entries", { max: 40, help: "Shown on each section card, e.g. “12 entries”." }),
        GLOSSARY: sectionFields("GLOSSARY"),
        PROCESS: sectionFields("PROCESS"),
        CASE_STUDY: sectionFields("CASE_STUDY"),
        TOOLKIT: sectionFields("TOOLKIT"),
        RESOURCE: sectionFields("RESOURCE"),
      },
      { help: "Each section’s name and introduction appear on this page, at the top of the section’s own page and on its entries." },
    ),
    tests: group("Tests card", {
      show: toggle("Show this card", true),
      link: link("Card title and link", { label: "Tests and assessments", href: "/resources/tests" }),
      body: area("Text", "What each course assesses, how long it takes and what it takes to pass.", { max: 300 }),
    }),
    governance: group("Review policy note", {
      show: toggle("Show this note", true),
      before: text("Text before the link", "How content is reviewed:", { max: 120 }),
      link: link("Link", { label: "content review and governance policy", href: "/legal/content-governance" }),
      after: text("Text after the link", ".", { max: 120, optional: true }),
    }),
  },
});
