"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { MENTORING, inr } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

const SLOTS = [
  { d: "Mon 8", t: "19:30", open: true },
  { d: "Mon 8", t: "21:00", open: false },
  { d: "Tue 9", t: "19:30", open: true },
  { d: "Wed 10", t: "20:00", open: true },
  { d: "Wed 10", t: "21:30", open: false },
  { d: "Thu 11", t: "19:30", open: true },
  { d: "Fri 12", t: "20:00", open: false },
  { d: "Sat 13", t: "09:00", open: true },
  { d: "Sat 13", t: "11:00", open: true },
];

/** Motion-owned. No GSAP in this subtree. */
export function BookingPanel() {
  const [option, setOption] = useState(MENTORING[1].id);
  const [slot, setSlot] = useState<string | null>(null);

  const chosen = MENTORING.find((m) => m.id === option)!;
  const slotLabel = slot ? SLOTS.find((s) => `${s.d} ${s.t}` === slot) : null;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card">
      <div className="border-b border-border p-5">
        <p className="label-caps">Step one · choose the session</p>
        <div className="mt-4 flex flex-col gap-2">
          {MENTORING.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOption(m.id)}
              aria-pressed={option === m.id}
              className={cn(
                "flex min-h-14 items-center gap-4 rounded-md border px-4 text-left transition-colors",
                option === m.id
                  ? "border-primary bg-accent"
                  : "border-border hover:border-input hover:bg-secondary",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{m.name}</span>
                <span className="text-data block text-micro text-muted-foreground">
                  {m.minutes} minutes
                </span>
              </span>
              <span className="text-data shrink-0 text-[15px] font-medium">{inr(m.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border p-5">
        <p className="label-caps">Step two · pick a slot</p>
        <p className="mt-2 text-micro text-muted-foreground">
          Week of 8 September, IST. Evenings and Saturday mornings to fit US-shift schedules.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Available slots">
          {SLOTS.map((s) => {
            const id = `${s.d} ${s.t}`;
            return (
              <button
                key={id}
                type="button"
                disabled={!s.open}
                onClick={() => setSlot(id)}
                aria-pressed={slot === id}
                aria-label={s.open ? `${s.d}, ${s.t} IST` : `${s.d}, ${s.t} IST, already booked`}
                className={cn(
                  "min-h-14 rounded-md border px-2 py-2 text-center transition-colors",
                  !s.open && "cursor-not-allowed opacity-45 line-through",
                  slot === id
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:border-primary hover:bg-accent",
                )}
              >
                <span className="text-data block text-micro text-muted-foreground">{s.d}</span>
                <span className="text-data mt-1 block text-[13.5px] font-medium">{s.t}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="text-micro text-muted-foreground">
          {slotLabel ? (
            <motion.span
              key={slot}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              <span className="font-semibold text-foreground">
                {chosen.name}, {slotLabel.d} September at {slotLabel.t} IST
              </span>
              <br />
              {chosen.minutes} minutes · {inr(chosen.price)}
            </motion.span>
          ) : (
            "Select a slot to continue"
          )}
        </div>
        <motion.a
          href="/contact"
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.12 }}
          aria-disabled={!slot}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-5 text-sm font-medium transition-colors",
            slot
              ? "bg-primary text-primary-foreground hover:bg-primary-hover"
              : "pointer-events-none border border-input bg-secondary text-muted-foreground",
          )}
        >
          Continue to payment
        </motion.a>
      </div>
    </div>
  );
}
