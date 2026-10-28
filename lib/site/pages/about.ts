import { area, definePage, group, link, list, text, texts, toggle } from "../fields";

export const aboutPage = definePage({
  key: "about",
  path: "/about",
  label: "About",
  group: "Pages",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "About the founder", { max: 70 }),
      description: text("Search description", "Twenty-one years inside US healthcare revenue cycle operations, taught the way it is actually run.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "About", { max: 60 }),
      title: text("Title", "Twenty-one years on the operations floor, turned into a curriculum.", { max: 160 }),
      lead: area("Introduction", "This academy exists because the knowledge that moves someone from analyst to manager is almost never written down. It is passed on informally, to whoever happens to sit near the right person. This is an attempt to write it down properly.", { max: 600 }),
    }),
    founder: group("Founder card", {
      label: text("Label", "Founder", { max: 40 }),
      name: text("Name", "V K Chakradhar Gangaraju", { max: 80 }),
      role: text("Role", "US Healthcare Revenue Cycle Operations", { max: 120 }),
      experienceLabel: text("First fact: label", "Experience", { max: 40 }),
      experience: text("First fact", "21 years", { max: 40 }),
      focusLabel: text("Second fact: label", "Focus", { max: 40 }),
      focus: text("Second fact", "Operations leadership, governance, process improvement, people development", { max: 200 }),
      cta: link("Button", { label: "Book a session", href: "/mentoring" }),
    }),
    career: group("Experience", {
      title: text("Heading", "Where the experience comes from", { max: 120 }),
      items: list(
        "Areas",
        { title: text("Area", "", { max: 80 }), body: area("Description", "", { max: 400 }) },
        [
          { title: "Operations delivery", body: "Multi-client revenue cycle delivery across physician and hospital billing, onshore and offshore." },
          { title: "People leadership", body: "Building and running AR, denials, posting, eligibility and coding support teams." },
          { title: "Governance", body: "Monthly and quarterly client reviews, SLA construction, corrective action planning." },
          { title: "Process improvement", body: "Root cause programs, quality frameworks, productivity baselining and automation cases." },
        ],
        { max: 12, titleField: "title" },
      ),
    }),
    why: group("Why an academy", {
      title: text("Heading", "Why an academy rather than a course", { max: 120 }),
      paragraphs: texts("Paragraphs", [
        "There is no shortage of medical billing training. Coding, AR calling, denials, mock interviews: all of it exists, much of it is good, and all of it stops at the same place. It stops where the job stops being about processing claims and starts being about running an operation.",
        "Productivity governance, SLA design, capacity planning, client reviews, root cause programs, automation business cases. These are the skills that decide who becomes a team lead, a manager, a director. They are also the skills nobody teaches, because they are learned by absorption inside employers who may or may not be good at them.",
        "That gap is the whole reason this exists.",
      ], { maxItems: 10 }),
    }),
    beliefs: group("Beliefs", {
      show: toggle("Show this section", true),
      title: text("Heading", "What this academy believes", { max: 120 }),
      lead: area("Introduction", "Four positions that shape every program, every scenario and every mentoring session.", { max: 400 }),
      items: list(
        "Beliefs",
        { title: text("Title", "", { max: 100 }), body: area("Text", "", { max: 800 }) },
        [
          { title: "The metric is the job", body: "Every level of this industry is defined by a number someone trusts you to own. An associate owns their touches. A manager owns cost to collect. Training that ignores this teaches people to be busy rather than accountable." },
          { title: "Root cause beats volume", body: "Most floors work denials. Very few prevent them. The difference between a senior analyst and a leader is whether they can say why the number moved and produce the control that stops it moving again." },
          { title: "Leadership is learned on the floor", body: "Capacity models, shrinkage maths, governance decks and escalation handling are learned inside companies, quietly, by the people who happen to get a good manager. That is an accident of luck. It should be a curriculum." },
          { title: "Nothing here is theoretical", body: "Every scenario in the console comes from the shape of real operations: a payer bulletin that was never mapped, a pod with no lead, an audit bar traded away for volume. The names and numbers are invented. The situations are not." },
        ],
        { max: 12, titleField: "title" },
      ),
    }),
    closing: group("Closing call to action", {
      show: toggle("Show this section", true),
      title: text("Heading", "Start where you actually are.", { max: 120 }),
      body: area("Text", "The levelling assessment maps you against the six-rung ladder and returns the gaps between you and the role above, before you spend anything.", { max: 400 }),
      primary: link("Main button", { label: "See the learning levels", href: "/learning-paths" }),
      secondary: link("Second button", { label: "Ask a question", href: "/contact" }),
    }),
  },
});
