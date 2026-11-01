import { area, definePage, group, link, list, text, texts, toggle, type PageContent } from "../fields";
import { BRAND } from "@/lib/brand";

const navLink = { link: link("Link", { label: "", href: "/" }) };

type MenuItem = { group: string; link: { label: string; href: string }; description: string };
const item = (group: string, label: string, href: string, description: string): MenuItem => ({ group, link: { label, href }, description });

/** The menus' items: a column heading (optional), the link, and one line under it. */
const menuItem = {
  group: text("Column heading", "", { max: 40, optional: true, help: "Items with the same heading are listed together." }),
  link: link("Link", { label: "", href: "/" }),
  description: text("Line under the link", "", { max: 120, optional: true }),
};

/**
 * The top bar's menus. Every default points at a page or section that exists today; nothing
 * here describes an offering the site does not have. A menu with no items is a plain link.
 */
const MENUS = [
  {
    label: "Learning",
    overview: { label: "Compare the levels", href: "/learning-paths" },
    intro: "Three levels, each built on the one before. Start where you actually work today; every course ends with assessed work you can show.",
    items: [
      item("Learning levels", "Trainee — Foundation", "/catalog?level=trainee", "Your first revenue cycle role"),
      item("Learning levels", "Professional — Execution", "/catalog?level=professional", "Working the claim on the floor"),
      item("Learning levels", "Leadership — Governance", "/catalog?level=leadership", "Running the operation"),
      item("Programs", "Course catalogue", "/catalog", "Every released course and its price"),
      item("Programs", "Learning paths", "/learning-paths", "The levels side by side"),
      item("Programs", "Practice tests", "/resources/tests", "Check yourself against a level"),
    ],
  },
  {
    label: "Practice",
    overview: { label: "How the claim is taught", href: "/#system" },
    intro: "You learn it the way it is worked: one claim, every stage it passes through, and every decision that can stop it.",
    items: [
      item("On this site", "Claim #20481 walkthrough", "/#top", "One claim, filled in stage by stage"),
      item("On this site", "The ten revenue-cycle stages", "/#system", "Front end, middle and back end"),
      item("On this site", "Denial investigation", "/#lab", "Root cause analysis, five whys"),
      item("On this site", "Monthly operating review", "/#governance", "The month's measures, explained upward"),
      item("On this site", "Career progression", "/#people", "Six levels, and the number each one owns"),
      item("Operations console", "Operations console", "/overview", "A worked example practice"),
      item("Operations console", "Governance Room", "/governance", "The full seven-stage review"),
      item("Operations console", "Denial inventory", "/queues", "Denials by reason and owner"),
      item("Operations console", "KPI library", "/metrics", "What each measure means"),
      item("Operations console", "Capacity and roster", "/roster", "Who is working what"),
    ],
  },
  {
    label: "Mentoring",
    overview: { label: "All mentoring sessions", href: "/mentoring" },
    intro: "One-to-one sessions, chosen by the length of the problem. Send a request and we confirm a time by email.",
    items: [
      item("Sessions", "Career consultation", "/mentoring#career", "30 minutes, one-to-one"),
      item("Sessions", "Professional guidance", "/mentoring#professional", "45 minutes, one-to-one"),
      item("Sessions", "Leadership mentoring", "/mentoring#leadership", "60 minutes, one-to-one"),
      item("Sessions", "Executive career roadmap", "/mentoring#roadmap", "90 minutes, one-to-one"),
    ],
  },
  {
    label: "Resources",
    overview: { label: "All resources", href: "/resources" },
    intro: "Reference material, practice tests and writing from the floor.",
    items: [
      item("", "Resources library", "/resources", "Reference material by topic"),
      item("", "Practice tests", "/resources/tests", "Self-checks for each level"),
      item("", "Writing", "/blog", "Articles from the floor"),
      item("", "Floor Notes", "/#floor-notes", "The monthly letter"),
      item("", "Community", "/community", "Channels for learners"),
    ],
  },
  {
    label: "About",
    overview: { label: "About the author", href: "/about" },
    intro: "The curriculum was written by someone who ran the floor it describes.",
    items: [
      item("", "About the author", "/about", "Experience and approach"),
      item("", "Contact", "/contact", "Write to us"),
      item("", "Content governance", "/legal/content-governance", "How the material is kept accurate"),
      item("", "Disclaimer", "/legal/disclaimer", "Teaching data and its limits"),
    ],
  },
  { label: "Pricing", overview: { label: "Pricing", href: "/pricing" }, intro: "", items: [] as MenuItem[] },
];
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
      menus: list(
        "Menus",
        {
          label: text("Menu name", "", { max: 30 }),
          overview: link("Main link", { label: "", href: "/" }, { help: "Shown at the top of the open menu. A menu with no items is this link on its own." }),
          intro: area("Introduction", "", { max: 240, optional: true }),
          items: list("Items", menuItem, [], { max: 14, titleField: "group" }),
        },
        MENUS,
        { max: 7, titleField: "label", help: "The menus across the top bar. On phones they open one at a time." },
      ),
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
        { max: 8, help: "Used only when there are no menus." },
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
      line: text("Line under the name", "© 2026. Set in Satoshi.", { max: 120 }),
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
