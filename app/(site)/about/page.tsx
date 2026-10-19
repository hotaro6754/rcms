import { SiteLink } from "@/components/site/SiteLink";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { getPageContent } from "@/lib/site/content";
import { aboutPage } from "@/lib/site/pages/about";

export async function generateMetadata() {
  const c = await getPageContent(aboutPage);
  return { title: c.seo.title, description: c.seo.description };
}

export default async function AboutPage() {
  const c = await getPageContent(aboutPage);
  return (
    <>
      <PageHeader
        eyebrow={c.header.eyebrow}
        title={c.header.title}
        lead={c.header.lead}
      />

      <Section tint>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div>
            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <p className="label-caps">{c.founder.label}</p>
              <h2 className="mt-3 text-[1.6rem] leading-tight">
                {c.founder.name}
              </h2>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                {c.founder.role}
              </p>
              <dl className="mt-6 flex flex-col gap-4 border-t border-border pt-5">
                <div>
                  <dt className="label-caps text-[11px]">
                    {c.founder.experienceLabel}
                  </dt>
                  <dd className="text-data mt-1.5 text-2xl font-medium leading-none">
                    {c.founder.experience}
                  </dd>
                </div>
                <div>
                  <dt className="label-caps text-[11px]">
                    {c.founder.focusLabel}
                  </dt>
                  <dd className="mt-1.5 text-[13.5px]">{c.founder.focus}</dd>
                </div>
              </dl>
              <SiteLink
                link={c.founder.cta}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              />
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-[1.6rem] leading-tight">{c.career.title}</h2>
              <dl className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2">
                {c.career.items.map((item, i) => (
                  <div key={i} className="bg-card p-5">
                    <dt className="text-[14px] font-semibold">{item.title}</dt>
                    <dd className="mt-2 text-micro leading-relaxed text-muted-foreground">
                      {item.body}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <h3 className="text-[15px] font-semibold">{c.why.title}</h3>
              {c.why.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`${i ? "mt-4" : "mt-3"} max-w-[68ch] text-[13.5px] leading-relaxed text-secondary-foreground`}
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {c.beliefs.show && (
        <Section title={c.beliefs.title} lead={c.beliefs.lead}>
          <div className="grid gap-4 md:grid-cols-2">
            {c.beliefs.items.map((b, i) => (
              <article
                key={i}
                className="rounded-[var(--radius)] border border-border bg-card p-6"
              >
                <span className="text-data text-micro font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-[1.15rem] leading-snug">{b.title}</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                  {b.body}
                </p>
              </article>
            ))}
          </div>
        </Section>
      )}

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
              <SiteLink
                link={c.closing.primary}
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              />
              <SiteLink
                link={c.closing.secondary}
                className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
              />
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
