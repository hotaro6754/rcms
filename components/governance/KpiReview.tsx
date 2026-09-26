"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import {
  METRICS,
  formatValue,
  health,
  variance,
  type MetricId,
} from "@/lib/data/telemetry";
import { REVIEW_METRICS } from "@/lib/data/governance";
import { TelemetryChart } from "@/components/dashboard/TelemetryChart";
import { StatusChip } from "@/components/dashboard/StatusIndicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { money, signed } from "@/lib/utils";

/**
 * GSAP-owned subtree. One ScrollTrigger timeline draws every series in the grid — never one
 * trigger per chart. Motion must not touch anything inside [data-gsap-scope].
 */
export function KpiReview() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root.current);
      const paths = q(".series-path");
      const ends = q(".series-end");
      if (!paths.length) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.set(paths, { drawSVG: "0%" });
      gsap.set(ends, { autoAlpha: 0, scale: 0, transformOrigin: "center" });

      // Draws once, when the charts first come into view, and stays drawn. Never rewinds:
      // a chart that empties itself behind the reader looks broken, not clever.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top 88%",
          once: true,
        },
      });

      tl.to(paths, { drawSVG: "100%", duration: 0.85, ease: EASE.signal, stagger: 0.07 }).to(
        ends,
        { autoAlpha: 1, scale: 1, duration: 0.3, ease: EASE.exec, stagger: 0.07 },
        "-=0.55",
      );

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        ScrollTrigger.refresh();
      };
    },
    { scope: root },
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The table is the review. The charts support it. */}
      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
        <Table className="min-w-[62rem]">
          <TableHeader>
            <TableRow>
              <TableHead className="label-caps px-4">Metric</TableHead>
              <TableHead className="label-caps px-4 text-right">Target</TableHead>
              <TableHead className="label-caps px-4 text-right">Actual</TableHead>
              <TableHead className="label-caps px-4 text-right">Variance</TableHead>
              <TableHead className="label-caps px-4">Trend</TableHead>
              <TableHead className="label-caps px-4 text-right">Financial impact</TableHead>
              <TableHead className="label-caps px-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {REVIEW_METRICS.map((id: MetricId) => {
              const m = METRICS[id];
              const v = variance(m);
              const s = health(m);
              const good = s === "on-target";
              return (
                <TableRow key={id}>
                  <TableCell className="px-4 text-[13.5px] font-medium">{m.label}</TableCell>
                  <TableCell className="text-data px-4 text-right text-[13.5px] text-muted-foreground">
                    {formatValue(m, m.target)}
                  </TableCell>
                  <TableCell className="text-data px-4 text-right text-[13.5px] font-medium">
                    {formatValue(m)}
                  </TableCell>
                  <TableCell
                    className={`text-data px-4 text-right text-[13.5px] ${
                      good ? "text-success" : "text-danger"
                    }`}
                  >
                    {signed(v, m.precision)}
                  </TableCell>
                  <TableCell className="px-4 text-micro text-muted-foreground">
                    {m.series[0]} → {m.series[m.series.length - 1]}
                  </TableCell>
                  <TableCell className="text-data px-4 text-right text-[13.5px] text-muted-foreground">
                    {m.narrative.financialImpact ? money(m.narrative.financialImpact) : "—"}
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusChip status={s} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div ref={root} data-gsap-scope className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REVIEW_METRICS.slice(0, 6).map((id) => {
          const m = METRICS[id];
          return (
            <Card key={id} className="gap-0 py-0">
              <CardHeader className="gap-0 px-4 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium">{m.label}</span>
                  <span className="text-data text-micro text-muted-foreground">
                    {formatValue(m)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3">
                <TelemetryChart metric={m} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
