import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The homepage's one section header. An index and a kicker on a hairline, a serif headline
 * with its emphasis in italic, and an optional lead set against the headline's baseline.
 * Every section opening the same way is what makes ten sections read as one piece.
 *
 * `data-reveal` hands the entrance to the page-wide GSAP reveal in HeroSequence.
 */
export function SectionHead({
  index,
  kicker,
  title,
  lead,
  className,
  titleClassName,
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-8",
        lead && "lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-end lg:gap-16",
        className,
      )}
    >
      <div>
        <p data-reveal className="label-caps flex items-center gap-3">
          <span className="text-brand">{index}</span>
          <span aria-hidden="true" className="h-px w-8 bg-input" />
          {kicker}
        </p>
        <h2
          data-reveal
          className={cn("mt-6 max-w-[17ch] text-[clamp(2.3rem,4.4vw,3.8rem)] leading-[1.02]", titleClassName)}
        >
          {title}
        </h2>
      </div>
      {lead && (
        <p data-reveal className="max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
          {lead}
        </p>
      )}
    </div>
  );
}
