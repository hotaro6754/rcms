import { PageHeader } from "@/components/site/PageHeader";

export interface Clause {
  h: string;
  p: string[];
}

export function LegalPage({
  eyebrow,
  title,
  lead,
  updated,
  clauses,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  updated: string;
  clauses: Clause[];
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} lead={lead} />
      <section>
        <div className="mx-auto max-w-[1320px] px-6 py-16">
          <p className="text-data text-micro text-muted-foreground">Last updated {updated}</p>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,16rem)_minmax(0,44rem)]">
            <nav aria-label="On this page" className="hidden lg:block">
              <ol className="sticky top-24 flex flex-col gap-2 border-l border-border pl-4">
                {clauses.map((c, i) => (
                  <li key={c.h}>
                    <a
                      href={`#c-${i}`}
                      className="text-micro text-muted-foreground transition-colors hover:text-primary"
                    >
                      {c.h}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="flex flex-col gap-9">
              {clauses.map((c, i) => (
                <section key={c.h} id={`c-${i}`} className="scroll-mt-24">
                  <h2 className="text-[1.25rem] leading-snug">{c.h}</h2>
                  {c.p.map((para) => (
                    <p
                      key={para.slice(0, 40)}
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
