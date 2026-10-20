import { area, definePage, group, link, text } from "../fields";

/**
 * Copy on the course catalogue. Levels, courses, their counts and prices come from the
 * database, so only the labels around them are here.
 */
export const catalogPage = definePage({
  key: "catalog",
  path: "/catalog",
  label: "Course catalogue",
  group: "Pages",
  description: "The copy on /catalog. Levels, courses and prices come from the learning catalogue and are not edited here.",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Course catalogue", { max: 70 }),
      description: text("Search description", "Every released course, by learning level: Trainee, Professional and Leadership.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Catalogue", { max: 60 }),
      title: text("Title", "Start at your level.", { max: 160 }),
      lead: area("Introduction", "New to RCM, managing workflows, or leading performance? Every course below is released, reviewed, and dated.", { max: 600 }),
    }),
    search: group("Search bar", {
      searchLabel: text("Search label", "SEARCH", { max: 40 }),
      placeholder: text("Search example text", "denials, eligibility, KPI…", { max: 80, optional: true }),
      levelLabel: text("Level label", "LEVEL", { max: 40 }),
      allLevels: text("All levels option", "All levels", { max: 40 }),
      freeLabel: text("Free filter", "Free or with free previews", { max: 80 }),
      button: text("Search button", "Search", { max: 30 }),
      empty: text("Text when nothing matches", "No released courses match that. Try a broader search.", { max: 200 }),
    }),
    levels: group("Level headings", {
      levelPrefix: text("Before the level number", "LEVEL", { max: 30 }),
      assessedBy: text("Before the assessment method", "Assessed by", { max: 40 }),
    }),
    cards: group("Course cards", {
      modules: text("Modules", "MODULES", { max: 30 }),
      lessons: text("Lessons", "LESSONS", { max: 30 }),
      hours: text("Hours", "H", { max: 20 }),
      assessments: text("Assessments", "ASSESSMENTS", { max: 30 }),
      free: text("Free course", "Free", { max: 30 }),
      noPrice: text("Course without a price", "By arrangement", { max: 40 }),
      subscription: text("Included in the subscription", "or with All-access", { max: 60 }),
      previewOne: text("One free preview", "free preview", { max: 40, help: "Shown after the number of previews." }),
      previewMany: text("Several free previews", "free previews", { max: 40, help: "Shown after the number of previews." }),
      details: text("Details link text", "Details", { max: 30 }),
    }),
    disclaimer: group("Disclaimer", {
      text: area("Text", "Educational and operational content only. It does not replace legal, coding, clinical, contractual or payer-specific guidance, and contains no patient information. Every course shows the date its content took effect and when it is next reviewed. See the", { max: 800 }),
      link: link("Link", { label: "educational disclaimer", href: "/legal/disclaimer" }),
      after: text("Text after the link", ".", { max: 60, optional: true }),
    }),
  },
});
