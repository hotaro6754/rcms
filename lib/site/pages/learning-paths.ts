import { area, definePage, group, link, text, toggle } from "../fields";

/** The learning paths page. The levels and their courses come from the course catalogue; this is the copy around them. */
export const learningPathsPage = definePage({
  key: "learning-paths",
  path: "/learning-paths",
  label: "Learning paths",
  group: "Pages",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Learning paths", { max: 70 }),
      description: text("Search description", "Trainee, Professional and Leadership: three levels from your first revenue cycle role to running operations.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Learning paths", { max: 60 }),
      title: text("Title", "Start at the level you work at today.", { max: 160 }),
      lead: area("Introduction", "Each level is defined by the work you can do at the end of it. Courses are released only after academic and compliance review, and every assessment uses synthetic, de-identified examples.", { max: 600 }),
    }),
    levels: group(
      "Levels",
      {
        empty: text("When no level is published", "No levels are published yet.", { max: 120 }),
        levelLabel: text("Level number label", "LEVEL", { max: 40, help: "Shown before each level’s number, e.g. “LEVEL 1”." }),
        effortLabel: text("Effort label", "Typical effort:", { max: 60, help: "Shown before the level’s estimated effort." }),
        topicsLabel: text("Core topics heading", "Core topics", { max: 60 }),
        outcomesLabel: text("Outcomes heading", "You leave able to", { max: 60 }),
        coursesLabel: text("Courses heading", "Released courses", { max: 60 }),
        noCourses: text("When a level has no released course", "Courses for this level are in review and not yet released.", { max: 160 }),
        free: text("Free course tag", "free", { max: 40 }),
        allAccess: text("All-access course tag", "all-access", { max: 40, help: "Shown on a course that has no price of its own." }),
      },
      { help: "Levels, topics and courses are edited in the course catalogue. These are the words around them." },
    ),
    closing: group("Closing call to action", {
      show: toggle("Show this section", true),
      title: text("Heading", "Not sure which level you are on?", { max: 120 }),
      body: area("Text", "Open a course and read its free preview lessons, or ask us. The Governance Room is a worked example of the Leadership level.", { max: 400 }),
      primary: link("Main button", { label: "Browse the catalogue", href: "/catalog" }),
      secondary: link("Second button", { label: "See pricing", href: "/pricing" }),
    }),
  },
});
