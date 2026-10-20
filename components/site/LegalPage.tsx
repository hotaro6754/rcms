import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import type { LegalContent } from "@/lib/site/pages/legal";
import { pageMeta } from "@/lib/seo";

/** Browser-tab title and search description for a legal page, from the website editor. */
export function legalMetadata(c: LegalContent, path: string): Metadata {
  return pageMeta({ title: c.seo.title, description: c.seo.description, path });
}

export function LegalPage({ content: c }: { content: LegalContent }) {
  return (
    <>
      <PageHeader eyebrow={c.header.eyebrow} title={c.header.title} lead={c.header.lead} />
      <section>
        <div className="mx-auto max-w-[1320px] px-6 py-16">
          <p className="text-data text-micro text-muted-foreground">{c.header.updated}</p>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,16rem)_minmax(0,44rem)]">
            <nav aria-label="On this page" className="hidden lg:block">
              <ol className="sticky top-24 flex flex-col gap-2 border-l border-border pl-4">
                {c.clauses.map((clause, i) => (
                  <li key={i}>
                    <a
                      href={`#c-${i}`}
                      className="text-micro text-muted-foreground transition-colors hover:text-primary"
                    >
                      {clause.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="flex flex-col gap-9">
              {c.clauses.map((clause, i) => (
                <section key={i} id={`c-${i}`} className="scroll-mt-24">
                  <h2 className="text-[1.25rem] leading-snug">{clause.heading}</h2>
                  {clause.paragraphs.map((para, j) => (
                    <p
                      key={j}
                      className="mt-3 text-[14px] leading-relaxed text-secondary-foreground"
                    >
                      {para}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
