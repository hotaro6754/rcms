import { PageHeader, Section } from "@/components/site/PageHeader";

export const metadata = {
  title: "Writing",
  description: "Notes on revenue cycle operations, governance and the move from analyst to leader.",
};

const POSTS = [
  { kind: "Governance", title: "Your AR aging bucket is lying to you", lead: "Ageing from claim creation date hides the payer clock. Three re-cuts that expose where the money is genuinely stuck, and which one to put in front of a client.", read: "11 min", date: "28 August 2026" },
  { kind: "Workforce", title: "Capacity planning when attrition runs at 34 percent", lead: "A working model for backfill lead time, ramp curves and the shrinkage buffer that keeps SLA intact through a bad quarter.", read: "14 min", date: "19 August 2026" },
  { kind: "Leadership", title: "The review slide that gets you promoted", lead: "Most reviews present activity. Leaders present cause, cost and the decision they need from the client. What changes between the two.", read: "9 min", date: "6 August 2026" },
  { kind: "Denials", title: "Working denials is not preventing denials", lead: "A floor that clears its denial queue every month and still has the same denial rate is running very fast in a circle. Where the control belongs instead.", read: "12 min", date: "24 July 2026" },
  { kind: "Career", title: "What a team lead is actually assessed on", lead: "Not throughput. Shrinkage, utilisation, QA stability and whether your capacity model survives an audit. The gap between what people practise and what they are measured on.", read: "8 min", date: "11 July 2026" },
  { kind: "Automation", title: "Bot or headcount: writing the business case", lead: "Eligibility and status checks pay back fastest, and the case is arithmetic rather than opinion. The five lines a finance director will look for.", read: "13 min", date: "2 July 2026" },
];

export default function BlogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Writing"
        title="Notes from the floor."
        lead="Operations writing for people who have to defend a number on Monday. No listicles, no vendor pitches, no reprints of payer press releases."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {POSTS.map((p) => (
            <article key={p.title} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-6 transition-colors hover:border-input">
              <p className="text-data text-micro font-medium uppercase tracking-[0.06em] text-primary">{p.kind}</p>
              <h2 className="mt-3 text-[1.35rem] leading-tight">{p.title}</h2>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">{p.lead}</p>
              <p className="text-data mt-5 border-t border-border pt-4 text-micro text-muted-foreground">
                {p.read} read · {p.date}
              </p>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
