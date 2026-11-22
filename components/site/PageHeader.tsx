import Image, { type StaticImageData } from "next/image";
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
 * introduction. Key pages also carry a 3D illustration from the RCMExcel set on the right, with a
 * slow float (still under reduced motion).
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
  art,
  artAlt = "",
}: {
  eyebrow: string;
  title: string;
  lead: string;
  /** Pages below the top level pass their trail (without "Home"). */
  crumbs?: Crumb[];
  children?: React.ReactNode;
  art?: StaticImageData;
  artAlt?: string;
}) {
  return (
    <header className="page-hero border-b border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:py-16">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className={art ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16" : undefined}>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 max-w-[20ch] text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1.04] tracking-[-0.025em]">{title}</h1>
            <p className="mt-5 max-w-[54ch] text-[16.5px] leading-relaxed text-muted-foreground">{lead}</p>
            {children && <div className="mt-8">{children}</div>}
          </div>
          {art && (
            <div className="page-hero-art" aria-hidden={artAlt ? undefined : true}>
              <Image src={art} alt={artAlt} priority placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="h-auto w-full" />
            </div>
          )}
        </div>
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
