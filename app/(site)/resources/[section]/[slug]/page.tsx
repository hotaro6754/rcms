import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { Markdown } from "@/lib/cms/markdown";
import { publicEntry } from "@/lib/services/cms/library";
import { sectionByKind, sectionByPath } from "@/lib/library-sections";

export const revalidate = 300;

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = await publicEntry((await params).slug);
  return e ? { title: e.title, description: e.summary } : { title: "Not found" };
}

export default async function EntryPage({ params }: { params: Promise<{ section: string; slug: string }> }) {
  const { section, slug } = await params;
  const e = await publicEntry(slug);
  if (!e || sectionByPath(section)?.kind !== e.kind) notFound();
  const s = sectionByKind(e.kind);
  return (
    <>
      <PageHeader eyebrow={s.title} title={e.title} lead={e.summary} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="max-w-[68ch]">
            {e.body ? <Markdown text={e.body} className="flex flex-col gap-3 text-[15.5px] leading-relaxed" /> : null}
            {e.kind === "CASE_STUDY" && <p className="mt-6 border-l-2 border-brand pl-3 text-[13px] text-muted-foreground">This case study is synthetic and de-identified. Names, figures and organisations are invented for teaching.</p>}
          </article>
          <aside className="flex flex-col gap-5 text-[13px]">
            <div className="rounded-[var(--radius)] border border-border bg-card p-4">
              <p className="label-caps">Review</p>
              <p className="mt-2">{e.lastReviewedAt ? `Reviewed ${DATE.format(e.lastReviewedAt)}` : "Review date not recorded"}</p>
              {e.nextReviewAt && <p className="text-muted-foreground">Next review by {DATE.format(e.nextReviewAt)}</p>}
            </div>
            {e.sources.length > 0 && (
              <div className="rounded-[var(--radius)] border border-border bg-card p-4">
                <p className="label-caps">Sources</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {e.sources.map((src) => (
                    <li key={src}>{/^https:\/\//.test(src) ? <a href={src} rel="noopener noreferrer nofollow" target="_blank" className="break-all underline underline-offset-4">{src}</a> : src}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[12.5px] text-muted-foreground">
              Educational material, not payer policy or legal advice. See the <Link href="/legal/disclaimer" className="underline underline-offset-4">disclaimer</Link>. Spotted an error? <Link href="/contact" className="underline underline-offset-4">Tell us</Link>.
            </p>
            <Link href={`/resources/${s.path}`} className="underline underline-offset-4">
              ← {s.title}
            </Link>
          </aside>
        </div>
      </Section>
    </>
  );
}
