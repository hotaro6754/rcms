import { area, definePage, group, list, text } from "../fields";

export const blogPage = definePage({
  key: "blog",
  path: "/blog",
  label: "Writing",
  group: "Pages",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Writing", { max: 70 }),
      description: text("Search description", "Notes on revenue cycle operations, governance and the move from analyst to leader.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Writing", { max: 60 }),
      title: text("Title", "Notes from the floor.", { max: 160 }),
      lead: area("Introduction", "Operations writing for people who have to defend a number on Monday. No listicles, no vendor pitches, no reprints of payer press releases.", { max: 600 }),
    }),
    posts: group("Articles", {
      readLabel: text("Word after the reading time", "read", { max: 40, help: "Shown as “11 min read”." }),
      items: list(
        "Articles",
        {
          kind: text("Topic", "", { max: 40 }),
          title: text("Title", "", { max: 160 }),
          lead: area("Summary", "", { max: 500 }),
          read: text("Reading time", "", { max: 40 }),
          date: text("Date", "", { max: 40 }),
        },
        [
          { kind: "Governance", title: "Your AR aging bucket is lying to you", lead: "Ageing from claim creation date hides the payer clock. Three re-cuts that expose where the money is genuinely stuck, and which one to put in front of a client.", read: "11 min", date: "28 August 2026" },
          { kind: "Workforce", title: "Capacity planning when attrition runs at 34 percent", lead: "A working model for backfill lead time, ramp curves and the shrinkage buffer that keeps SLA intact through a bad quarter.", read: "14 min", date: "19 August 2026" },
          { kind: "Leadership", title: "The review slide that gets you promoted", lead: "Most reviews present activity. Leaders present cause, cost and the decision they need from the client. What changes between the two.", read: "9 min", date: "6 August 2026" },
          { kind: "Denials", title: "Working denials is not preventing denials", lead: "A floor that clears its denial queue every month and still has the same denial rate is running very fast in a circle. Where the control belongs instead.", read: "12 min", date: "24 July 2026" },
          { kind: "Career", title: "What a team lead is actually assessed on", lead: "Not throughput. Shrinkage, utilisation, QA stability and whether your capacity model survives an audit. The gap between what people practise and what they are measured on.", read: "8 min", date: "11 July 2026" },
          { kind: "Automation", title: "Bot or headcount: writing the business case", lead: "Eligibility and status checks pay back fastest, and the case is arithmetic rather than opinion. The five lines a finance director will look for.", read: "13 min", date: "2 July 2026" },
        ],
        { max: 30, titleField: "title" },
      ),
    }),
  },
});
