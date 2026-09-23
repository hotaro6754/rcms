"use client";

import { QUEUE, VIEW, queueNodes } from "./geometry";
import { METRICS } from "@/lib/data/telemetry";

const TONE: Record<string, string> = {
  ok: "var(--chart-3)",
  warning: "var(--chart-4)",
  danger: "var(--chart-5)",
};

/**
 * The problem state. Forty claim nodes accumulate in a block, ageing green to amber to red
 * as the block fills, so "work is arriving faster than it clears" is legible without copy.
 *
 * Node count is capped at 40 on purpose. MotionPath across hundreds of nodes is the obvious
 * performance trap and buys nothing the eye can read.
 */
export function QueueNodes() {
  return (
    <g className="queue-field">
      <rect
        className="queue-frame"
        x={QUEUE.x - 14}
        y={QUEUE.y - 16}
        width={QUEUE.cols * QUEUE.cell + 14}
        height={QUEUE.rows * QUEUE.cell + 16}
        rx={6}
        fill="none"
        stroke="var(--border)"
        strokeWidth={1}
      />
      {queueNodes.map((node) => (
        <circle
          key={node.i}
          className="claim-node"
          data-node={node.i}
          cx={node.x}
          cy={node.y}
          r={4}
          fill={TONE[node.tone]}
        />
      ))}
    </g>
  );
}

/**
 * HTML overlay rather than an SVG text node: this element is a Flip source and its
 * destination is an HTML MetricCard. Flipping SVG into HTML is unreliable, so the two
 * objects that travel are real DOM elements positioned over the drawing.
 */
export function QueueCounter() {
  const m = METRICS["queue-depth"];
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${((QUEUE.x - 14) / VIEW.w) * 100}%`,
        top: `${((QUEUE.y - 62) / VIEW.h) * 100}%`,
      }}
    >
      <div
        data-flip-id="queue-depth"
        className="queue-counter inline-flex flex-col rounded-md border border-border bg-card px-3 py-2 shadow-[var(--shadow-sm)]"
      >
        <span className="label-caps text-[11px] leading-none">Worklist depth</span>
        {/* Renders the RESOLVED figure. The timeline rewinds it to the "before" value
            pre-paint, so a visitor without JavaScript sees where the operation landed. */}
        <span className="text-data mt-1.5 text-2xl font-medium leading-none text-foreground">
          <span className="queue-count">{m.current.toLocaleString("en-US")}</span>
        </span>
      </div>
    </div>
  );
}
