import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

/** Where this page sits: Home › Resources › Glossary. The last crumb is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ label: "Home", href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-subtle">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 opacity-60" />}
              {c.href && !last ? (
                <Link href={c.href} className="rounded-sm hover:text-foreground hover:underline hover:underline-offset-4">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-foreground" : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The top of every inner page: where it sits (breadcrumbs), a brand label, the title and its
 * introduction, on the tinted surface so each page opens the same way the homepage sections do.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  /** Pages below the top level pass their trail (without "Home"). */
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-[var(--surface-tint)]">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:py-16">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <p className="eyebrow">{eyebrow}</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <h1 className="max-w-[22ch] text-[clamp(2rem,4vw,3.25rem)] leading-[1.08]">{title}</h1>
          <p className="max-w-[56ch] text-[16px] leading-relaxed text-muted-foreground">{lead}</p>
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}

/** A section of an inner page: an optional heading row, then its content, in the shared container. */
export function Section({
  title,
  lead,
  children,
  tint,
}: {
  title?: string;
  lead?: string;
  children: React.ReactNode;
  tint?: boolean;
}) {
  return (
    <section className={`border-b border-border ${tint ? "bg-[var(--surface-tint)]" : ""}`}>
      <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:py-16">
        {(title || lead) && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
            {title && <h2 className="text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.12]">{title}</h2>}
            {lead && <p className="max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">{lead}</p>}
          </div>
        )}
        <div className={title || lead ? "mt-10" : ""}>{children}</div>
      </div>
    </section>
  );
}
