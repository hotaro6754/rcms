"use client";

import { useId, useRef } from "react";
import { MENTORING } from "@/lib/data/catalog";
import { useStepper } from "./useStepper";
import { cn } from "@/lib/utils";

/**
 * Mentoring as time in an advisory calendar. A week, Monday to Saturday, with the sessions
 * where they actually run: weekday evenings and Saturday mornings, India time, so they fit
 * around US-shift work.
 *
 * Drawn like a diary page: hairline rules, open time hatched in pencil, and the booked
 * session inked in from the top of its slot, as deep as its share of the longest session
 * (30, 45, 60 or 90 of 90 minutes), with its length written beside it. Point at a session in the list beside it
 * (`focus`) and the calendar shows that one; otherwise it cycles gently while on screen.
 */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROWS = ["Morning", "Afternoon", "Evening"];

/** Open slots: weekday evenings, Saturday morning. [day, row] */
const OPEN: [number, number][] = [
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 0],
];
/** Which open slot each session is shown in (index into MENTORING → index into OPEN). */
const SLOT_FOR_SESSION = [1, 3, 5, 4];
const LONGEST = Math.max(...MENTORING.map((m) => m.minutes));

const X0 = 96;
const Y0 = 58;
const CW = 66;
const RH = 62;

export function AdvisoryWeek({ className, focus = null }: { className?: string; focus?: number | null }) {
  const root = useRef<HTMLDivElement>(null);
  const hatch = `hatch-${useId().replace(/:/g, "")}`;
  const { step, done } = useStepper(root, MENTORING.length, {
    interval: 1800,
    pause: 1800,
    hold: focus ?? undefined,
  });
  const sessionIndex = focus ?? (done ? 0 : step);
  const session = MENTORING[sessionIndex];
  const bookedSlot = SLOT_FOR_SESSION[sessionIndex];

  return (
    <div ref={root} className={cn("ill", className)}>
      <svg viewBox="0 0 520 300" className="block h-auto w-full" role="img" aria-label="A week of mentoring slots: weekday evenings and Saturday mornings, India time.">
        <defs>
          <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" style={{ stroke: "var(--brand)", strokeOpacity: 0.32 }} strokeWidth="1" />
          </pattern>
        </defs>
        {/* Rules: the diary's grid, not boxes. */}
        {Array.from({ length: DAYS.length + 1 }, (_, c) => (
          <line key={`v${c}`} x1={X0 + c * CW} x2={X0 + c * CW} y1={Y0 - 6} y2={Y0 + ROWS.length * RH} style={{ stroke: "var(--border)" }} />
        ))}
        {Array.from({ length: ROWS.length + 1 }, (_, r) => (
          <line key={`h${r}`} x1={X0 - 70} x2={X0 + DAYS.length * CW} y1={Y0 + r * RH} y2={Y0 + r * RH} style={{ stroke: r === 0 ? "var(--foreground)" : "var(--border)" }} />
        ))}
        {DAYS.map((d, c) => (
          <text key={d} x={X0 + c * CW + CW / 2} y={Y0 - 16} textAnchor="middle" className="ill-caps">
            {d.toUpperCase()}
          </text>
        ))}
        {ROWS.map((r, row) => (
          <text key={r} x={X0 - 70} y={Y0 + row * RH + 16} className="ill-label">
            {r}
          </text>
        ))}
        {DAYS.map((_, c) =>
          ROWS.map((__, row) => {
            const openIdx = OPEN.findIndex(([dc, dr]) => dc === c && dr === row);
            const open = openIdx >= 0;
            const booked = openIdx === bookedSlot;
            if (!open) return null;
            const x = X0 + c * CW + 1;
            const y = Y0 + row * RH + 1;
            const w = CW - 2;
            const h = RH - 2;
            const fillH = (h * session.minutes) / LONGEST;
            const inside = fillH > 26;
            return (
              <g key={`${c}-${row}`}>
                <rect x={x} y={y} width={w} height={h} fill={`url(#${hatch})`} />
                {booked && (
                  <>
                    {/* The session's length, inked from the top of the slot. */}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={fillH}
                      style={{ fill: "var(--foreground)", transition: "height var(--dur-med) var(--ease-exec)" }}
                    />
                    <text
                      x={x + 7}
                      y={inside ? y + 15 : y + fillH + 13}
                      className="ill-caps"
                      style={{ fill: inside ? "var(--background)" : "var(--foreground)" }}
                    >
                      {session.minutes} MIN
                    </text>
                  </>
                )}
              </g>
            );
          }),
        )}
        <text x={X0} y={Y0 + ROWS.length * RH + 30} className="ill-caps">
          IST · EVENINGS AND SATURDAY MORNINGS
        </text>
      </svg>
      <p className="font-serif-display mt-1 px-1 text-[1.15rem] italic leading-snug text-foreground">
        <span className="text-brand">{session.minutes} min</span> · {session.name}
      </p>
    </div>
  );
}
