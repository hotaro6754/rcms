import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The RCMExcel wordmark: "RCM" in monospace capitals, "Excel" in the serif, set tight so it
 * reads as one word. Screen readers hear the name once.
 */
export function Wordmark({ className, size = "md", hideRestOnSmall = false }: { className?: string; size?: "sm" | "md" | "lg"; hideRestOnSmall?: boolean }) {
  const mono = { sm: "text-[11px]", md: "text-[13px]", lg: "text-[1.35cqw]" }[size];
  const serif = { sm: "text-[15px]", md: "text-[17px]", lg: "text-[1.9cqw]" }[size];
  return (
    <span className={cn("inline-flex items-baseline gap-[0.15em]", className)} aria-label={BRAND.name} role="img">
      <span aria-hidden className={cn("text-data font-semibold tracking-[0.18em]", mono)}>
        {BRAND.markShort}
      </span>
      <span aria-hidden className={cn("font-serif-display leading-none", serif, hideRestOnSmall && "hidden sm:inline")}>
        {BRAND.markRest}
      </span>
    </span>
  );
}
