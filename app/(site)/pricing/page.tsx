import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { BUNDLES, CORPORATE, FAQ, MENTORING, PROGRAMS, inr } from "@/lib/data/catalog";

export const metadata = {
  title: "Pricing",
  description:
    "Programs from ₹2,999, mentoring from ₹999, and corporate cohorts priced per engagement.",
};

export default function PricingPage() {
  const byId = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Pay for a level, not a subscription."
        lead="One payment per program, lifetime access to that program's material, and a portfolio artefact at the end. No recurring fee, no drip-feed, no upsell inside the course."
      />

      <Section title="Programs" lead="Each tier stands alone. Buy the one that matches the work you do now.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROGRAMS.map((p) => (
            <article
              key={p.id}
              id={p.id}
              className={`flex flex-col rounded-[var(--radius)] border bg-card p-6 ${
                p.flag ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex min-h-6 items-center justify-between gap-2">
                <span className="text-data text-micro font-semibold text-muted-foreground">
                  {p.tier}
                </span>
                {p.flag && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-micro font-semibold text-accent-foreground">
                    {p.flag}
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-[1.5rem] leading-tight">{p.name}</h3>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">{p.who}</p>

              <p className="text-data mt-5 border-t border-border pt-5 text-[1.75rem] font-medium leading-none">
                {inr(p.price)}
                <span className="ml-2 font-sans text-micro font-normal text-muted-foreground">
                  once · {p.weeks}
                </span>
              </p>

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {p.outcomes.map((o) => (
                  <li key={o} className="flex gap-2.5 text-micro leading-relaxed">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-[1px] bg-primary" />
                    <span className="text-secondary-foreground">{o}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 border-t border-border pt-4 text-micro leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">You finish with </span>
                {p.artefact.toLowerCase()}.
              </p>

              <Link
                href="/contact"
                className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors ${
                  p.flag
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-input bg-card hover:bg-secondary"
                }`}
              >
                Enrol
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section
        tint
        title="Tracks"
        lead="Two adjacent tiers bought together. The saving is small and honest; the reason to take a track is that the second tier assumes the first."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {BUNDLES.map((b) => (
            <article key={b.id} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-6">
              <h3 className="text-[1.3rem] leading-tight">{b.name}</h3>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">{b.who}</p>
              <p className="text-data mt-5 border-t border-border pt-5 text-2xl font-medium leading-none">
                {inr(b.price)}
              </p>
              <p className="text-data mt-2 text-micro text-success">saves {inr(b.saving)}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {b.includes.map((id) => (
                  <li key={id} className="text-micro text-secondary-foreground">
                    {byId[id].name}{" "}
                    <span className="text-data text-muted-foreground">{inr(byId[id].price)}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Take this track
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Mentoring" lead="Live, one to one, and the only place your own data is on the screen.">
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="label-caps px-5 py-3.5 font-medium">Session</th>
                <th scope="col" className="label-caps px-5 py-3.5 font-medium">Who it is for</th>
                <th scope="col" className="label-caps px-5 py-3.5 font-medium">You leave with</th>
                <th scope="col" className="label-caps px-5 py-3.5 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {MENTORING.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-5 py-4 text-left align-top">
                    <span className="block text-[14px] font-semibold">{m.name}</span>
                    <span className="text-data mt-1 block text-micro text-muted-foreground">
                      {m.minutes} minutes
                    </span>
                  </th>
                  <td className="max-w-[26ch] px-5 py-4 align-top text-micro leading-relaxed text-muted-foreground">
                    {m.who}
                  </td>
                  <td className="max-w-[30ch] px-5 py-4 align-top text-micro leading-relaxed text-secondary-foreground">
                    {m.leaveWith}
                  </td>
                  <td className="text-data px-5 py-4 text-right align-top text-[15px] font-medium">
                    {inr(m.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link
          href="/mentoring"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Book a session
        </Link>
      </Section>

      <Section tint title={CORPORATE.headline} lead={CORPORATE.body}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <ul className="grid gap-3 sm:grid-cols-2">
            {CORPORATE.includes.map((i) => (
              <li
                key={i}
                className="rounded-[var(--radius)] border border-border bg-card px-4 py-3.5 text-[13.5px] leading-snug"
              >
                {i}
              </li>
            ))}
          </ul>
          <div className="rounded-[var(--radius)] border border-border bg-card p-6">
            <p className="label-caps">Pricing</p>
            <p className="mt-3 text-[1.4rem] leading-tight">Per engagement</p>
            <p className="mt-3 text-micro leading-relaxed text-muted-foreground">
              Scoped against headcount, specialty and how much of your own data goes into the
              curriculum. For ten or more people this is cheaper than individual seats.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Request a scope
            </Link>
          </div>
        </div>
      </Section>

      <Section title="Questions people actually ask">
        <div className="grid gap-4 md:grid-cols-2">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-[var(--radius)] border border-border bg-card p-5 open:bg-card"
            >
              <summary className="cursor-pointer list-none text-[14px] font-semibold marker:hidden">
                <span className="flex items-start justify-between gap-4">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
