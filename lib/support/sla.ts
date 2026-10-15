/**
 * Due-time arithmetic for support targets. Pure: give it a start, a number of minutes and the
 * support calendar, and it returns when the target falls due.
 *
 * Business hours are a single daily window on chosen weekdays at a fixed UTC offset. That fits
 * the academy's own support hours (IST has no daylight saving). Public holidays are not modelled.
 */

export interface Calendar {
  utcOffsetMinutes: number;
  /** 0 Sunday … 6 Saturday. */
  workDays: number[];
  startMinute: number;
  endMinute: number;
}

export const DEFAULT_CALENDAR: Calendar = { utcOffsetMinutes: 330, workDays: [1, 2, 3, 4, 5, 6], startMinute: 600, endMinute: 1140 };

const MIN = 60_000;
const DAY = 1440;

export function addBusinessMinutes(start: Date, minutes: number, cal: Calendar, businessHours = true): Date {
  if (!businessHours || cal.workDays.length === 0 || cal.endMinute <= cal.startMinute) return new Date(start.getTime() + minutes * MIN);
  // Work in "local" minutes since the epoch: shifting by the offset makes UTC getters read local time.
  let t = Math.floor(start.getTime() / MIN) + cal.utcOffsetMinutes;
  let remaining = Math.max(0, minutes);
  for (let guard = 0; guard < 800; guard++) {
    const dayStart = Math.floor(t / DAY) * DAY;
    const weekday = new Date(dayStart * MIN).getUTCDay();
    if (cal.workDays.includes(weekday)) {
      const open = dayStart + cal.startMinute;
      const close = dayStart + cal.endMinute;
      if (t < open) t = open;
      if (t < close) {
        const available = close - t;
        if (remaining <= available) return new Date((t + remaining - cal.utcOffsetMinutes) * MIN);
        remaining -= available;
      }
    }
    t = dayStart + DAY;
  }
  throw new Error("The support calendar has no working time.");
}

/** Business minutes between two instants (for reporting time to first response and resolution). */
export function businessMinutesBetween(a: Date, b: Date, cal: Calendar, businessHours = true): number {
  if (b <= a) return 0;
  if (!businessHours) return Math.round((b.getTime() - a.getTime()) / MIN);
  let t = Math.floor(a.getTime() / MIN) + cal.utcOffsetMinutes;
  const end = Math.floor(b.getTime() / MIN) + cal.utcOffsetMinutes;
  let total = 0;
  for (let guard = 0; t < end && guard < 4000; guard++) {
    const dayStart = Math.floor(t / DAY) * DAY;
    const weekday = new Date(dayStart * MIN).getUTCDay();
    if (cal.workDays.includes(weekday)) {
      const from = Math.max(t, dayStart + cal.startMinute);
      const to = Math.min(end, dayStart + cal.endMinute);
      if (to > from) total += to - from;
    }
    t = dayStart + DAY;
  }
  return total;
}

/** Default targets per priority, in minutes, used until a support lead sets their own. */
export const DEFAULT_SLA: Record<"LOW" | "NORMAL" | "HIGH" | "URGENT", { firstResponseMinutes: number; resolutionMinutes: number; businessHours: boolean }> = {
  URGENT: { firstResponseMinutes: 60, resolutionMinutes: 8 * 60, businessHours: false },
  HIGH: { firstResponseMinutes: 4 * 60, resolutionMinutes: 2 * 9 * 60, businessHours: true },
  NORMAL: { firstResponseMinutes: 8 * 60, resolutionMinutes: 5 * 9 * 60, businessHours: true },
  LOW: { firstResponseMinutes: 2 * 9 * 60, resolutionMinutes: 10 * 9 * 60, businessHours: true },
};
