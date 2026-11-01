import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A section of the homepage: one consistent container, a numbered label above the content
 * ("02 · The cycle") and a surface chosen from a small set, so the page reads as a sequence of
 * clearly bounded sections rather than one long scroll.
 *
 * Headings stay with each section, which sets its own layout under the label.
 */
export function Chapter({
  id,
  folio,
  title,
  surface = "white",
  className,
  innerClassName,
  children,
  "data-env": dataEnv,
}: {
  id?: string;
  folio: string;
  title: string;
  surface?: "white" | "tint" | "navy";
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  "data-env"?: string;
}) {
  const env = surface === "tint" ? "env-tint" : surface === "navy" ? "env-ink" : "";
  return (
    <section id={id} data-env={dataEnv} aria-label={title} className={cn("relative border-t border-border bg-background", env, className)}>
      <div className={cn("mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:py-24", innerClassName)}>
        <p className="eyebrow mb-5 flex items-center gap-2">
          <span className="tabular text-subtle">{folio}</span>
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-40" />
          {title}
        </p>
        {children}
      </div>
    </section>
  );
}

/** A section's heading row: the heading on the left, its introduction on the right on wide screens. */
export function SectionIntro({ title, lead, children, className }: { title: ReactNode; lead?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16", className)}>
      <h2 data-reveal className="max-w-[22ch] text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.1]">
        {title}
      </h2>
      {(lead || children) && (
        <div data-reveal className="max-w-[56ch] text-[16px] leading-relaxed text-muted-foreground">
          {lead && <p>{lead}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
