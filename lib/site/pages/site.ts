import { area, definePage, group, link, list, text, texts, toggle, type PageContent } from "../fields";
import { BRAND } from "@/lib/brand";

const navLink = { link: link("Link", { label: "", href: "/" }) };
const footerRow = {
  title: text("Row title", "", { max: 40, help: "Shown in capitals." }),
  links: list("Links", { link: link("Link", { label: "", href: "/" }) }, [], { max: 12 }),
  whatsapp: toggle("Add the WhatsApp link to this row", false, {
    help: "Shown only when a WhatsApp number is configured for the site.",
  }),
};

export const sitePage = definePage({
  key: "site",
  path: "/",
  label: "Navigation and footer",
  group: "Site-wide",
  description: "The bar at the top of every page and the footer at the bottom.",
  fields: {
    nav: group("Navigation bar", {
      brandShort: text("Wordmark", BRAND.markShort, { max: 40 }),
      brandName: text("Name beside the wordmark", BRAND.markRest, { max: 60 }),
      links: list(
        "Links",
        navLink,
        [
          { link: { label: "Catalogue", href: "/catalog" } },
          { link: { label: "Learning paths", href: "/learning-paths" } },
          { link: { label: `Why ${BRAND.name}`, href: "/#system" } },
          { link: { label: "Resources", href: "/resources" } },
          { link: { label: "About", href: "/about" } },
        ],
        { max: 8 },
      ),
      signIn: link("Account link for visitors", { label: "Sign in", href: "/sign-in" }),
      account: link("Account link for signed-in learners", { label: "My academy", href: "/academy" }),
      cta: link("Button", { label: "Enroll now", href: "/pricing" }),
      openMenu: text("Mobile menu button: open (read aloud)", "Open menu", { max: 40 }),
      closeMenu: text("Mobile menu button: close (read aloud)", "Close menu", { max: 40 }),
      close: text("Mobile menu close button", "Close", { max: 40 }),
    }),
    closing: group("Footer: closing statement", {
      show: toggle("Show this section", true),
      status: texts("Status line", ["CLAIM #20481", "PAID", "RECONCILED", "CLOSED"], {
        max: 40,
        maxItems: 6,
        multiline: false,
        help: "Shown separated by dots. The last entry is highlighted.",
      }),
      title: text("Heading", "The revenue cycle is complicated.", { max: 120 }),
      emphasis: text("Heading: emphasised ending", "Learning it doesn’t have to be.", { max: 120, optional: true }),
      primary: link("Main button", { label: "See the learning levels", href: "/learning-paths" }),
      secondary: link("Second link", { label: "Or talk it through, 1:1", href: "/mentoring" }),
      tertiary: link("Small link", { label: "Pricing", href: "/pricing" }),
    }),
    notes: group("Footer: monthly letter sign-up", {
      show: toggle("Show this section", true),
      eyebrow: text("Label", "FLOOR NOTES · MONTHLY", { max: 60 }),
      title: area("Text", "One letter a month: a denial pattern, a KPI, a leadership problem, and how it was worked.", { max: 240 }),
      emailLabel: text("Email field label (read aloud)", "Email address", { max: 60 }),
      placeholder: text("Email field placeholder", "you@work.com", { max: 60 }),
      button: text("Button", "SUBSCRIBE →", { max: 40 }),
      sending: text("Button while sending", "SENDING…", { max: 40 }),
      success: area("Message after signing up", "You’re on the list. The next letter comes at the start of the month.", { max: 240 }),
    }),
    live: group("Footer: live facts", {
      show: toggle("Show this section", true),
      timeLabel: text("Clock label", "IN INDIA NOW", { max: 40 }),
      timeZone: text("Clock time zone note", "IST", { max: 40 }),
      coursesLabel: text("Second fact: label", "COURSES", { max: 40 }),
      courses: text("Second fact", "Self-paced. Start any day.", { max: 120 }),
      sessionsLabel: text("Third fact: label", "SESSIONS", { max: 40 }),
      sessions: text("Third fact", "Weekday evenings and Saturday mornings, IST", { max: 120 }),
    }),
    index: group("Footer: site index", {
      rows: list(
        "Rows",
        footerRow,
        [
          {
            title: "Learn",
            whatsapp: false,
            links: [
              { link: { label: "Learning paths", href: "/learning-paths" } },
              { link: { label: "Programs", href: "/courses" } },
              { link: { label: "Pricing", href: "/pricing" } },
              { link: { label: "1:1 mentoring", href: "/mentoring" } },
              { link: { label: "Corporate accounts", href: "/pricing" } },
            ],
          },
          {
            title: "Practice",
            whatsapp: false,
            links: [
              { link: { label: "Operations console", href: "/overview" } },
              { link: { label: "Governance Room", href: "/governance" } },
              { link: { label: "Denial inventory", href: "/queues" } },
              { link: { label: "KPI library", href: "/metrics" } },
              { link: { label: "Capacity and roster", href: "/roster" } },
            ],
          },
          {
            title: "Academy",
            whatsapp: false,
            links: [
              { link: { label: "About the author", href: "/about" } },
              { link: { label: "Community", href: "/community" } },
              { link: { label: "Writing", href: "/blog" } },
            ],
          },
          {
            title: "Contact",
            whatsapp: true,
            links: [{ link: { label: "Write to us", href: "/contact" } }],
          },
          {
            title: "Legal",
            whatsapp: false,
            links: [
              { link: { label: "Privacy", href: "/legal/privacy" } },
              { link: { label: "Terms", href: "/legal/terms" } },
              { link: { label: "Refunds", href: "/legal/refund" } },
              { link: { label: "Disclaimer", href: "/legal/disclaimer" } },
              { link: { label: "Content governance", href: "/legal/content-governance" } },
            ],
          },
        ],
        { max: 10, titleField: "title" },
      ),
      whatsappLabel: text("WhatsApp link text", "WhatsApp", { max: 40 }),
    }),
    colophon: group("Footer: colophon", {
      name: text("Name", BRAND.name, { max: 80 }),
      line: text("Line under the name", "© 2026. Set in Newsreader and Satoshi.", { max: 120 }),
      disclaimer: area(
        "Disclaimer",
        "Every claim, console and review figure on this site is illustrative teaching data; no real patient, provider or payer information is used. Benchmarks referenced from HFMA MAP Keys, no affiliation. Training content does not replace payer, CMS, HIPAA, legal, compliance or employer-specific guidance.",
        { max: 800 },
      ),
      backToTop: link("Back to top link", { label: "BACK TO TOP ↑", href: "#top" }),
    }),
    wordmark: group("Footer: large wordmark", {
      show: toggle("Show this section", true),
      text: text("Wordmark", BRAND.name, { max: 12, help: "Set very large across the page; keep it to a few letters." }),
    }),
  },
});

export type SiteContent = PageContent<typeof sitePage>;
