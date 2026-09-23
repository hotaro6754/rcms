import { FLOW, FLOW_PATH, STAGES } from "./geometry";

/**
 * The claim lifecycle: Charge, Claim, Payer, 835, Posting. Drawn left to right with DrawSVG,
 * stage labels arriving in sequence. This is the rail the claim nodes travel along, so it has
 * to be a real path with a real id — MotionPath reads `#flow-rail`.
 */
export function ClaimFlowPath() {
  return (
    <g>
      <path
        id="flow-rail"
        className="flow-rail"
        d={FLOW_PATH}
        fill="none"
        stroke="var(--input)"
        strokeWidth={1.5}
      />

      {STAGES.map((stage, i) => (
        <g key={stage.id} className="flow-stage">
          <line
            className="stage-drop"
            x1={stage.x}
            y1={stage.y}
            x2={stage.x}
            y2={stage.y - 14}
            stroke="var(--input)"
            strokeWidth={1}
          />
          <circle
            className="stage-node"
            cx={stage.x}
            cy={stage.y}
            r={4.5}
            fill="var(--card)"
            stroke="var(--primary)"
            strokeWidth={1.75}
          />
          <text
            className="stage-label"
            x={stage.x}
            y={stage.y - 22}
            textAnchor={i === 0 ? "start" : i === STAGES.length - 1 ? "end" : "middle"}
            fontFamily="var(--font-mono)"
            fontSize={12}
            fontWeight={500}
            fill="var(--muted-foreground)"
            letterSpacing="0.04em"
          >
            {stage.label.toUpperCase()}
          </text>
        </g>
      ))}

      <text
        className="flow-caption"
        x={FLOW.x0}
        y={FLOW.y + 26}
        fontFamily="var(--font-mono)"
        fontSize={12}
        fill="var(--subtle)"
      >
        Claim lifecycle
      </text>
    </g>
  );
}
