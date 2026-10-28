import { area, definePage, group, link, text } from "../fields";

/**
 * The fixed copy shared by every course page (/catalog/<course>). Each course's name,
 * description, outcomes, curriculum, dates and price come from the course and its product;
 * only the labels and buttons around them are here.
 */
export const coursePage = definePage({
  key: "course",
  path: "/catalog",
  label: "Course pages",
  group: "Pages",
  description:
    "The labels and buttons shared by every course page under /catalog. Course names, descriptions, curricula and prices come from the course itself. Preview opens the catalogue; choose a course to see the changes.",
  fields: {
    nav: group("Navigation", {
      back: link("Back link", { label: "← Catalogue", href: "/catalog" }),
    }),
    intro: group("Course introduction", {
      levelPrefix: text("Before the level number", "LEVEL", { max: 30 }),
      noLevel: text("Label when the course has no level", "COURSE", { max: 40 }),
      forLabel: text("Before the audience", "For:", { max: 30 }),
      outcomesTitle: text("Outcomes heading", "What you will be able to do", { max: 120 }),
      curriculumTitle: text("Curriculum heading", "Curriculum", { max: 120 }),
      preview: text("Free preview lesson", "free preview", { max: 60 }),
      previewSignIn: text("Free preview lesson, signed out", "free preview (sign in)", { max: 80 }),
      minutes: text("Minutes", "min", { max: 20 }),
    }),
    buttons: group("Enrol button", {
      signUp: text("Signed out", "Create an account to enrol", { max: 60 }),
      goTo: text("Already enrolled", "Go to the course", { max: 60 }),
      enrolFree: text("Free course", "Enrol free", { max: 60 }),
      included: text("Included in the visitor's subscription", "Start — included in your subscription", { max: 80 }),
      enrolPaid: text("Paid course", "Enrol", { max: 40, help: "Followed by the price checkout charges." }),
      ask: text("When online payment is closed", "Ask about enrolling", { max: 60 }),
    }),
    facts: group("Course facts", {
      free: text("Free course price", "Free", { max: 30 }),
      included: text("Subscription note", "Also included in All-access subscriptions.", { max: 120 }),
      effort: text("Effort label", "Effort", { max: 40 }),
      hours: text("Hours", "hours", { max: 20 }),
      modules: text("Modules label", "Modules", { max: 40 }),
      lessons: text("Lessons", "lessons", { max: 30 }),
      assessment: text("Assessment label", "Assessment", { max: 40 }),
      assessedOne: text("One assessed lesson", "assessed lesson", { max: 40 }),
      assessedMany: text("Several assessed lessons", "assessed lessons", { max: 40 }),
      noAssessment: text("No assessed lessons", "Knowledge checks", { max: 60 }),
      previews: text("Free previews label", "Free previews", { max: 40 }),
      none: text("None", "None", { max: 30 }),
      prerequisites: text("Prerequisites label", "Prerequisites", { max: 40 }),
      completion: text("Completion label", "Completion", { max: 40 }),
      completionText: area("Completion text", "Every lesson complete and every assessment passed earns a verifiable certificate.", { max: 300 }),
    }),
    review: group("Review dates", {
      effective: text("Before the effective date", "Content effective", { max: 40 }),
      next: text("Before the review date", "next review", { max: 40 }),
      note: area("Note", "Educational content only; validate against current official guidance.", { max: 300 }),
    }),
  },
});
