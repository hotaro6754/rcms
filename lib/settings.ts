import { prisma } from "./db";

/**
 * Operational settings an authorised administrator can change through an approval request
 * (lib/services/approvals.ts, kind SECURITY_SETTING). Security mechanics that must not be
 * switchable from a web page (MFA enforcement, lockout threshold, secrets) stay in the
 * environment instead.
 */

export const SETTINGS = {
  "refund.windowDays": { label: "Refund window (days from purchase)", default: 7, kind: "int", min: 0, max: 365 },
  "refund.maxConsumptionPct": { label: "Refundable if less than this % of lessons completed", default: 20, kind: "int", min: 0, max: 100 },
  "refund.routineLimit": { label: "Routine refund limit (₹); above this needs the Academy Director", default: 10000, kind: "int", min: 0, max: 10_000_000 },
  "export.approvalThreshold": { label: "Subscriber exports above this many rows need approval", default: 500, kind: "int", min: 1, max: 1_000_000 },
  "support.hours": { label: "Support hours shown to learners", default: "Monday to Saturday, 10:00–19:00 IST", kind: "text" },
  "support.firstResponseHours": { label: "First-response target (hours)", default: 8, kind: "int", min: 1, max: 240 },
  "transcript.retentionDays": { label: "Support transcript retention (days after closure)", default: 730, kind: "int", min: 30, max: 3650 },
} as const;

export type SettingKey = keyof typeof SETTINGS;

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof SETTINGS)[K]["default"]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as (typeof SETTINGS)[K]["default"]) ?? SETTINGS[key].default;
}

export function validateSetting(key: string, raw: unknown): { ok: true; value: string | number } | { ok: false; error: string } {
  const def = (SETTINGS as Record<string, { kind: string; min?: number; max?: number }>)[key];
  if (!def) return { ok: false, error: "Unknown setting." };
  if (def.kind === "int") {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < (def.min ?? -Infinity) || n > (def.max ?? Infinity)) return { ok: false, error: `Enter a whole number between ${def.min} and ${def.max}.` };
    return { ok: true, value: n };
  }
  const s = String(raw ?? "").trim();
  if (!s || s.length > 300) return { ok: false, error: "Enter between 1 and 300 characters." };
  return { ok: true, value: s };
}
