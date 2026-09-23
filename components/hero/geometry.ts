import { LIFECYCLE, METRICS } from "@/lib/data/telemetry";

/**
 * One coordinate system for the whole hero drawing.
 *
 * The queue block deliberately occupies the left of the territory the metric line will
 * cross. That is the point of the `break` beat: the queue does not vanish, six of its nodes
 * travel to the vertices of the metric and the line is drawn through them. Both components
 * import these numbers so the landing positions cannot drift apart.
 *
 * Proportions are tuned so the drawing reads at hero size without a dead band in the
 * middle: lifecycle rail near the top, plot occupying the lower two-thirds.
 */

export const VIEW = { w: 720, h: 400 } as const;

/** Claim lifecycle rail. */
export const FLOW = {
  y: 84,
  x0: 56,
  x1: 664,
} as const;

export const STAGES = LIFECYCLE.map((stage, i) => ({
  ...stage,
  x: FLOW.x0 + (i * (FLOW.x1 - FLOW.x0)) / (LIFECYCLE.length - 1),
  y: FLOW.y,
}));

/** The path claim nodes travel. */
export const FLOW_PATH = `M ${FLOW.x0} ${FLOW.y} L ${FLOW.x1} ${FLOW.y}`;

/** Plot box for the metric line. */
export const PLOT = { x0: 56, x1: 664, y0: 196, y1: 336 } as const;

const METRIC = METRICS["days-in-ar"];
const DOMAIN = { min: 34, max: 54 };

const yFor = (value: number) =>
  +(PLOT.y1 - ((value - DOMAIN.min) / (DOMAIN.max - DOMAIN.min)) * (PLOT.y1 - PLOT.y0)).toFixed(2);

export const metricPoints = METRIC.series.map((value, i) => ({
  value,
  x: +(PLOT.x0 + (i / (METRIC.series.length - 1)) * (PLOT.x1 - PLOT.x0)).toFixed(2),
  y: yFor(value),
}));

/**
 * Catmull-Rom through the vertices, converted to cubic beziers. The curve has to pass
 * exactly through every point, because the surviving queue nodes land on them.
 */
function smoothPath(pts: { x: number; y: number }[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export const metricPath = smoothPath(metricPoints);

/** Closed shape for the area fill beneath the line. */
export const metricArea = `${metricPath} L ${PLOT.x1} ${PLOT.y1} L ${PLOT.x0} ${PLOT.y1} Z`;

export const metricEnd = metricPoints[metricPoints.length - 1];

/** Horizontal reference: the contractual target, drawn where the chart actually reaches it. */
export const TARGET_LINE = { value: METRIC.target, y: yFor(METRIC.target) };

/** Value axis ticks, each one a number the chart genuinely passes through. */
export const Y_TICKS = [36, 42, 48, 54].map((v) => ({ v, y: yFor(v) }));

/** Queue block: 40 nodes, 8 across. Capped deliberately — MotionPath on hundreds is the trap. */
export const QUEUE = {
  cols: 8,
  rows: 5,
  cell: 24,
  x: 66,
  y: 206,
} as const;

export const QUEUE_NODE_COUNT = QUEUE.cols * QUEUE.rows;

export const queueNodes = Array.from({ length: QUEUE_NODE_COUNT }, (_, i) => {
  const col = i % QUEUE.cols;
  const row = Math.floor(i / QUEUE.cols);
  /** Age rises as the block fills: the last arrivals are the ones that turned red. */
  const age = i / (QUEUE_NODE_COUNT - 1);
  return {
    i,
    x: QUEUE.x + col * QUEUE.cell,
    y: QUEUE.y + row * QUEUE.cell,
    age,
    tone: age > 0.72 ? "danger" : age > 0.42 ? "warning" : "ok",
  } as const;
});

/**
 * Six survivors, one per metric vertex, spread across the block so the recompose reads as
 * the whole queue reorganising rather than one corner peeling off.
 */
export const SURVIVOR_INDICES = [2, 9, 17, 24, 31, 38];

export const survivorTargets = SURVIVOR_INDICES.map((nodeIndex, vertex) => ({
  nodeIndex,
  ...metricPoints[vertex],
}));

/** Blueprint rules. Engineering diagram, not a HUD: sparse, aligned to the real plot box. */
export const BLUEPRINT = {
  verticals: [FLOW.x0, 208, 360, 512, FLOW.x1],
  horizontals: [FLOW.y, PLOT.y0, PLOT.y1],
  ticks: Array.from({ length: 13 }, (_, i) => FLOW.x0 + (i * (FLOW.x1 - FLOW.x0)) / 12),
} as const;
