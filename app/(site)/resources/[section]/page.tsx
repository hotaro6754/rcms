import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { publicEntries } from "@/lib/services/cms/library";
import { sectionByPath } from "@/lib/library-sections";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const s = sectionByPath((await params).section);
  return { title: s?.title ?? "Resources", description: s?.lead };
}

export default async function SectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ q?: string }> }) {
  const s = sectionByPath((await params).section);
  if (!s) notFound();
  const { q } = await searchParams;
  const items = await publicEntries(s.kind, q);
  const glossary = s.kind === "GLOSSARY";
  const groups = glossary ? Object.entries(Object.groupBy(items, (i) => (/[a-z]/i.test(i.title[0]) ? i.title[0].toUpperCase() : "#"))).sort(([a], [b]) => a.localeCompare(b)) : [];

  return (
    <>
      <PageHeader eyebrow="Resources" title={s.title} lead={s.lead} />
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form role="search" className="flex max-w-md flex-1 gap-2">
            <input name="q" defaultValue={q} placeholder={`Search ${s.title.toLowerCase()}`} aria-label={`Search ${s.title}`} className="min-h-11 flex-1 border-b border-input bg-transparent text-[15px] outline-none focus:border-foreground" />
            <button className="min-h-11 rounded-[3px] border border-input px-4 text-[14px]">Search</button>
          </form>
          <Link href="/resources" className="text-[13px] underline underline-offset-4">
            All resources
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="mt-10 text-[14.5px] text-muted-foreground">{q ? "Nothing matches that search." : "Entries are being written and reviewed. Check back soon."}</p>
        ) : glossary ? (
          <>
            <nav aria-label="Letters" className="mt-8 flex flex-wrap gap-2 text-[13px]">
              {groups.map(([letter]) => (
                <a key={letter} href={`#letter-${letter}`} className="text-data rounded-[3px] border border-border px-2 py-1 hover:border-foreground">
                  {letter}
                </a>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-8">
              {groups.map(([letter, list]) => (
                <section key={letter} id={`letter-${letter}`} aria-label={letter}>
                  <h2 className="font-serif-display text-[2rem] leading-none">{letter}</h2>
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
                <Link href={`/resources/${s.path}/${i.slug}`} className="flex h-full flex-col rounded-[var(--radius)] border border-border bg-card p-5 transition-colors hover:border-foreground">
                  <span className="text-[1.1rem] leading-snug">{i.title}</span>
                  <span className="mt-2 text-[13.5px] text-muted-foreground">{i.summary}</span>
                  {i.tags.length > 0 && <span className="text-data mt-3 text-[11px] text-subtle">{i.tags.join(" · ")}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
