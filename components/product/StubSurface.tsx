import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * A polished stub, not a placeholder. Each secondary route states what it will hold, shows the
 * real figures that already exist for it, and routes the operator to the surface that is built.
 * No broken navigation and no lorem.
 */
export function StubSurface({
  title,
  summary,
  facts,
  planned,
}: {
  title: string;
  summary: string;
  facts: { label: string; value: string; note?: string }[];
  planned: string[];
}) {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <header className="max-w-[68ch]">
        <p className="label-caps">Operations console</p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">{title}</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{summary}</p>
      </header>

      <dl className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-card p-4">
            <dt className="label-caps text-[11px]">{f.label}</dt>
            <dd className="text-data mt-2.5 text-[26px] font-medium leading-none">{f.value}</dd>
            {f.note && <p className="mt-2 text-micro text-muted-foreground">{f.note}</p>}
          </div>
        ))}
      </dl>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4">
        <h2 className="text-[13.5px] font-semibold">Planned for this surface</h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {planned.map((p) => (
            <li key={p} className="flex gap-2.5 text-micro leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-[1px] bg-primary" />
              {p}
            </li>
          ))}
        </ul>
        <Link
          href="/governance"
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Go to the Governance Room
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
