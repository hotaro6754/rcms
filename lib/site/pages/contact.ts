import { area, definePage, group, text, toggle } from "../fields";

/**
 * Copy on the contact page and its form. The form's field names, validation and the options
 * it sends ("Corporate account", "Something else", product names) are fixed; only what the
 * visitor reads is here. Course and mentoring options and their prices come from products.
 */
export const contactPage = definePage({
  key: "contact",
  path: "/contact",
  label: "Contact",
  group: "Pages",
  description: "The copy on /contact and its form. Course and mentoring options and their prices come from products and are not edited here.",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Contact", { max: 70 }),
      description: text("Search description", "Enrol, request mentoring, or ask about a corporate account.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Contact", { max: 60 }),
      title: text("Title", "Tell me what you are trying to move.", { max: 160 }),
      lead: area("Introduction", "Enrolment, mentoring and corporate accounts all start the same way: what level you are at now, and what you want to be doing in twelve months.", { max: 600 }),
    }),
    form: group("Contact form", {
      nameLabel: text("Name label", "Name", { max: 40 }),
      emailLabel: text("Email label", "Email", { max: 40 }),
      roleLabel: text("Role label", "Current role", { max: 40 }),
      rolePlaceholder: text("Role example text", "AR analyst, team lead, manager…", { max: 80, optional: true }),
      interestLabel: text("Interest label", "Interested in", { max: 40 }),
      interestPrompt: text("Interest prompt", "Choose one", { max: 40 }),
      coursesGroup: text("Courses option group", "Courses", { max: 40 }),
      mentoringGroup: text("Mentoring option group", "Mentoring", { max: 40 }),
      corporateOption: text("Corporate option", "Corporate account", { max: 60, help: "The text shown. Enquiries are still recorded as “Corporate account”." }),
      otherOption: text("Other option", "Something else", { max: 60, help: "The text shown. Enquiries are still recorded as “Something else”." }),
      messageLabel: text("Message label", "What are you trying to move?", { max: 80 }),
      messagePlaceholder: text("Message example text", "The metric, the role, or the problem on your floor.", { max: 120, optional: true }),
      privacy: area("Privacy note", "Never send PHI, real patient identifiers or client documents you are not authorised to share. Anonymise anything operational before it leaves your building.", { max: 400 }),
      submit: text("Send button", "Send", { max: 30 }),
      successTitle: text("Sent: heading", "That is with me", { max: 80 }),
      successBody: area("Sent: text", "You will get a reply within one working day, IST.", { max: 300 }),
      again: text("Sent: send another", "Send another", { max: 40 }),
    }),
    whatsapp: group(
      "WhatsApp card",
      {
        show: toggle("Show this section", true),
        title: text("Heading", "Faster on WhatsApp", { max: 80 }),
        body: area("Text", "For a quick question about fit or level. Enrolment and invoices go through email. Never send patient information.", { max: 400 }),
        button: text("Button text", "Open WhatsApp", { max: 40 }),
      },
      { help: "Shown only when a WhatsApp number is configured." },
    ),
    corporate: group("Corporate accounts card", {
      show: toggle("Show this section", true),
      title: text("Heading", "Corporate accounts", { max: 80 }),
      body: area("Text", "Ten or more people get a corporate account with seats, groups and a manager view. Choose “Corporate account” and include headcount and specialty.", { max: 400 }),
    }),
    response: group("Response time card", {
      show: toggle("Show this section", true),
      title: text("Heading", "Response time", { max: 80 }),
      body: area("Text", "Weekdays, within one working day, IST. Mentoring requests are confirmed by email with an agreed time.", { max: 400 }),
    }),
  },
});
