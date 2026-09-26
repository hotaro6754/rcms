"use client";

import { useRef } from "react";
import { MENTORING } from "@/lib/data/catalog";
import { useStepper } from "./useStepper";
import { cn } from "@/lib/utils";

/**
 * Mentoring as time in an advisory calendar. A week, Monday to Saturday, with the sessions
 * where they actually run: weekday evenings and Saturday mornings, India time, so they fit
 * around US-shift work.
 *
 * One slot at a time holds a session from the catalogue. The slot fills in proportion to
 * the session's length (30, 45, 60 or 90 of 90 minutes) and says it, so the picture shows
 * when, how long and what kind at a glance. Point at a session in the list beside it
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
        {DAYS.map((d, c) => (
          <text key={d} x={X0 + c * CW + CW / 2} y={Y0 - 16} textAnchor="middle" className="ill-caps">
            {d.toUpperCase()}
          </text>
        ))}
        {ROWS.map((r, row) => (
          <text key={r} x={X0 - 14} y={Y0 + row * RH + RH / 2} textAnchor="end" dominantBaseline="middle" className="ill-label">
            {r}
          </text>
        ))}
        {DAYS.map((_, c) =>
          ROWS.map((__, row) => {
            const openIdx = OPEN.findIndex(([dc, dr]) => dc === c && dr === row);
            const open = openIdx >= 0;
            const booked = openIdx === bookedSlot;
            const x = X0 + c * CW + 4;
            const y = Y0 + row * RH + 4;
            const w = CW - 8;
            const h = RH - 8;
            const fillH = (h * session.minutes) / LONGEST;
            return (
              <g key={`${c}-${row}`}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={8}
                  style={{
                    fill: open ? "var(--accent)" : "transparent",
                    stroke: booked ? "var(--brand)" : open ? "color-mix(in oklab, var(--brand) 30%, transparent)" : "var(--border)",
                    strokeWidth: booked ? 2 : 1.5,
                    transition: "stroke var(--dur-med)",
                  }}
                />
                {booked && (
                  <>
                    {/* The session's length, as a share of the longest session. */}
                    <rect
                      x={x + 3}
                      y={y + h - fillH + 3}
                      width={w - 6}
                      height={Math.max(0, fillH - 6)}
                      rx={5}
                      style={{ fill: "var(--brand)", transition: "y var(--dur-med) var(--ease-exec), height var(--dur-med) var(--ease-exec)" }}
                    />
                    <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="ill-caps" style={{ fill: fillH > h / 2 ? "#fff" : "var(--foreground)" }}>
                      {session.minutes}M
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
