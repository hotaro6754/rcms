/**
 * The denial workflow as a strip of numbered steps, drawn in SVG so it scales and stays crisp.
 * Completed steps fill in; the current one is outlined. The same information is given as an
 * ordered list for screen readers, so the drawing is decorative.
 */

export interface StripStep {
  label: string;
  done: boolean;
}

export function WorkflowStrip({ steps, current }: { steps: StripStep[]; current?: number }) {
  return (
    <figure className="w-full min-w-0 overflow-x-auto">
      <svg viewBox={`0 0 ${steps.length * 100} 64`} className="h-auto w-full min-w-[600px]" aria-hidden="true" focusable="false">
        <line x1={50} x2={steps.length * 100 - 50} y1={20} y2={20} className="stroke-border" strokeWidth={2} />
        {steps.map((s, i) => {
          const cx = i * 100 + 50;
          const isCurrent = current === i;
          return (
            <g key={s.label}>
              {i > 0 && steps[i - 1].done && s.done && <line x1={cx - 100} x2={cx} y1={20} y2={20} className="stroke-primary" strokeWidth={2} />}
              <circle cx={cx} cy={20} r={11} className={s.done ? "fill-primary stroke-primary" : isCurrent ? "fill-card stroke-foreground" : "fill-card stroke-border"} strokeWidth={2} />
              <text x={cx} y={24} textAnchor="middle" className={s.done ? "fill-primary-foreground" : "fill-foreground"} style={{ fontSize: 11, fontWeight: 600 }}>
                {i + 1}
              </text>
              <text x={cx} y={52} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10.5 }}>
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ol className="sr-only">
        {steps.map((s, i) => (
          <li key={s.label}>
            Step {i + 1}, {s.label}: {s.done ? "done" : current === i ? "current" : "not started"}
          </li>
        ))}
      </ol>
    </figure>
  );
}
