import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { publicCounts, publicEntries } from "@/lib/services/cms/library";
import { SECTIONS } from "@/lib/library-sections";
import { SiteLink } from "@/components/site/SiteLink";
import { getPageContent } from "@/lib/site/content";
import { resourcesPage } from "@/lib/site/pages/resources";

export async function generateMetadata() {
  const c = await getPageContent(resourcesPage);
  return { title: c.seo.title, description: c.seo.description };
}
export const revalidate = 300;

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [counts, results, c] = await Promise.all([publicCounts(), q?.trim() ? publicEntries(undefined, q) : Promise.resolve(null), getPageContent(resourcesPage)]);
  const pathOf = (kind: keyof typeof c.sections) => SECTIONS.find((s) => s.kind === kind)!.path;
  return (
    <>
      <PageHeader eyebrow={c.header.eyebrow} title={c.header.title} lead={c.header.lead} />
      <Section>
        <form role="search" className="flex max-w-xl gap-2">
          <input name="q" defaultValue={q} placeholder={c.search.placeholder} aria-label="Search the library" className="min-h-11 flex-1 border-b border-input bg-transparent text-[15px] outline-none focus:border-foreground" />
          <button className="min-h-11 rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground">{c.search.button}</button>
        </form>
        {results && (
          <div className="mt-8">
            <p className="label-caps">{results.length} {results.length === 1 ? c.search.resultOne : c.search.resultMany}</p>
            <ul className="mt-3 divide-y divide-border">
              {results.map((r) => (
                <li key={r.slug} className="py-3">
                  <Link href={`/resources/${pathOf(r.kind)}/${r.slug}`} className="text-[15px] font-medium hover:underline">
                    {r.title}
                  </Link>
                  <span className="ml-2 text-micro text-muted-foreground">{c.sections[r.kind].title}</span>
                  <p className="text-[13.5px] text-muted-foreground">{r.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SECTIONS.map((s) => (
            <li key={s.path}>
              <Link href={`/resources/${s.path}`} className="flex h-full flex-col rounded-[var(--radius)] border border-border bg-card p-6 transition-colors hover:border-foreground">
                <span className="text-[1.2rem] leading-tight">{c.sections[s.kind].title}</span>
                <span className="mt-2 text-[13.5px] text-muted-foreground">{c.sections[s.kind].lead}</span>
                <span className="text-data mt-4 text-micro text-subtle">
                  {counts[s.kind] ?? 0} {c.sections.entriesLabel}
                </span>
              </Link>
            </li>
          ))}
          {c.tests.show && (
            <li>
              <SiteLink link={c.tests.link} className="flex h-full flex-col rounded-[var(--radius)] border border-border bg-card p-6 transition-colors hover:border-foreground">
                <span className="text-[1.2rem] leading-tight">{c.tests.link.label}</span>
                <span className="mt-2 text-[13.5px] text-muted-foreground">{c.tests.body}</span>
              </SiteLink>
            </li>
          )}
        </ul>
        {c.governance.show && (
          <p className="mt-10 text-[13px] text-muted-foreground">
            {c.governance.before} <SiteLink link={c.governance.link} className="underline underline-offset-4" />
            {c.governance.after}
          </p>
        )}
      </Section>
    </>
  );
}
