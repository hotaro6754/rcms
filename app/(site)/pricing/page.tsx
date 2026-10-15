import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { CORPORATE, FAQ, MENTORING } from "@/lib/data/catalog";
import { publicPricing } from "@/lib/services/learning/public-catalog";
import { paymentsConfigured } from "@/lib/payments/razorpay";

export const metadata = {
  title: "Pricing",
  description: "All-access plans, individual courses, tracks, mentoring and corporate accounts. Prices are the ones charged at checkout.",
};

export const revalidate = 300;

const inr = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const PER: Record<string, string> = { MONTH: "per month", YEAR: "per year" };

/**
 * Every price on this page is an active product, the same record checkout charges. Course
 * prices appear only while the course is released; a track appears only while all of its
 * courses are.
 */
export default async function PricingPage() {
  const { subscriptions, courses, tracks, mentoring } = await publicPricing();
  const live = paymentsConfigured();
  const cta = (sku: string) => (live ? `/checkout/${sku}` : "/contact");

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Subscribe to everything, or buy the course you need."
        lead="Prices include the full course, its assessments and its certificate. What you see here is what checkout charges."
      />

      {!live && (
        <div className="mx-auto max-w-[1320px] px-6">
          <p role="status" className="border-l-2 border-warning pl-3 text-[14px]">
            Online payment is not open yet. Use the contact form and we will enrol you directly.
          </p>
        </div>
      )}

      {subscriptions.length > 0 && (
        <Section title="All-access" lead="Every released course that is part of the subscription, including new ones as they are released.">
          <div className="grid gap-4 md:grid-cols-2">
            {subscriptions.map((p) => (
              <article key={p.sku} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-6">
                <h3 className="text-[1.4rem] leading-tight">{p.name}</h3>
                {p.description && <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{p.description}</p>}
                <p className="text-data mt-5 border-t border-border pt-5 text-[1.75rem] font-medium leading-none">
                  {inr(p.amount)}
                  <span className="ml-2 font-sans text-micro font-normal text-muted-foreground">{p.interval ? PER[p.interval] : "once"}</span>
                </p>
                {p.trialDays > 0 && <p className="mt-2 text-micro text-success">{p.trialDays}-day trial</p>}
                <p className="mt-3 text-micro text-muted-foreground">Prepaid. It does not renew automatically; you choose whether to buy the next period.</p>
                <Link href={cta(p.sku)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover">
                  {live ? "Subscribe" : "Ask us"}
                </Link>
              </article>
            ))}
          </div>
        </Section>
      )}

      <Section tint title="Courses" lead="Buy a single course and keep access to it.">
        {courses.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No courses are on sale individually right now.</p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="label-caps px-5 py-3.5 font-medium">Course</th>
                  <th scope="col" className="label-caps px-5 py-3.5 text-right font-medium">Price</th>
                  <th scope="col" className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.sku} className="border-b border-border last:border-0">
                    <th scope="row" className="px-5 py-4 text-left align-top">
                      <span className="block text-[14px] font-semibold">{c.name}</span>
                      {c.description && <span className="mt-1 block max-w-[60ch] text-micro font-normal leading-relaxed text-muted-foreground">{c.description}</span>}
                    </th>
                    <td className="text-data px-5 py-4 text-right align-top text-[15px] font-medium">{inr(c.amount)}</td>
                    <td className="px-5 py-4 text-right align-top">
                      {c.courseSlug && (
                        <Link href={`/catalog/${c.courseSlug}`} className="text-[13px] underline underline-offset-4">
                          Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {tracks.length > 0 && (
        <Section title="Tracks" lead="Courses that build on each other, bought together.">
          <div className="grid gap-4 md:grid-cols-3">
            {tracks.map((t) => (
              <article key={t.sku} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-6">
                <h3 className="text-[1.3rem] leading-tight">{t.name}</h3>
                {t.description && <p className="mt-2 text-micro leading-relaxed text-muted-foreground">{t.description}</p>}
                <p className="text-data mt-5 border-t border-border pt-5 text-2xl font-medium leading-none">{inr(t.amount)}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-1.5">
                  {t.includedCourses.map((name) => (
                    <li key={name} className="text-micro text-secondary-foreground">
                      {name}
                    </li>
                  ))}
                </ul>
                <Link href={cta(t.sku)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary">
                  {live ? "Buy this track" : "Ask us"}
                </Link>
              </article>
            ))}
          </div>
        </Section>
      )}

      {mentoring.length > 0 && (
        <Section tint title="Mentoring" lead="Live, one to one. Requests are confirmed by email with a time that suits you.">
          <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="label-caps px-5 py-3.5 font-medium">Session</th>
                  <th scope="col" className="label-caps px-5 py-3.5 font-medium">Who it is for</th>
                  <th scope="col" className="label-caps px-5 py-3.5 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {mentoring.map((m) => {
                  const info = MENTORING.find((x) => `mentoring-${x.id}` === m.sku);
                  return (
                    <tr key={m.sku} className="border-b border-border last:border-0">
                      <th scope="row" className="px-5 py-4 text-left align-top">
                        <span className="block text-[14px] font-semibold">{m.name}</span>
                      </th>
                      <td className="max-w-[40ch] px-5 py-4 align-top text-micro leading-relaxed text-muted-foreground">{info?.who ?? m.description}</td>
                      <td className="text-data px-5 py-4 text-right align-top text-[15px] font-medium">{inr(m.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Link href="/mentoring" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover">
            Request a session
          </Link>
        </Section>
      )}

      <Section title={CORPORATE.headline} lead={CORPORATE.body}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <ul className="grid gap-3 sm:grid-cols-2">
            {CORPORATE.includes.map((i) => (
              <li key={i} className="rounded-[var(--radius)] border border-border bg-card px-4 py-3.5 text-[13.5px] leading-snug">
                {i}
              </li>
            ))}
          </ul>
          <div className="rounded-[var(--radius)] border border-border bg-card p-6">
            <p className="label-caps">Pricing</p>
            <p className="mt-3 text-[1.4rem] leading-tight">Per engagement</p>
            <p className="mt-3 text-micro leading-relaxed text-muted-foreground">Agreed against headcount and the courses your teams need.</p>
            <Link href="/contact" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover">
              Talk to us
            </Link>
          </div>
        </div>
      </Section>

      <Section tint title="Questions people ask">
        <div className="grid gap-4 md:grid-cols-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-[var(--radius)] border border-border bg-card p-5 open:bg-card">
              <summary className="cursor-pointer list-none text-[14px] font-semibold marker:hidden">
                <span className="flex items-start justify-between gap-4">
                  {f.q}
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
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
