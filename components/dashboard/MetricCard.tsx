import {
  deltaIsGood,
  formatValue,
  health,
  periodDelta,
  type Metric,
} from "@/lib/data/telemetry";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusDot } from "./StatusIndicator";
import { Sparkline } from "./TelemetryChart";
import { cn, money, signed } from "@/lib/utils";

const TONE = {
  "on-target": { label: "On target", cls: "border-transparent bg-success-bg text-success" },
  "at-risk": { label: "At risk", cls: "border-transparent bg-warning-bg text-warning" },
  breach: { label: "Breach", cls: "border-transparent bg-danger-bg text-danger" },
} as const;

/**
 * Built on shadcn's Card, Badge and Separator, restyled through the token contract so it
 * carries this identity rather than the stock neutral theme.
 *
 * Not a coloured tile. Every card answers six questions in order: what it is, what it
 * reads, what changed, whether that is good, why, and what happens next. A number without
 * the last two is a dashboard. With them it is operational intelligence.
 */
export function MetricCard({ metric, className }: { metric: Metric; className?: string }) {
  const status = health(metric);
  const delta = periodDelta(metric);
  const good = deltaIsGood(metric);
  const n = metric.narrative;
  const tone = TONE[status];

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <CardHeader className="gap-0 border-b border-border px-5 py-4 [.border-b]:pb-4">
        {/* 1 — what */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="label-caps truncate">{metric.label}</h3>
          <StatusDot status={status} />
        </div>

        {/* 2 — value, 3 — what changed, 4 — is that good */}
        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-data text-[32px] font-medium leading-none">
              {formatValue(metric)}
            </span>
            {metric.unit === "days" && (
              <span className="text-data text-xs text-muted-foreground">days</span>
            )}
          </div>
          <Sparkline metric={metric} />
        </div>

        <p
          className={cn(
            "text-data mt-3 text-micro font-medium",
            good ? "text-success" : "text-danger",
          )}
        >
          {delta === 0 ? "no change" : `${signed(delta)}%`}{" "}
          <span className="font-sans font-normal text-muted-foreground">vs prior period</span>
        </p>

        <div className="mt-3 flex items-center gap-3">
          <span className="text-data text-micro text-muted-foreground">
            Target {formatValue(metric, metric.target)}
            {metric.unit === "days" ? " days" : ""}
          </span>
          <Badge className={cn("ml-auto rounded-full text-micro font-semibold", tone.cls)}>
            {tone.label}
          </Badge>
        </div>
      </CardHeader>

      {/* 5 — why, and how much it matters */}
      <CardContent className="px-5 py-4">
        <p className="text-micro font-semibold">Primary driver</p>
        <p className="mt-1.5 text-micro leading-relaxed text-muted-foreground">{n.driver}</p>

        {(n.financialImpact || n.affectedClaims) && (
          <>
            <Separator className="my-3" />
            <p className="text-data text-micro text-muted-foreground">
              {n.affectedClaims ? `${n.affectedClaims.toLocaleString("en-US")} claims` : null}
              {n.affectedClaims && n.financialImpact ? " · " : null}
              {n.financialImpact ? money(n.financialImpact) : null}
            </p>
          </>
        )}
      </CardContent>

      {/* 6 — what next, and who owns it */}
      <CardFooter className="mt-auto flex-col items-start gap-1 border-t border-border bg-secondary/45 px-5 py-4 text-micro">
        <span className="text-muted-foreground">
          Owner <span className="font-semibold text-foreground">{n.owner}</span>
        </span>
        <span className="leading-relaxed text-muted-foreground">
          Next <span className="text-foreground">{n.nextAction}</span>
        </span>
      </CardFooter>
    </Card>
  );
}
