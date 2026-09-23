import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";

export const metadata = {
  title: "About the founder",
  description:
    "Twenty-one years inside US healthcare revenue cycle operations, taught the way it is actually run.",
};

const BELIEFS = [
  {
    n: "01",
    title: "The metric is the job",
    body: "Every level of this industry is defined by a number someone trusts you to own. An associate owns their touches. A manager owns cost to collect. Training that ignores this teaches people to be busy rather than accountable.",
  },
  {
    n: "02",
    title: "Root cause beats volume",
    body: "Most floors work denials. Very few prevent them. The difference between a senior analyst and a leader is whether they can say why the number moved and produce the control that stops it moving again.",
  },
  {
    n: "03",
    title: "Leadership is learned on the floor",
    body: "Capacity models, shrinkage maths, governance decks and escalation handling are learned inside companies, quietly, by the people who happen to get a good manager. That is an accident of luck. It should be a curriculum.",
  },
  {
    n: "04",
    title: "Nothing here is theoretical",
    body: "Every scenario in the console comes from the shape of real operations: a payer bulletin that was never mapped, a pod with no lead, an audit bar traded away for volume. The names and numbers are invented. The situations are not.",
  },
];

const CAREER = [
  ["Operations delivery", "Multi-client revenue cycle delivery across physician and hospital billing, onshore and offshore."],
  ["People leadership", "Building and running AR, denials, posting, eligibility and coding support teams."],
  ["Governance", "Monthly and quarterly client reviews, SLA construction, corrective action planning."],
  ["Process improvement", "Root cause programs, quality frameworks, productivity baselining and automation cases."],
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Twenty-one years on the operations floor, turned into a curriculum."
        lead="This academy exists because the knowledge that moves someone from analyst to manager is almost never written down. It is passed on informally, to whoever happens to sit near the right person. This is an attempt to write it down properly."
      />

      <Section tint>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div>
            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <p className="label-caps">Founder</p>
              <h2 className="mt-3 text-[1.6rem] leading-tight">V K Chakradhar Gangaraju</h2>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                US Healthcare Revenue Cycle Operations
              </p>
              <dl className="mt-6 flex flex-col gap-4 border-t border-border pt-5">
                <div>
                  <dt className="label-caps text-[11px]">Experience</dt>
                  <dd className="text-data mt-1.5 text-2xl font-medium leading-none">21 years</dd>
                </div>
                <div>
                  <dt className="label-caps text-[11px]">Focus</dt>
                  <dd className="mt-1.5 text-[13.5px]">
                    Operations leadership, governance, process improvement, people development
                  </dd>
                </div>
              </dl>
              <Link
                href="/mentoring"
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Book a session
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-[1.6rem] leading-tight">Where the experience comes from</h2>
              <dl className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2">
                {CAREER.map(([k, v]) => (
                  <div key={k} className="bg-card p-5">
                    <dt className="text-[14px] font-semibold">{k}</dt>
                    <dd className="mt-2 text-micro leading-relaxed text-muted-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <h3 className="text-[15px] font-semibold">Why an academy rather than a course</h3>
              <p className="mt-3 max-w-[68ch] text-[13.5px] leading-relaxed text-secondary-foreground">
                There is no shortage of medical billing training. Coding, AR calling, denials, mock
                interviews: all of it exists, much of it is good, and all of it stops at the same
                place. It stops where the job stops being about processing claims and starts being
                about running an operation.
              </p>
              <p className="mt-4 max-w-[68ch] text-[13.5px] leading-relaxed text-secondary-foreground">
                Productivity governance, SLA design, capacity planning, client reviews, root cause
                programs, automation business cases. These are the skills that decide who becomes a
                team lead, a manager, a director. They are also the skills nobody teaches, because
                they are learned by absorption inside employers who may or may not be good at them.
              </p>
              <p className="mt-4 max-w-[68ch] text-[13.5px] leading-relaxed text-secondary-foreground">
                That gap is the whole reason this exists.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="What this academy believes"
        lead="Four positions that shape every program, every scenario and every mentoring session."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {BELIEFS.map((b) => (
            <article key={b.n} className="rounded-[var(--radius)] border border-border bg-card p-6">
              <span className="text-data text-micro font-semibold text-primary">{b.n}</span>
              <h3 className="mt-3 text-[1.15rem] leading-snug">{b.title}</h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{b.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section tint>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">
              Start where you actually are.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
              The levelling assessment maps you against the six-rung ladder and returns the gaps
              between you and the role above, before you spend anything.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/learning-paths"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              See the five levels
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Ask a question
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
