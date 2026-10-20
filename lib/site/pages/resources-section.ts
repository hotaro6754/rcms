import { definePage, group, link, text } from "../fields";

/**
 * The copy shared by every library section page (/resources/glossary, /resources/processes and so on).
 * Each section's name and introduction are edited on the Resources page; the entries in the library.
 */
export const resourcesSectionPage = definePage({
  key: "resources-section",
  path: "/resources/glossary",
  label: "Resources: section pages",
  group: "Pages",
  description: "The words shared by every library section page, such as the glossary and the case studies. Each section’s name and introduction are edited on the Resources page, and the entries in the library.",
  fields: {
    header: group("Page header", {
      eyebrow: text("Label", "Resources", { max: 60 }),
    }),
    search: group("Search", {
      placeholder: text("Search box hint", "Search", { max: 60, help: "Shown before the section’s name, e.g. “Search glossary”." }),
      button: text("Search button", "Search", { max: 40 }),
      back: link("Link back to all resources", { label: "All resources", href: "/resources" }),
    }),
    empty: group("When nothing is listed", {
      noMatches: text("When a search finds nothing", "Nothing matches that search.", { max: 160 }),
      noEntries: text("When a section has no entries yet", "Entries are being written and reviewed. Check back soon.", { max: 160 }),
    }),
  },
});
