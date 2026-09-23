import { PageHeader, Section } from "@/components/site/PageHeader";

export const metadata = {
  title: "Community",
  description: "Five functional channels moderated by practising leads. Working channels, not a feed.",
};

const CHANNELS = [
  { name: "#denials", who: "Analysts and SMEs", about: "CARC and RARC interpretation, appeal strategy, payer policy changes.", rule: "Post the code, the payer and what you already tried." },
  { name: "#ar", who: "AR and follow-up teams", about: "Aging strategy, payer behaviour, timely filing, worklist prioritisation.", rule: "Bring the aging cut, not just the frustration." },
  { name: "#leadership", who: "Leads and managers", about: "Capacity models, QA disputes, appraisals, escalation handling.", rule: "Anonymise your team before you post about them." },
  { name: "#governance", who: "Managers and above", about: "Review decks, SLA construction, corrective action plans, client conversations.", rule: "Templates get shared here. Improve them rather than only taking them." },
  { name: "#career", who: "Everyone", about: "Role transitions, interview preparation, what a level actually requires.", rule: "Name the role you are targeting. Advice without a target is noise." },
];

const THREADS = [
  ["#denials", "BCBS is bundling 93306 with 93000. Is our modifier 59 defensible?", "Vidya R.", "14 replies"],
  ["#leadership", "Client wants productivity at 45 touches a day. Our QA fails above 38. How did you argue this?", "Arun M.", "31 replies"],
  ["#governance", "Template: month-end AR walk that ties to the GL. Sharing ours, please tear it apart.", "Priya S.", "22 replies"],
  ["#career", "Moved from team lead to manager last week. What did nobody warn you about?", "Sandeep K.", "48 replies"],
];

export default function CommunityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Working channels, not a feed."
        lead="Five channels moderated by practising leads. Questions get answered with a payer policy link or a worked example, or they get closed. Access comes with any program."
      />

      <Section title="The channels">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CHANNELS.map((c) => (
            <article key={c.name} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-5">
              <h2 className="text-data text-[15px] font-semibold text-primary">{c.name}</h2>
              <p className="mt-1 text-micro text-muted-foreground">{c.who}</p>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-secondary-foreground">{c.about}</p>
              <p className="mt-4 border-t border-border pt-3 text-micro leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">House rule: </span>{c.rule}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section tint title="Open right now" lead="A sample of what the channels look like on an ordinary Tuesday.">
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card">
          {THREADS.map(([ch, title, who, count]) => (
            <li key={title} className="flex items-center gap-5 p-4">
              <span className="text-data hidden w-28 shrink-0 text-micro text-primary sm:block">{ch}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium leading-snug">{title}</span>
                <span className="text-data mt-1 block text-micro text-muted-foreground">{who}</span>
              </span>
              <span className="text-data shrink-0 text-micro text-muted-foreground">{count}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
