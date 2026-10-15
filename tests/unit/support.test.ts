import { describe, expect, it } from "vitest";
import { addBusinessMinutes, businessMinutesBetween, DEFAULT_CALENDAR } from "@/lib/support/sla";
import { canStaffMove, matrixPriority, STAFF_TRANSITIONS } from "@/lib/support/states";

// IST = UTC+5:30. Support hours Mon–Sat 10:00–19:00 IST = 04:30–13:30 UTC.
const ist = (s: string) => new Date(`${s}+05:30`);

describe("support SLA calendar", () => {
  it("counts only support hours", () => {
    // Monday 2026-10-12 18:00 IST + 2h → 1h left Monday, 1h Tuesday → Tuesday 11:00 IST.
    expect(addBusinessMinutes(ist("2026-10-12T18:00:00"), 120, DEFAULT_CALENDAR).toISOString()).toBe(ist("2026-10-13T11:00:00").toISOString());
  });
  it("starts at opening time when raised overnight, and skips Sunday", () => {
    expect(addBusinessMinutes(ist("2026-10-13T02:00:00"), 30, DEFAULT_CALENDAR).toISOString()).toBe(ist("2026-10-13T10:30:00").toISOString());
    // Saturday 2026-10-17 18:30 + 60 min → 30 min Saturday, then Monday 10:30.
    expect(addBusinessMinutes(ist("2026-10-17T18:30:00"), 60, DEFAULT_CALENDAR).toISOString()).toBe(ist("2026-10-19T10:30:00").toISOString());
  });
  it("uses calendar time when business hours are off", () => {
    const s = ist("2026-10-18T03:00:00");
    expect(addBusinessMinutes(s, 60, DEFAULT_CALENDAR, false).getTime() - s.getTime()).toBe(3_600_000);
  });
  it("measures business minutes between two instants", () => {
    expect(businessMinutesBetween(ist("2026-10-12T18:00:00"), ist("2026-10-13T11:00:00"), DEFAULT_CALENDAR)).toBe(120);
    expect(businessMinutesBetween(ist("2026-10-17T20:00:00"), ist("2026-10-19T09:00:00"), DEFAULT_CALENDAR)).toBe(0);
  });
});

describe("support state machine", () => {
  it("allows only defined moves and never out of closed", () => {
    expect(canStaffMove("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canStaffMove("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(canStaffMove("RESOLVED", "PENDING_INTERNAL")).toBe(false);
    expect(STAFF_TRANSITIONS.CLOSED).toEqual([]);
  });
  it("maps impact and urgency to priority", () => {
    expect(matrixPriority(3, 3)).toBe("URGENT");
    expect(matrixPriority(2, 3)).toBe("HIGH");
    expect(matrixPriority(1, 2)).toBe("NORMAL");
    expect(matrixPriority(1, 1)).toBe("LOW");
    expect(matrixPriority(null, 2)).toBe("NORMAL");
  });
});
