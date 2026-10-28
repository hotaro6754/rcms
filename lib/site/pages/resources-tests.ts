import { area, definePage, group, link, text, toggle } from "../fields";

/** The tests and assessments page. The assessment facts come from released courses; this is the copy around them. */
export const resourcesTestsPage = definePage({
  key: "resources-tests",
  path: "/resources/tests",
  label: "Tests and assessments",
  group: "Pages",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Tests and assessments", { max: 70 }),
      description: text("Search description", "What each released course assesses, how long it takes and what it takes to pass.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Resources", { max: 60 }),
      title: text("Title", "Tests and assessments", { max: 160 }),
      lead: area("Introduction", "Assessments are graded on the server against the released version of the course. Scenario questions use synthetic, de-identified data. A certificate needs every lesson complete and every assessment passed.", { max: 600 }),
    }),
    table: group(
      "Assessment tables",
      {
        course: text("Column: course", "Course · assessment", { max: 60 }),
        type: text("Column: type", "Type", { max: 40 }),
        questions: text("Column: questions", "Questions", { max: 40 }),
        passMark: text("Column: pass mark", "Pass mark", { max: 40 }),
        time: text("Column: time", "Time", { max: 40 }),
        attempts: text("Column: attempts", "Attempts", { max: 40 }),
        minutes: text("Word after a time limit", "min", { max: 40, help: "Shown as “30 min”." }),
        untimed: text("When there is no time limit", "untimed", { max: 40 }),
        unlimited: text("When attempts are unlimited", "unlimited", { max: 40 }),
        empty: text("When no course has an assessment", "No released course has an assessment yet.", { max: 160 }),
      },
      { help: "Levels, courses and assessments come from the released courses. These are the words around them." },
    ),
    kinds: group("Assessment type names", {
      knowledgeCheck: text("Knowledge check", "Knowledge check", { max: 60 }),
      moduleTest: text("Module test", "Module test", { max: 60 }),
      final: text("Final assessment", "Final assessment", { max: 60 }),
      assignment: text("Assignment", "Assignment", { max: 60 }),
    }),
    footer: group("Closing note", {
      show: toggle("Show this note", true),
      before: text("Text before the link", "Worked examples:", { max: 120 }),
      link: link("Link", { label: "case studies", href: "/resources/case-studies" }),
      after: text("Text after the link", ".", { max: 120, optional: true }),
    }),
  },
});
