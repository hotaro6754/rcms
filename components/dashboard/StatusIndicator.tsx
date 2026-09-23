import { cn } from "@/lib/utils";
import type { Health } from "@/lib/data/telemetry";

const TONE: Record<Health, { dot: string; chip: string; label: string }> = {
  "on-target": { dot: "bg-success", chip: "bg-success-bg text-success", label: "On target" },
  "at-risk": { dot: "bg-warning", chip: "bg-warning-bg text-warning", label: "At risk" },
  breach: { dot: "bg-danger", chip: "bg-danger-bg text-danger", label: "Breach" },
};

/**
 * Pulses only when the state is genuinely degraded. A dashboard that always pulses teaches
 * the operator to stop looking at it.
 */
export function StatusDot({ status, className }: { status: Health; className?: string }) {
  const degraded = status === "breach";
  return (
    <span className={cn("relative inline-flex h-2 w-2 shrink-0", className)}>
      {degraded && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-[2px] bg-danger opacity-60" />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-[2px]", TONE[status].dot)} />
    </span>
  );
}

export function StatusChip({
  status,
  children,
  className,
}: {
  status: Health;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] px-2 py-0.5 text-micro font-semibold",
        TONE[status].chip,
        className,
      )}
    >
      {children ?? TONE[status].label}
    </span>
  );
}

export const statusLabel = (s: Health) => TONE[s].label;
