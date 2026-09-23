import {
  PERIODS,
  deltaIsGood,
  formatValue,
  health,
  type Metric,
} from "@/lib/data/telemetry";

function scale(series: number[], w: number, h: number, pad = 2) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  return series.map((v, i) => ({
    v,
    x: +((i / (series.length - 1)) * w).toFixed(2),
    y: +(h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(2),
  }));
}

/** Inline trend for a MetricCard. Static, with the endpoint emphasised. */
export function Sparkline({ metric }: { metric: Metric }) {
  const w = 74;
  const h = 26;
  const pts = scale(metric.series, w, h);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const good = deltaIsGood(metric);
  const stroke = good ? "var(--chart-3)" : "var(--chart-5)";
  const end = pts[pts.length - 1];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={end.x} cy={end.y} r={2.5} fill={stroke} />
    </svg>
  );
}

/**
 * Full series chart for the KPI review. The `.series-path` hook is drawn in by the section's
 * single ScrollTrigger timeline — one timeline for the whole grid, never one per chart.
 */
export function TelemetryChart({ metric }: { metric: Metric }) {
  const W = 260;
  const H = 96;
  const PAD = { l: 34, r: 8, t: 10, b: 20 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const min = Math.min(...metric.series, metric.target);
  const max = Math.max(...metric.series, metric.target);
  const span = max - min || 1;
  const x = (i: number) => PAD.l + (i / (metric.series.length - 1)) * iw;
  const y = (v: number) => PAD.t + (1 - (v - min) / span) * ih;

  const d = metric.series.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const status = health(metric);
  const stroke = status === "breach" ? "var(--chart-5)" : "var(--chart-1)";
  const last = metric.series[metric.series.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${metric.label}: ${metric.series.map((v, i) => `${PERIODS[i]} ${formatValue(metric, v)}`).join(", ")}. Target ${formatValue(metric, metric.target)}.`}>
      {/* target line, labelled with a value the chart actually reaches */}
      <line
        x1={PAD.l}
        y1={y(metric.target)}
        x2={W - PAD.r}
        y2={y(metric.target)}
        stroke="var(--chart-4)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text
        x={PAD.l - 6}
        y={y(metric.target) + 4}
        textAnchor="end"
        fontFamily="var(--font-mono)"
        fontSize={10}
        fill="var(--chart-4)"
      >
        {formatValue(metric, metric.target)}
      </text>

      {[0, metric.series.length - 1].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 6}
          textAnchor={i === 0 ? "start" : "end"}
          fontFamily="var(--font-mono)"
          fontSize={10}
          fill="var(--subtle)"
        >
          {PERIODS[i]}
        </text>
      ))}

      <path
        className="series-path"
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        className="series-end"
        cx={x(metric.series.length - 1)}
        cy={y(last)}
        r={3}
        fill={stroke}
      />
    </svg>
  );
}
