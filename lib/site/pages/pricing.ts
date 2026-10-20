import { CORPORATE, FAQ } from "@/lib/data/catalog";
import { area, definePage, group, link, list, text, texts, toggle } from "../fields";

/**
 * Copy around the price lists. Every price, product name and product description on the
 * pricing page comes from active products (the records checkout charges), so none of them
 * are here.
 */
export const pricingPage = definePage({
  key: "pricing",
  path: "/pricing",
  label: "Pricing",
  group: "Pages",
  description: "The copy around the prices on /pricing. Prices, product names and descriptions come from the products checkout charges and are not edited here.",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Pricing", { max: 70 }),
      description: text("Search description", "All-access plans, individual courses, tracks, mentoring and corporate accounts. Prices are the ones charged at checkout.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Pricing", { max: 60 }),
      title: text("Title", "Subscribe to everything, or buy the course you need.", { max: 160 }),
      lead: area("Introduction", "Prices include the full course, its assessments and its certificate. What you see here is what checkout charges.", { max: 600 }),
    }),
    paymentsClosed: group(
      "Payments not open notice",
      {
        notice: area("Notice", "Online payment is not open yet. Use the contact form and we will enrol you directly.", { max: 300 }),
      },
      { help: "Shown only while online payment is switched off." },
    ),
    allAccess: group(
      "All-access plans",
      {
        show: toggle("Show this section", true),
        title: text("Heading", "All-access", { max: 120 }),
        lead: area("Introduction", "Every released course that is part of the subscription, including new ones as they are released.", { max: 400 }),
        perMonth: text("Monthly plan label", "per month", { max: 40 }),
        perYear: text("Yearly plan label", "per year", { max: 40 }),
        once: text("One-off plan label", "once", { max: 40 }),
        trial: text("Trial note", "{days}-day trial", { max: 60, help: "{days} is replaced with the plan's trial length." }),
        renewal: area("Renewal note", "Prepaid. It does not renew automatically; you choose whether to buy the next period.", { max: 300 }),
        button: text("Button text", "Subscribe", { max: 40, help: "The button goes to checkout for the plan." }),
        offlineButton: text("Button text while payment is closed", "Ask us", { max: 40, help: "The button goes to the contact page." }),
      },
      { help: "Shown when at least one subscription plan is on sale." },
    ),
    courses: group("Courses", {
      show: toggle("Show this section", true),
      title: text("Heading", "Courses", { max: 120 }),
      lead: area("Introduction", "Buy a single course and keep access to it.", { max: 400 }),
      empty: text("Text when no course is on sale", "No courses are on sale individually right now.", { max: 200 }),
      courseColumn: text("Course column heading", "Course", { max: 40 }),
      priceColumn: text("Price column heading", "Price", { max: 40 }),
      actionsColumn: text("Actions column heading (screen readers only)", "Actions", { max: 40 }),
      details: text("Details link text", "Details", { max: 40, help: "The link goes to the course's page." }),
    }),
    tracks: group(
      "Tracks",
      {
        show: toggle("Show this section", true),
        title: text("Heading", "Tracks", { max: 120 }),
        lead: area("Introduction", "Courses that build on each other, bought together.", { max: 400 }),
        button: text("Button text", "Buy this track", { max: 40, help: "The button goes to checkout for the track." }),
        offlineButton: text("Button text while payment is closed", "Ask us", { max: 40, help: "The button goes to the contact page." }),
      },
      { help: "Shown when at least one track is on sale." },
    ),
    mentoring: group(
      "Mentoring",
      {
        show: toggle("Show this section", true),
        title: text("Heading", "Mentoring", { max: 120 }),
        lead: area("Introduction", "Live, one to one. Requests are confirmed by email with a time that suits you.", { max: 400 }),
        sessionColumn: text("Session column heading", "Session", { max: 40 }),
        whoColumn: text("Audience column heading", "Who it is for", { max: 60 }),
        priceColumn: text("Price column heading", "Price", { max: 40 }),
        cta: link("Button", { label: "Request a session", href: "/mentoring" }),
      },
      { help: "Shown when at least one mentoring session is on sale." },
    ),
    corporate: group("Corporate", {
      show: toggle("Show this section", true),
      title: text("Heading", CORPORATE.headline, { max: 120 }),
      lead: area("Introduction", CORPORATE.body, { max: 800 }),
      includes: texts("What is included", CORPORATE.includes, { max: 200, maxItems: 12, multiline: false }),
      cardLabel: text("Card label", "Pricing", { max: 40 }),
      cardTitle: text("Card heading", "Per engagement", { max: 80 }),
      cardBody: area("Card text", "Agreed against headcount and the courses your teams need.", { max: 300 }),
      cta: link("Card button", { label: "Talk to us", href: "/contact" }),
    }),
    faq: group("Questions", {
      show: toggle("Show this section", true),
      title: text("Heading", "Questions people ask", { max: 120 }),
      items: list(
        "Questions",
        { q: text("Question", "", { max: 200 }), a: area("Answer", "", { max: 1200 }) },
        FAQ.map((f) => ({ q: f.q, a: f.a })),
        { max: 30, titleField: "q" },
      ),
    }),
  },
});
