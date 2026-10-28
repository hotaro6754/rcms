import { area, definePage, group, link, text } from "../fields";

/**
 * The copy shared by every library entry page (/resources/<section>/<entry>). The entry's own
 * title, summary, body and sources are edited in the library.
 */
export const resourcesEntryPage = definePage({
  key: "resources-entry",
  path: "/resources/case-studies",
  label: "Resources: entry pages",
  group: "Pages",
  description: "The words around every library entry. The entries themselves are written and reviewed in the library; open any entry to preview these changes.",
  fields: {
    caseStudy: group("Case study notice", {
      note: area("Notice", "This case study is synthetic and de-identified. Names, figures and organisations are invented for teaching.", { max: 300, help: "Shown under every case study." }),
    }),
    review: group("Review box", {
      label: text("Heading", "Review", { max: 40 }),
      reviewed: text("Text before the review date", "Reviewed", { max: 60, help: "Shown as “Reviewed 3 March 2026”." }),
      notRecorded: text("When there is no review date", "Review date not recorded", { max: 80 }),
      nextReview: text("Text before the next review date", "Next review by", { max: 60 }),
    }),
    sources: group("Sources box", {
      label: text("Heading", "Sources", { max: 40 }),
    }),
    disclaimer: group("Disclaimer note", {
      before: text("Text before the first link", "Educational material, not payer policy or legal advice. See the", { max: 200 }),
      disclaimer: link("First link", { label: "disclaimer", href: "/legal/disclaimer" }),
      middle: text("Text between the links", ". Spotted an error?", { max: 120, optional: true }),
      contact: link("Second link", { label: "Tell us", href: "/contact" }),
      after: text("Text after the second link", ".", { max: 120, optional: true }),
    }),
  },
});
