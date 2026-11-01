import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { publicEntries } from "@/lib/services/cms/library";
import { sectionByPath } from "@/lib/library-sections";
import { SiteLink } from "@/components/site/SiteLink";
import { getPageContent } from "@/lib/site/content";
import { resourcesPage } from "@/lib/site/pages/resources";
import { resourcesSectionPage } from "@/lib/site/pages/resources-section";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const s = sectionByPath(section);
  const copy = s ? (await getPageContent(resourcesPage)).sections[s.kind] : null;
  return copy ? pageMeta({ title: copy.title, description: copy.lead, path: `/resources/${section}` }) : { title: "Resources" };
}

export default async function SectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ q?: string }> }) {
  const s = sectionByPath((await params).section);
  if (!s) notFound();
  const { q } = await searchParams;
  const [items, shared, c] = await Promise.all([publicEntries(s.kind, q), getPageContent(resourcesPage), getPageContent(resourcesSectionPage)]);
  const { title, lead } = shared.sections[s.kind];
  const glossary = s.kind === "GLOSSARY";
  const groups = glossary ? Object.entries(Object.groupBy(items, (i) => (/[a-z]/i.test(i.title[0]) ? i.title[0].toUpperCase() : "#"))).sort(([a], [b]) => a.localeCompare(b)) : [];

  return (
    <>
      <PageHeader eyebrow={c.header.eyebrow} title={title} lead={lead} crumbs={[{ label: shared.header.eyebrow || "Resources", href: "/resources" }, { label: title }]} />
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form role="search" className="flex max-w-md flex-1 gap-2">
            <input name="q" defaultValue={q} placeholder={`${c.search.placeholder} ${title.toLowerCase()}`} aria-label={`Search ${title}`} className="min-h-11 flex-1 rounded-md border border-input bg-background px-3 text-[15px] outline-none focus:border-foreground" />
            <button className="min-h-11 rounded-md bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover">{c.search.button}</button>
          </form>
          <SiteLink link={c.search.back} className="text-[13px] underline underline-offset-4" />
        </div>

        {items.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-input bg-[var(--surface-tint)] px-6 py-10 text-center text-[15px] text-muted-foreground">{q ? c.empty.noMatches : c.empty.noEntries}</p>
        ) : glossary ? (
          <>
            <nav aria-label="Letters" className="mt-8 flex flex-wrap gap-2 text-[13px]">
              {groups.map(([letter]) => (
                <a key={letter} href={`#letter-${letter}`} className="tabular flex h-9 min-w-9 items-center justify-center rounded-md border border-border bg-card px-2 font-semibold hover:border-brand hover:text-brand">
                  {letter}
                </a>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-8">
              {groups.map(([letter, list]) => (
                <section key={letter} id={`letter-${letter}`} aria-label={letter}>
                  <h2 className="text-[1.75rem] leading-none text-brand">{letter}</h2>
                  <dl className="mt-3 divide-y divide-border border-t border-border">
                    {list!.map((t) => (
                      <div key={t.slug} className="grid gap-1 py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6">
                        <dt className="text-[15px] font-medium">
                          <Link href={`/resources/${s.path}/${t.slug}`} className="hover:underline">
                            {t.title}
                          </Link>
                        </dt>
                        <dd className="text-[14px] leading-relaxed text-muted-foreground">{t.summary}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {items.map((i) => (
              <li key={i.slug}>
                <Link href={`/resources/${s.path}/${i.slug}`} data-interactive className="site-card flex h-full flex-col p-5">
                  <span className="text-[1.1rem] font-bold leading-snug">{i.title}</span>
                  <span className="mt-2 text-[13.5px] text-muted-foreground">{i.summary}</span>
                  {i.tags.length > 0 && <span className="mt-3 flex flex-wrap gap-1.5">{i.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[12px] text-subtle">{t}</span>)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
