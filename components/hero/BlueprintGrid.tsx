import { BLUEPRINT, PLOT, VIEW } from "./geometry";

/**
 * The engineering substrate the rest of the hero is drawn on: alignment rules, measurement
 * ticks and a plot frame. Deliberately sparse. An operations diagram, not a sci-fi HUD.
 *
 * Animated by HeroSequence via the `.bp-rule` / `.bp-tick` hooks (DrawSVG).
 */
export function BlueprintGrid() {
  return (
    <g aria-hidden="true">
      {BLUEPRINT.verticals.map((x) => (
        <line
          key={`v-${x}`}
          className="bp-rule"
          x1={x}
          y1={72}
          x2={x}
          y2={VIEW.h - 26}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}

      {BLUEPRINT.horizontals.map((y) => (
        <line
          key={`h-${y}`}
          className="bp-rule"
          x1={40}
          y1={y}
          x2={VIEW.w - 40}
          y2={y}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}

      {BLUEPRINT.ticks.map((x, i) => (
        <line
          key={`t-${x}`}
          className="bp-tick"
          x1={x}
          y1={PLOT.y1 + 6}
          x2={x}
          y2={PLOT.y1 + (i % 3 === 0 ? 14 : 10)}
          stroke="var(--input)"
          strokeWidth={1}
        />
      ))}

      {/* Plot frame corner marks: the measured area, called out the way a drawing would. */}
      {[
        [PLOT.x0, PLOT.y0],
        [PLOT.x1, PLOT.y0],
        [PLOT.x0, PLOT.y1],
        [PLOT.x1, PLOT.y1],
      ].map(([x, y]) => (
        <path
          key={`c-${x}-${y}`}
          className="bp-tick"
          d={`M ${x - 5} ${y} L ${x + 5} ${y} M ${x} ${y - 5} L ${x} ${y + 5}`}
          stroke="var(--input)"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}
