import { notFound } from "next/navigation";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import type { LegalContent } from "@/lib/site/pages/legal";
import { POLICIES, policiesApproved, policyBySlug } from "@/lib/legal/policies";
import { pageMeta } from "@/lib/seo";

/** The specification's remaining public policies (lib/legal/policies.ts). */
export function generateStaticParams() {
  return POLICIES.map((p) => ({ policy: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ policy: string }> }) {
  const p = policyBySlug((await params).policy);
  if (!p) return {};
  return pageMeta({ title: p.title, description: p.summary, path: `/legal/${p.slug}` });
}

export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const p = policyBySlug((await params).policy);
  if (!p) notFound();
  // LegalPage reads only these fields of the editable legal-page content.
  const content = {
    seo: { title: p.title, description: p.summary },
    header: { eyebrow: "Legal", title: p.title, lead: p.summary, updated: p.docId ? `Document ${p.docId} · Version 1.0` : "Version 1.0" },
    clauses: p.clauses,
  } as unknown as LegalContent;
  return (
    <>
      {!policiesApproved() && (
        <p role="note" className="border-b border-warning/40 bg-warning-bg px-4 py-2.5 text-center text-[13px]">
          Draft policy pending legal review. Bracketed fields are placeholders.
        </p>
      )}
      <LegalPage content={content} />
      <nav aria-label="Other policies" className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6">
        <p className="text-data text-micro text-muted-foreground">OTHER POLICIES</p>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
          {POLICIES.filter((x) => x.slug !== p.slug).map((x) => (
            <li key={x.slug}>
              <Link href={`/legal/${x.slug}`} className="underline underline-offset-4 hover:text-primary">
                {x.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
