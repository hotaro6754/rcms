import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { LEVELS, PROGRAMS, inr } from "@/lib/data/catalog";

export const metadata = {
  title: "Learning paths",
  description:
    "Five levels from RCM foundation to executive leadership, each defined by the metrics you are trusted to own.",
};

export default function LearningPathsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Learning paths"
        title="Learn. Perform. Master. Lead. Execute."
        lead="Five levels, each defined by what you own rather than how long you have been here. You enter where you actually work and leave at the level you want to be hired for."
      />

      <Section>
        <ol className="flex flex-col">
          {LEVELS.map((level, i) => {
            const programs = PROGRAMS.filter((p) => p.level === level.n);
            return (
              <li
                key={level.n}
                className="grid gap-8 border-b border-border py-10 first:pt-0 last:border-0 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
              >
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-data text-micro font-semibold text-primary">
                      LEVEL {level.n}
                    </span>
                    <span className="text-data text-micro text-muted-foreground">
                      {level.verb.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="mt-3 text-[1.6rem] leading-tight">{level.title}</h2>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                    {level.who}
                  </p>
                  <p className="mt-4 border-t border-border pt-4 text-[13.5px] leading-relaxed">
                    <span className="font-semibold">You leave able to </span>
                    <span className="text-secondary-foreground">
                      {level.outcome.replace(/^You (can |)/, "").replace(/\.$/, "")}.
                    </span>
                  </p>

                  {programs.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {programs.map((p) => (
                        <Link
                          key={p.id}
                          href={`/courses#${p.id}`}
                          className="inline-flex min-h-9 items-center rounded-md border border-input bg-card px-3 text-micro font-medium transition-colors hover:border-primary hover:text-primary"
                        >
                          {p.name} · {inr(p.price)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[var(--radius)] border border-border bg-card p-6">
                  <p className="label-caps">What the level covers</p>
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {level.modules.map((m) => (
                      <li key={m} className="flex gap-2.5 text-[13.5px] leading-snug">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-[1px] bg-primary" />
                        <span className="text-secondary-foreground">{m}</span>
                      </li>
                    ))}
                  </ul>
                  {i < LEVELS.length - 1 && (
                    <p className="mt-5 border-t border-border pt-4 text-micro text-muted-foreground">
                      Next: level {level.n + 1}, {LEVELS[i + 1].title}.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section tint>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">
              Not sure which level you are on?
            </h2>
            <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
              Most people place themselves one level too low. The console is the quickest way to
              find out: if you can staff the queue and defend the cost to collect, you are already
              working at level four.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/governance"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Try the Governance Room
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              See pricing
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
