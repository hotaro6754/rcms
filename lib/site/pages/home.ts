import { area, choice, definePage, group, image, link, list, text, texts, toggle } from "../fields";
import { PROBLEM_LINES } from "@/lib/data/problem";
import { SYSTEM } from "@/lib/data/system";
import { LAB, VERDICT_LABEL } from "@/lib/data/lab";
import { CAREER, FOUNDER, ROLE_LADDER } from "@/lib/data/founder";
import { FOUNDER_PORTRAIT } from "@/lib/data/media";
import { METRICS, type MetricId } from "@/lib/data/telemetry";
import { BRAND } from "@/lib/brand";

/**
 * The homepage's copy. Defaults are the copy that shipped with the page; several come straight
 * from the homepage-only modules in lib/data so the text is not written twice. Levels, courses
 * and prices stay in the database; the illustrations (the claim, the remittance slip, the
 * advisory week) and the board pack's teaching data stay in code.
 */

const VERDICTS = [
  { value: "on-path", label: VERDICT_LABEL["on-path"] },
  { value: "symptom", label: VERDICT_LABEL.symptom },
  { value: "dead-end", label: VERDICT_LABEL["dead-end"] },
] as const;

const METRIC_OPTIONS = Object.values(METRICS).map((m) => ({ value: m.id, label: m.label }));

const runningHead = (value: string) => text("Running head", value, { max: 40, help: "Shown beside the chapter number, in capitals." });

export const homePage = definePage({
  key: "home",
  path: "/",
  label: "Homepage",
  group: "Pages",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", `${BRAND.name} | RCM and Operations Management Training`, { max: 120 }),
      description: text(
        "Search description",
        "Structured training and mentoring in US healthcare revenue cycle and operations management, from your first claim to leading teams and clients.",
        { max: 300 },
      ),
    }),

    hero: group("Hero", {
      line1: text("Headline, line 1", "From RCM", { max: 40 }),
      line2: text("Headline, line 2 (accented)", "beginner.", { max: 40 }),
      line3: text("Headline, line 3", "To operations", { max: 40 }),
      line4: text("Headline, line 4 (accented)", "leader.", { max: 40 }),
      lead: area(
        "Introduction",
        "Training and mentoring in US healthcare revenue cycle operations. You learn it the way it is worked: one claim, every stage it passes through, and every decision that can stop it.",
        { max: 400 },
      ),
      primary: link("Main button", { label: "See the learning levels", href: "#tracks" }),
      secondary: link("Second link", { label: "Or talk it through, 1:1", href: "/mentoring" }),
      facts: list(
        "Case file details",
        { label: text("Label", "", { max: 40 }), value: text("Value", "", { max: 40 }) },
        [
          { label: "CASE", value: "20481" },
          { label: "SPECIALTY", value: "Cardiology" },
          { label: "STAGES", value: "13, one denial" },
        ],
        { max: 3, titleField: "label" },
      ),
      scrollCue: link("Scroll prompt", { label: "FOLLOW THE CLAIM", href: "#problem" }),
    }),

    problem: group("01 The problem", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The problem"),
      title: text("Heading", "RCM isn’t one process.", { max: 80 }),
      lines: list(
        "Lines",
        {
          lead: text("Lead-in", "", { max: 40 }),
          noun: text("Word in italics", "", { max: 40 }),
          fact: area("Fact", "", { max: 400 }),
        },
        PROBLEM_LINES.map((l) => ({ ...l })),
        { min: 1, max: 9, titleField: "noun", help: "Shown one at a time as the reader scrolls on desktop, stacked on phones." },
      ),
      resolutionTitle: text("Closing line", "We teach the whole picture.", { max: 80 }),
      resolutionBody: area(
        "Closing text",
        "Here RCM is one system, learned one level at a time, until a decision made at registration is something you can see arriving as a denial six weeks later.",
        { max: 400 },
      ),
    }),

    system: group("02 The cycle", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The cycle"),
      title: text("Heading", "Ten stages, and a claim has to clear every one of them.", { max: 120 }),
      lead: area(
        "Introduction",
        "Scroll through them in order: what each stage does, how it usually breaks, the number that gives it away, and where RCMExcel teaches it.",
        { max: 400 },
      ),
      phases: group("Phase names", {
        front: text("Front end", "Front end", { max: 40 }),
        middle: text("Middle", "Middle", { max: 40 }),
        back: text("Back end", "Back end", { max: 40 }),
      }),
      breaksLabel: text("“How it breaks” label", "HOW IT BREAKS", { max: 40 }),
      numberLabel: text("“The number” label", "THE NUMBER", { max: 40 }),
      learnLabel: text("“Where you learn it” label", "WHERE YOU LEARN IT", { max: 40 }),
      levelNames: group("Level names", {
        trainee: text("Foundation level", "Trainee — Foundation", { max: 60 }),
        professional: text("Execution level", "Professional — Execution", { max: 60 }),
        leadership: text("Governance level", "Leadership — Governance", { max: 60 }),
      }),
      stages: list(
        "Stages",
        {
          label: text("Stage", "", { max: 60 }),
          does: area("What it does", "", { max: 300 }),
          breaks: area("How it breaks", "", { max: 400 }),
          metric: text("The number", "", { max: 80 }),
        },
        SYSTEM.map((s) => ({ label: s.label, does: s.does, breaks: s.breaks, metric: s.metric })),
        {
          min: SYSTEM.length,
          max: SYSTEM.length,
          titleField: "label",
          help: "The ten stages in order. Their phase and the level that teaches them are fixed.",
        },
      ),
    }),

    path: group("03 The path", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The path"),
      title: text("Heading", "You don’t need another course. You need to know which level you are on.", { max: 160 }),
      countLine: text("Levels sentence", "levels, each built on the one before.", {
        max: 120,
        help: "Shown after the number of levels in words, e.g. “Three levels, each built on the one before.”",
      }),
      lead: area("Introduction", "Start where you actually work today; every course ends with assessed work you can show.", { max: 300 }),
      indexLabel: text("Index label", "THE LEVELS", { max: 40 }),
      compare: link("Index link", { label: "Compare the levels", href: "/learning-paths" }),
      unavailable: text("When levels cannot load", "The level guide is not available right now.", { max: 160 }),
      unavailableLink: link("When levels cannot load: link", { label: "Browse the catalogue", href: "/catalog" }),
      unavailableAfter: text("When levels cannot load: after the link", "instead.", { max: 40, optional: true }),
      notReleased: text("Level with no released courses", "Courses for this level are in review and not yet released.", { max: 160 }),
      freeLabel: text("Free course price label", "free", { max: 40 }),
      includedLabel: text("Course without its own price", "included in all-access", { max: 60 }),
      moreTopics: text("Hidden topics note (phones)", "more topics", { max: 40, help: "Shown as “and 3 more topics”." }),
      notSure: link("Level help link", { label: "Not sure it’s your level?", href: "/mentoring" }),
      coursesButton: text("Courses button", "See the courses", { max: 40, help: "Goes to the catalogue filtered to the level." }),
      effortLabel: text("Effort label", "Typical effort:", { max: 40 }),
    }),

    lab: group("04 The investigation", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The investigation"),
      eyebrow: text("Situation label", "END OF AUGUST · CARDIOLOGY · 34 PROVIDERS", { max: 100 }),
      statement: area("Heading", LAB.statement, { max: 200 }),
      codeLabel: text("Code label", "CODE", { max: 40 }),
      claimsLabel: text("Claims label", "CLAIMS", { max: 40 }),
      valueLabel: text("Value label", "AT STAKE", { max: 40 }),
      reasonLabel: text("Reason label", "REASON ON FILE", { max: 40 }),
      prompt: text("Question", LAB.prompt, { max: 100 }),
      choices: list(
        "Lines of inquiry",
        {
          label: text("Line of inquiry", "", { max: 60 }),
          verdict: choice("Verdict", VERDICTS, "dead-end"),
          finding: area("Finding", "", { max: 400 }),
        },
        LAB.choices.map((c) => ({ label: c.label, verdict: c.verdict, finding: c.finding })),
        { min: 1, max: 6, titleField: "label", help: "Lettered A to F. A line on the root-cause path offers the five whys." },
      ),
      idle: area("Before a choice", "One of these is the right first question. Two feel right and only treat the symptom.", { max: 300 }),
      findingLabel: text("Finding label", "FINDING", { max: 40 }),
      tags: group("Tags on tried lines", {
        onPath: text("On the root-cause path", "THREAD", { max: 40 }),
        symptom: text("A symptom", "SYMPTOM", { max: 40 }),
        deadEnd: text("Ruled out", "RULED OUT", { max: 40 }),
      }),
      verdictLabels: group("Verdicts on the finding", {
        onPath: text("On the root-cause path", VERDICT_LABEL["on-path"], { max: 60 }),
        symptom: text("A symptom", VERDICT_LABEL.symptom, { max: 60 }),
        deadEnd: text("Ruled out", VERDICT_LABEL["dead-end"], { max: 60 }),
      }),
      followButton: text("Five whys button", "Follow the five whys", { max: 60 }),
      tryAnother: text("Try again hint", "Try another line of inquiry.", { max: 100 }),
      steps: list(
        "The five whys",
        {
          question: text("Question", "", { max: 160 }),
          answer: area("Answer", "", { max: 400 }),
          evidence: text("Evidence", "", { max: 200 }),
        },
        LAB.steps.map((s) => ({ question: s.question, answer: s.answer, evidence: s.evidence })),
        { max: 9, titleField: "question" },
      ),
      conclusion: area("Conclusion", LAB.conclusion, { max: 400 }),
      cta: link("Closing link", { label: "This is how the Professional level teaches you to think", href: "/learning-paths" }),
    }),

    review: group("05 The review", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The review"),
      title: text("Heading", "Then it becomes a number someone has to explain.", { max: 120 }),
      lead: area(
        "Introduction",
        "The lab found the cause. At month end it goes upward as a page like this one: the measures against target, why each one moved, and what has to be decided before the client call.",
        { max: 400 },
      ),
      summary: area("Board pack summary", "Inventory is winning: worklist depth, days in A/R and first-pass resolution all beat plan.", {
        max: 300,
      }),
      summaryTail: text("After the count of measures", "moved the wrong way, and it is the same cause each time.", {
        max: 160,
        help: "Shown after “Two measures”, counted from the teaching data.",
      }),
      whyLabel: text("Explanation label", "WHY IT MOVED", { max: 40 }),
      decisionsLabel: text("Decisions label", "DECISIONS NEEDED TODAY", { max: 60 }),
      caption: text("Caption", "Illustrative teaching data. Point at a line to read why it moved.", { max: 160 }),
      cta: link("Closing link", { label: "Run the full seven-stage review: escalations, risk, capacity and actions", href: "/governance" }),
    }),

    people: group("06 The people", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The people"),
      statement: text("Heading", "Execution gets you into operations.", { max: 100 }),
      statementSecond: text("Heading, second sentence", "Leadership changes what operations can achieve.", { max: 100 }),
      roles: list(
        "Role ladder",
        {
          level: text("Level", "", { max: 10 }),
          role: text("Role", "", { max: 60 }),
          owns: text("Owns", "", { max: 100 }),
          metric: choice<MetricId>("Number drawn", METRIC_OPTIONS, "denial-rate", { help: "From the illustrative teaching data." }),
        },
        ROLE_LADDER.map((r) => ({ level: r.level, role: r.role, owns: r.owns, metric: r.metric })),
        { min: 1, max: 10, titleField: "role" },
      ),
    }),

    mentoring: group("07 The advice", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The advice"),
      title: text("Heading", "Or ask someone who has run the floor.", { max: 100 }),
      lead: area(
        "Introduction",
        "One-to-one sessions, chosen by the length of the problem. Send a request and we confirm a time by email. Point at one to see where such a session usually sits in the week.",
        { max: 400 },
      ),
      calendarLabel: text("Calendar label", "A TYPICAL WEEK · IST · ILLUSTRATIVE", { max: 80 }),
      calendarNote: area("Calendar note", "One-to-one, on video, in the evenings and on Saturday mornings to fit US-shift schedules.", { max: 300 }),
      minutesLabel: text("Minutes label", "minutes", { max: 40 }),
      leaveWithLabel: text("Outcome label", "YOU LEAVE WITH", { max: 40 }),
      requestLabel: text("Session link text", "Request a time", { max: 40 }),
    }),

    founder: group("08 The author", {
      show: toggle("Show this section", true),
      runningHead: runningHead("The author"),
      portrait: image("Portrait", FOUNDER_PORTRAIT ? { src: FOUNDER_PORTRAIT.src, alt: FOUNDER_PORTRAIT.alt } : { src: "", alt: "" }, {
        optional: true,
        help: "Optional. Without a portrait the section is set in type alone.",
      }),
      years: text("Large number", String(FOUNDER.years), { max: 10 }),
      yearsCaption: text("Under the number", "YEARS INSIDE US HEALTHCARE REVENUE CYCLE OPERATIONS", { max: 120 }),
      title: text("Heading", "This curriculum was written by someone who ran the floor it describes.", { max: 160 }),
      name: text("Name", FOUNDER.name, { max: 80 }),
      focus: text("Focus", FOUNDER.focus, { max: 200 }),
      body: texts(
        "Paragraphs",
        [
          "Most revenue cycle training stops where the job stops being about processing claims and starts being about running an operation: capacity models, SLA design, client reviews, root cause programs. Those are the skills that decide who becomes a lead, a manager, a director, and nobody writes them down. This Academy writes them down.",
        ],
        { max: 1200, maxItems: 6 },
      ),
      career: list(
        "Experience",
        { title: text("Area", "", { max: 80 }), body: area("Description", "", { max: 400 }) },
        CAREER.map(([title, body]) => ({ title, body })),
        { max: 12, titleField: "title" },
      ),
      cta: link("Link", { label: "About the author", href: "/about" }),
    }),
  },
});
