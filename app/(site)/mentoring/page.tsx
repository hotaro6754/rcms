import { PageHeader, Section } from "@/components/site/PageHeader";
import { SiteLink } from "@/components/site/SiteLink";
import { whatsappUrl } from "@/lib/contact";
import { BookingPanel } from "@/components/site/BookingPanel";
import { MENTORING } from "@/lib/data/catalog";
import { publicPricing } from "@/lib/services/learning/public-catalog";
import { getPageContent } from "@/lib/site/content";
import { mentoringPage } from "@/lib/site/pages/mentoring";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  const c = await getPageContent(mentoringPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/mentoring" });
}

export const revalidate = 300;

export default async function MentoringPage() {
  const [{ mentoring }, c] = await Promise.all([publicPricing(), getPageContent(mentoringPage)]);
  const wa = whatsappUrl();
  const options = mentoring.map((m) => {
    const info = MENTORING.find((x) => `mentoring-${x.id}` === m.sku);
    return { sku: m.sku, name: m.name, amount: m.amount, minutes: info?.minutes ?? null, who: info?.who ?? m.description };
  });
  return (
    <>
      <PageHeader
        eyebrow={c.header.eyebrow}
        title={c.header.title}
        lead={c.header.lead}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <div>
            <ol className="border-t border-border">
              {c.steps.items.map((step, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-border py-5">
                  <span className="text-data text-[13px] font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 className="text-[16px] font-semibold">{step.title}</h2>
                    <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {c.notFor.show && (
              <div className="mt-8 site-card p-5">
                <h2 className="text-[14px] font-semibold">{c.notFor.title}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {c.notFor.items.map((n, i) => (
                    <li key={i} className="text-micro leading-relaxed text-muted-foreground">
                      {n}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-border pt-3 text-micro leading-relaxed text-muted-foreground">
                  {c.notFor.note}
                </p>
              </div>
            )}
          </div>

          <BookingPanel options={options} copy={c.booking} />
        </div>
      </Section>

      {c.closing.show && (
        <Section tint>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">
                {c.closing.title}
              </h2>
              <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
                {c.closing.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {wa ? (
                <a
                  href={wa}
                  className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  {c.closing.whatsapp}
                </a>
              ) : (
                <SiteLink
                  link={c.closing.question}
                  className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
                />
              )}
              <SiteLink
                link={c.closing.pricing}
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              />
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
