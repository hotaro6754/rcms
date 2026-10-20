import { area, definePage, group, list, text, toggle } from "../fields";

export const communityPage = definePage({
  key: "community",
  path: "/community",
  label: "Community",
  group: "Pages",
  fields: {
    seo: group("Search and browser tab", {
      title: text("Page title", "Community", { max: 70 }),
      description: text("Search description", "Five functional channels moderated by practising leads. Working channels, not a feed.", { max: 300 }),
    }),
    header: group("Page header", {
      eyebrow: text("Label", "Community", { max: 60 }),
      title: text("Title", "Working channels, not a feed.", { max: 160 }),
      lead: area("Introduction", "Five channels moderated by practising leads. Questions get answered with a payer policy link or a worked example, or they get closed. Access comes with any program.", { max: 600 }),
    }),
    channels: group("Channels", {
      show: toggle("Show this section", true),
      title: text("Heading", "The channels", { max: 120 }),
      ruleLabel: text("House rule label", "House rule:", { max: 40, help: "Shown before each channel’s rule." }),
      items: list(
        "Channels",
        {
          name: text("Channel name", "", { max: 40 }),
          who: text("Who it is for", "", { max: 80 }),
          about: area("What it covers", "", { max: 300 }),
          rule: area("House rule", "", { max: 300 }),
        },
        [
          { name: "#denials", who: "Analysts and SMEs", about: "CARC and RARC interpretation, appeal strategy, payer policy changes.", rule: "Post the code, the payer and what you already tried." },
          { name: "#ar", who: "AR and follow-up teams", about: "Aging strategy, payer behaviour, timely filing, worklist prioritisation.", rule: "Bring the aging cut, not just the frustration." },
          { name: "#leadership", who: "Leads and managers", about: "Capacity models, QA disputes, appraisals, escalation handling.", rule: "Anonymise your team before you post about them." },
          { name: "#governance", who: "Managers and above", about: "Review decks, SLA construction, corrective action plans, client conversations.", rule: "Templates get shared here. Improve them rather than only taking them." },
          { name: "#career", who: "Everyone", about: "Role transitions, interview preparation, what a level actually requires.", rule: "Name the role you are targeting. Advice without a target is noise." },
        ],
        { max: 12, titleField: "name" },
      ),
    }),
    threads: group("Sample threads", {
      show: toggle("Show this section", true),
      title: text("Heading", "Open right now", { max: 120 }),
      lead: area("Introduction", "A sample of what the channels look like on an ordinary Tuesday.", { max: 400 }),
      items: list(
        "Threads",
        {
          channel: text("Channel", "", { max: 40 }),
          title: area("Thread title", "", { max: 300 }),
          author: text("Posted by", "", { max: 60 }),
          replies: text("Replies", "", { max: 40 }),
        },
        [
          { channel: "#denials", title: "BCBS is bundling 93306 with 93000. Is our modifier 59 defensible?", author: "Vidya R.", replies: "14 replies" },
          { channel: "#leadership", title: "Client wants productivity at 45 touches a day. Our QA fails above 38. How did you argue this?", author: "Arun M.", replies: "31 replies" },
          { channel: "#governance", title: "Template: month-end AR walk that ties to the GL. Sharing ours, please tear it apart.", author: "Priya S.", replies: "22 replies" },
          { channel: "#career", title: "Moved from team lead to manager last week. What did nobody warn you about?", author: "Sandeep K.", replies: "48 replies" },
        ],
        { max: 12, titleField: "title" },
      ),
    }),
  },
});
