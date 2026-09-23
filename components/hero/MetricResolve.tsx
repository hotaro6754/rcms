"use client";

import { METRICS, PERIODS } from "@/lib/data/telemetry";
import {
  PLOT,
  TARGET_LINE,
  VIEW,
  Y_TICKS,
  metricArea,
  metricEnd,
  metricPath,
  metricPoints,
} from "./geometry";

const M = METRICS["days-in-ar"];

/**
 * The metric line, drawn as a real chart rather than a bare polyline: a value axis whose
 * every label is a number the series actually passes through, the contractual target where
 * the chart reaches it, an area fill for weight, and an emphasised endpoint.
 *
 * The line runs through the six vertices the surviving queue nodes travel to, so it is
 * literally assembled out of the queue rather than replacing it.
 */
export function MetricLine() {
  const first = metricPoints[0];
  const last = metricPoints[metricPoints.length - 1];

  return (
    <g className="metric-group">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Quiet value axis. Every label is a number the series passes through. */}
      {Y_TICKS.map((t) => (
        <g key={t.v} className="metric-axis">
          <line
            x1={PLOT.x0}
            y1={t.y}
            x2={PLOT.x1}
            y2={t.y}
            stroke="var(--border)"
            strokeOpacity={0.7}
          />
          <text
            x={PLOT.x0 - 12}
            y={t.y + 4}
            textAnchor="end"
            fontFamily="var(--font-mono)"
            fontSize={11}
            fill="var(--subtle)"
          >
            {t.v}
          </text>
        </g>
      ))}

      <g className="metric-axis">
        <line
          x1={PLOT.x0}
          y1={TARGET_LINE.y}
          x2={PLOT.x1}
          y2={TARGET_LINE.y}
          stroke="var(--chart-4)"
          strokeWidth={1.25}
          strokeDasharray="5 4"
        />
        <text
          x={PLOT.x1}
          y={TARGET_LINE.y - 9}
          textAnchor="end"
          fontFamily="var(--font-sans)"
          fontSize={11.5}
          fontWeight={500}
          fill="var(--chart-4)"
        >
          Target {TARGET_LINE.value} days
        </text>
      </g>

      <path className="metric-area" d={metricArea} fill="url(#areaFill)" />

      <path
        className="metric-path"
        d={metricPath}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {metricPoints.map((p, i) => (
        <g key={p.x} className="metric-vertex">
          <circle cx={p.x} cy={p.y} r={2.5} fill="var(--card)" stroke="var(--chart-1)" strokeWidth={1.75} />
          <text
            x={p.x}
            y={PLOT.y1 + 22}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={11}
            fill="var(--subtle)"
          >
            {PERIODS[i]}
          </text>
        </g>
      ))}

      {/* Where the eye lands: what it was, what it is, and the distance between. */}
      <g className="metric-callout">
        <text
          x={first.x}
          y={first.y - 14}
          fontFamily="var(--font-mono)"
          fontSize={12}
          fill="var(--subtle)"
        >
          {first.value}
        </text>
        <circle cx={last.x} cy={last.y} r={6} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2.5} />
        <text
          x={last.x}
          y={last.y - 18}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize={19}
          fontWeight={600}
          fill="var(--chart-1)"
        >
          {last.value}
        </text>
        <text
          x={last.x}
          y={last.y - 4}
          textAnchor="end"
          fontFamily="var(--font-sans)"
          fontSize={11.5}
          fill="var(--success)"
        >
          &minus;{first.value - last.value} days
        </text>
      </g>

      <text
        className="metric-caption"
        x={PLOT.x0}
        y={PLOT.y0 - 16}
        fontFamily="var(--font-mono)"
        fontSize={11.5}
        fill="var(--subtle)"
      >
        {M.label} · trailing six periods
      </text>
    </g>
  );
}

/**
 * The KPI object: the second Flip source. What the hero resolves to is exactly what the
 * dashboard MetricCard renders, because both read METRICS["days-in-ar"].
 */
export function KpiObject() {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${((metricEnd.x - 152) / VIEW.w) * 100}%`,
        top: `${((metricEnd.y - 104) / VIEW.h) * 100}%`,
      }}
    >
      <div
        data-flip-id="days-in-ar"
        className="kpi-object inline-flex flex-col rounded-xl border border-primary/30 bg-card px-4 py-3 shadow-[var(--shadow-lift)]"
      >
        <span className="label-caps text-[11px] leading-none">{M.label}</span>
        <div className="mt-2.5 flex items-baseline gap-2">
          {/* Resolved value in the markup; the timeline rewinds it pre-paint. */}
          <span className="text-data text-[30px] font-medium leading-none text-foreground">
            <span className="kpi-value">{M.current}</span>
          </span>
          <span className="text-data text-xs text-muted-foreground">days</span>
        </div>
        <span className="text-data mt-2 text-micro text-primary">
          target {M.target} · from {M.before}
        </span>
      </div>
    </div>
  );
}
