import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { SiteLink } from "@/components/site/SiteLink";
import { MENTORING } from "@/lib/data/catalog";
import { publicPricing } from "@/lib/services/learning/public-catalog";
import { paymentsConfigured } from "@/lib/payments/razorpay";
import { getPageContent } from "@/lib/site/content";
import { pricingPage } from "@/lib/site/pages/pricing";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  const c = await getPageContent(pricingPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/pricing" });
}

export const revalidate = 300;

const inr = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/**
 * Every price on this page is an active product, the same record checkout charges. Course
 * prices appear only while the course is released; a track appears only while all of its
 * courses are.
 */
export default async function PricingPage() {
  const [{ subscriptions, courses, tracks, mentoring }, c] = await Promise.all([publicPricing(), getPageContent(pricingPage)]);
  const per: Record<string, string> = { MONTH: c.allAccess.perMonth, YEAR: c.allAccess.perYear };
  const live = paymentsConfigured();
  const cta = (sku: string) => (live ? `/checkout/${sku}` : "/contact");

  return (
    <>
      <PageHeader
        eyebrow={c.header.eyebrow}
        title={c.header.title}
        lead={c.header.lead}
      />

      {!live && (
        <div className="mx-auto max-w-[1320px] px-6">
          <p role="status" className="border-l-2 border-warning pl-3 text-[14px]">
            {c.paymentsClosed.notice}
          </p>
        </div>
      )}

      {c.allAccess.show && subscriptions.length > 0 && (
        <Section title={c.allAccess.title} lead={c.allAccess.lead}>
          <div className="grid gap-4 md:grid-cols-2">
            {subscriptions.map((p) => (
              <article key={p.sku} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-6">
                <h3 className="text-[1.4rem] leading-tight">{p.name}</h3>
                {p.description && <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{p.description}</p>}
                <p className="text-data mt-5 border-t border-border pt-5 text-[1.75rem] font-medium leading-none">
                  {inr(p.amount)}
                  <span className="ml-2 font-sans text-micro font-normal text-muted-foreground">{p.interval ? per[p.interval] : c.allAccess.once}</span>
                </p>
                {p.trialDays > 0 && <p className="mt-2 text-micro text-success">{c.allAccess.trial.replace("{days}", String(p.trialDays))}</p>}
                <p className="mt-3 text-micro text-muted-foreground">{c.allAccess.renewal}</p>
                <Link href={cta(p.sku)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover">
                  {live ? c.allAccess.button : c.allAccess.offlineButton}
                </Link>
              </article>
            ))}
          </div>
        </Section>
      )}

      {c.courses.show && (
        <Section tint title={c.courses.title} lead={c.courses.lead}>
          {courses.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">{c.courses.empty}</p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
              <table className="w-full min-w-[40rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="label-caps px-5 py-3.5 font-medium">{c.courses.courseColumn}</th>
                    <th scope="col" className="label-caps px-5 py-3.5 text-right font-medium">{c.courses.priceColumn}</th>
                    <th scope="col" className="px-5 py-3.5"><span className="sr-only">{c.courses.actionsColumn}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.sku} className="border-b border-border last:border-0">
                      <th scope="row" className="px-5 py-4 text-left align-top">
                        <span className="block text-[14px] font-semibold">{course.name}</span>
                        {course.description && <span className="mt-1 block max-w-[60ch] text-micro font-normal leading-relaxed text-muted-foreground">{course.description}</span>}
                      </th>
                      <td className="text-data px-5 py-4 text-right align-top text-[15px] font-medium">{inr(course.amount)}</td>
                      <td className="px-5 py-4 text-right align-top">
                        {course.courseSlug && (
                          <Link href={`/catalog/${course.courseSlug}`} className="text-[13px] underline underline-offset-4">
                            {c.courses.details}
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
      )}

      {c.tracks.show && tracks.length > 0 && (
        <Section title={c.tracks.title} lead={c.tracks.lead}>
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
                  {live ? c.tracks.button : c.tracks.offlineButton}
                </Link>
              </article>
            ))}
          </div>
        </Section>
      )}

      {c.mentoring.show && mentoring.length > 0 && (
        <Section tint title={c.mentoring.title} lead={c.mentoring.lead}>
          <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="label-caps px-5 py-3.5 font-medium">{c.mentoring.sessionColumn}</th>
                  <th scope="col" className="label-caps px-5 py-3.5 font-medium">{c.mentoring.whoColumn}</th>
                  <th scope="col" className="label-caps px-5 py-3.5 text-right font-medium">{c.mentoring.priceColumn}</th>
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
          <SiteLink
            link={c.mentoring.cta}
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          />
        </Section>
      )}

      {c.corporate.show && (
        <Section title={c.corporate.title} lead={c.corporate.lead}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <ul className="grid gap-3 sm:grid-cols-2">
              {c.corporate.includes.map((item, i) => (
                <li key={i} className="rounded-[var(--radius)] border border-border bg-card px-4 py-3.5 text-[13.5px] leading-snug">
                  {item}
                </li>
              ))}
            </ul>
            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <p className="label-caps">{c.corporate.cardLabel}</p>
              <p className="mt-3 text-[1.4rem] leading-tight">{c.corporate.cardTitle}</p>
              <p className="mt-3 text-micro leading-relaxed text-muted-foreground">{c.corporate.cardBody}</p>
              <SiteLink
                link={c.corporate.cta}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              />
            </div>
          </div>
        </Section>
      )}

      {c.faq.show && (
        <Section tint title={c.faq.title}>
          <div className="grid gap-4 md:grid-cols-2">
            {c.faq.items.map((f, i) => (
              <details key={i} className="group rounded-[var(--radius)] border border-border bg-card p-5 open:bg-card">
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
      )}
    </>
  );
}
