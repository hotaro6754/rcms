import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { publicCounts, publicEntries } from "@/lib/services/cms/library";
import { SECTIONS, sectionByKind } from "@/lib/library-sections";

export const metadata = { title: "Resources", description: "Glossary, RCM process library, case studies, leadership toolkit and practice tests. Reviewed, dated, synthetic examples only." };
export const revalidate = 300;

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [counts, results] = await Promise.all([publicCounts(), q?.trim() ? publicEntries(undefined, q) : Promise.resolve(null)]);
  return (
    <>
      <PageHeader eyebrow="Resources" title="Reference you can trust." lead="Every entry is reviewed by someone other than its author, dated, and lists the sources it relies on. Examples are synthetic: no real patient, provider or payer data." />
      <Section>
        <form role="search" className="flex max-w-xl gap-2">
          <input name="q" defaultValue={q} placeholder="Search terms, processes and case studies" aria-label="Search the library" className="min-h-11 flex-1 border-b border-input bg-transparent text-[15px] outline-none focus:border-foreground" />
          <button className="min-h-11 rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground">Search</button>
        </form>
        {results && (
          <div className="mt-8">
            <p className="label-caps">{results.length} result{results.length === 1 ? "" : "s"}</p>
            <ul className="mt-3 divide-y divide-border">
              {results.map((r) => (
                <li key={r.slug} className="py-3">
                  <Link href={`/resources/${sectionByKind(r.kind).path}/${r.slug}`} className="text-[15px] font-medium hover:underline">
                    {r.title}
                  </Link>
                  <span className="ml-2 text-micro text-muted-foreground">{sectionByKind(r.kind).title}</span>
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
                <span className="text-[1.2rem] leading-tight">{s.title}</span>
                <span className="mt-2 text-[13.5px] text-muted-foreground">{s.lead}</span>
                <span className="text-data mt-4 text-micro text-subtle">{counts[s.kind] ?? 0} entries</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/resources/tests" className="flex h-full flex-col rounded-[var(--radius)] border border-border bg-card p-6 transition-colors hover:border-foreground">
              <span className="text-[1.2rem] leading-tight">Tests and assessments</span>
              <span className="mt-2 text-[13.5px] text-muted-foreground">What each course assesses, how long it takes and what it takes to pass.</span>
            </Link>
          </li>
        </ul>
        <p className="mt-10 text-[13px] text-muted-foreground">
          How content is reviewed: <Link href="/legal/content-governance" className="underline underline-offset-4">content review and governance policy</Link>.
        </p>
      </Section>
    </>
  );
}
