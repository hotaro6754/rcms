import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A chapter of the homepage, laid out like a page of a technical publication: a narrow
 * gutter carrying the running folio ("02 / The cycle"), which stays in the margin while
 * the chapter is read, and the chapter's own composition in the measure beside it.
 *
 * Headings are deliberately NOT part of this component. Each chapter sets its own, at its
 * own scale and position; the folio is the only thing that repeats, the way a running head
 * repeats in a book.
 */
export function Chapter({
  id,
  folio,
  title,
  surface = "desk",
  className,
  innerClassName,
  children,
  "data-env": dataEnv,
}: {
  id?: string;
  folio: string;
  title: string;
  surface?: "desk" | "sheet" | "charcoal" | "ink";
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  "data-env"?: string;
}) {
  const env = surface === "sheet" ? "env-sheet" : surface === "charcoal" ? "env-charcoal" : surface === "ink" ? "env-ink" : "";
  return (
    <section id={id} data-env={dataEnv} className={cn("relative bg-background", env, className)}>
      <div className={cn("mx-auto grid max-w-[1320px] gap-x-10 gap-y-8 px-6 py-24 lg:grid-cols-[9.5rem_minmax(0,1fr)] lg:py-32", innerClassName)}>
        <div className="lg:relative">
          <p className="text-data text-[11px] tracking-[0.12em] text-subtle lg:sticky lg:top-24">
            <span className="text-foreground">{folio}</span>
            <span aria-hidden="true" className="mx-1.5">/</span>
            {title.toUpperCase()}
          </p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
