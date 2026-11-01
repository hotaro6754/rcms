import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, FileText, GitBranch, Library, Wrench } from "lucide-react";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { publicCounts, publicEntries } from "@/lib/services/cms/library";
import { SECTIONS } from "@/lib/library-sections";
import { SiteLink } from "@/components/site/SiteLink";
import { getPageContent } from "@/lib/site/content";
import { resourcesPage } from "@/lib/site/pages/resources";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  const c = await getPageContent(resourcesPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/resources" });
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
        <form role="search" className="flex max-w-xl flex-col gap-2 sm:flex-row">
          <input name="q" defaultValue={q} placeholder={c.search.placeholder} aria-label="Search the library" className="min-h-12 flex-1 rounded-md border border-input bg-background px-4 text-[15px] outline-none focus:border-foreground" />
          <button className="min-h-12 rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary-hover">{c.search.button}</button>
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
              <Link href={`/resources/${s.path}`} data-interactive className="site-card group flex h-full flex-col p-6">
                <SectionIcon kind={s.kind} />
                <span className="mt-4 text-[1.15rem] font-bold leading-tight">{c.sections[s.kind].title}</span>
                <span className="mt-2 text-[13.5px] text-muted-foreground">{c.sections[s.kind].lead}</span>
                <span className="mt-auto flex items-center justify-between pt-5 text-[13px]">
                  <span className="tabular text-subtle">
                    {counts[s.kind] ?? 0} {c.sections.entriesLabel}
                  </span>
                  <ArrowRight aria-hidden className="h-4 w-4 text-brand transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
          {c.tests.show && (
            <li>
              <SiteLink link={c.tests.link} data-interactive className="site-card group flex h-full flex-col p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <ClipboardCheck aria-hidden className="h-5 w-5" />
                </span>
                <span className="mt-4 text-[1.15rem] font-bold leading-tight">{c.tests.link.label}</span>
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

/** One icon per library section, so the sections can be told apart at a glance. */
const ICONS: Record<string, typeof BookOpen> = { GLOSSARY: BookOpen, PROCESS: GitBranch, CASE_STUDY: FileText, TOOLKIT: Wrench };
function SectionIcon({ kind }: { kind: string }) {
  const Icon = ICONS[kind] ?? Library;
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
      <Icon aria-hidden className="h-5 w-5" />
    </span>
  );
}
