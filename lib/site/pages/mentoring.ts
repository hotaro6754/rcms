import { area, definePage, group, link, list, text, texts, toggle } from "../fields";

/**
 * Copy on the mentoring page. The sessions offered, their names and prices come from the
 * active mentoring products (what checkout charges), so they are not here.
 */
export const mentoringPage = definePage({
  key: "mentoring",
  path: "/mentoring",
  label: "Mentoring",
  group: "Pages",
  description: "The copy on /mentoring. The sessions, their names and prices come from the mentoring products and are not edited here.",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Mentoring", { max: 70 }),
      description: text("Search description", "Working sessions on a real problem from your floor. You leave with a decision and a document, not advice.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Mentoring", { max: 60 }),
      title: text("Title", "Bring a real problem from your floor.", { max: 160 }),
      lead: area("Introduction", "Sessions are working sessions on a problem you are facing at work, described without any patient or client identifiers. You leave with a decision and a document.", { max: 600 }),
    }),
    steps: group("How it works", {
      items: list(
        "Steps",
        { title: text("Step", "", { max: 80 }), body: area("Description", "", { max: 500 }) },
        [
          { title: "Choose the problem", body: "Career move, KPI defence, team escalation, client governance, or interview preparation for a specific role." },
          { title: "Send a de-identified summary", body: "Trend figures, a QA scorecard outline or the job description you are targeting, with every patient, payer and client identifier removed. Reviewed before the call so no time goes on context." },
          { title: "Agree a time", body: "Send a request with the times that suit you; sessions run on IST evenings and Saturday mornings to fit US-shift schedules. We confirm by email." },
          { title: "Leave with the document", body: "A root cause sheet, a capacity model, a governance deck outline or a rewritten CV, whichever the problem called for." },
        ],
        { max: 12, titleField: "title", help: "Numbered in order on the page." },
      ),
    }),
    notFor: group("What this is not for", {
      show: toggle("Show this section", true),
      title: text("Heading", "What this is not for", { max: 120 }),
      items: texts(
        "Items",
        ["Generic career advice you could get from a search", "Reviewing your CV without a role you are targeting", "Anything requiring real patient data on the screen", "Coding certification preparation"],
        { max: 200, maxItems: 12, multiline: false },
      ),
      note: area("Privacy note", "Anonymise anything you send. No PHI, no real patient identifiers, no client documents you are not authorised to share.", { max: 400 }),
    }),
    booking: group("Session request panel", {
      legend: text("Heading", "Choose a session", { max: 60 }),
      note: area("Note beside the button", "Send the request with the times that suit you (IST). We reply by email to confirm a slot. Nothing is charged until a time is agreed.", { max: 300 }),
      button: text("Button text", "Request this session", { max: 40, help: "The button opens the contact form with the chosen session filled in." }),
      closed: text("Text when no session is on sale", "Mentoring is not open for requests right now.", { max: 200 }),
      closedLink: link("Link when no session is on sale", { label: "Contact us", href: "/contact" }),
      closedAfter: text("Text after that link", "instead.", { max: 60, optional: true }),
    }),
    closing: group("Closing call to action", {
      show: toggle("Show this section", true),
      title: text("Heading", "Not sure a session is the right spend?", { max: 120 }),
      body: area("Text", "Ask us first. If the answer takes two minutes, you will get it in two minutes and no session gets booked.", { max: 400 }),
      whatsapp: text("WhatsApp button text", "Ask on WhatsApp", { max: 40, help: "Shown instead of the question button when a WhatsApp number is configured." }),
      question: link("Question button", { label: "Ask a question", href: "/contact" }, { help: "Shown when no WhatsApp number is configured." }),
      pricing: link("Second button", { label: "See all pricing", href: "/pricing" }),
    }),
  },
});
