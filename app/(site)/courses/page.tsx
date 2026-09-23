import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { LEVELS, PROGRAMS, inr } from "@/lib/data/catalog";

export const metadata = {
  title: "Programs",
  description:
    "Five flagship programs from RCM foundation to executive fellowship, each ending in a portfolio artefact.",
};

export default function CoursesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Programs"
        title="Five programs. Each one ends with something you can show."
        lead="No certificates. Every tier finishes with an artefact a hiring manager can read: a worked claim file, a denial root cause memo, a capacity model, a review deck."
      />

      <Section>
        <div className="flex flex-col gap-4">
          {PROGRAMS.map((p) => {
            const level = LEVELS.find((l) => l.n === p.level)!;
            return (
              <article
                key={p.id}
                id={p.id}
                className={`grid scroll-mt-24 gap-8 rounded-[var(--radius)] border bg-card p-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:p-8 ${
                  p.flag ? "border-primary" : "border-border"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-data text-micro font-semibold text-muted-foreground">
                      {p.tier}
                    </span>
                    <span className="text-data text-micro text-muted-foreground">
                      Level {p.level} · {level.verb}
                    </span>
                    {p.flag && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-micro font-semibold text-accent-foreground">
                        {p.flag}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-[1.9rem] leading-[1.06]">{p.name}</h2>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                    {p.who}
                  </p>

                  <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border">
                    <div className="bg-card p-4">
                      <dt className="label-caps text-[11px]">Price</dt>
                      <dd className="text-data mt-2 text-xl font-medium leading-none">
                        {inr(p.price)}
                      </dd>
                    </div>
                    <div className="bg-card p-4">
                      <dt className="label-caps text-[11px]">Length</dt>
                      <dd className="text-data mt-2 text-xl font-medium leading-none">
                        {p.weeks.split(",")[0]}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-5 text-micro leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Portfolio artefact: </span>
                    {p.artefact.toLowerCase()}.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/contact"
                      className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                      Enrol
                    </Link>
                    <Link
                      href="/mentoring"
                      className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
                    >
                      Ask about fit
                    </Link>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="label-caps">What you will be able to do</p>
                    <ul className="mt-4 flex flex-col gap-2.5">
                      {p.outcomes.map((o) => (
                        <li key={o} className="flex gap-2.5 text-[13.5px] leading-snug">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-[1px] bg-primary" />
                          <span className="text-secondary-foreground">{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="label-caps">Level {p.level} curriculum</p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {level.modules.map((m, i) => (
                        <li key={m} className="flex gap-3 text-micro leading-snug">
                          <span className="text-data shrink-0 text-subtle">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-muted-foreground">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section tint>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">
              Two tiers together cost less.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
              Most people need the tier they work at and the one above it. The tracks pair them.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            See tracks and pricing
          </Link>
        </div>
      </Section>
    </>
  );
}
