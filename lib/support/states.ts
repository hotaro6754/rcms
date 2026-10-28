import type { SupportPriority, SupportStatus } from "@prisma/client";

/**
 * The support case state machine. Staff move cases only along these edges; the server rejects
 * anything else, whatever a form posts. Learners do not set statuses: their replies move a case
 * (a reply while waiting on them returns it to the team; a reply to a resolved or recently closed
 * case reopens it).
 *
 *   New (WAITING) → Open (ASSIGNED) → In progress → Waiting for learner / Waiting for internal
 *   team / Escalated → Resolved → Closed, with Reopened re-entering the working states.
 */

export const STATUS_LABEL: Record<SupportStatus, string> = {
  WAITING: "New",
  ASSIGNED: "Open",
  IN_PROGRESS: "In progress",
  PENDING_SUBSCRIBER: "Waiting for learner",
  PENDING_INTERNAL: "Waiting for internal team",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

/** What the learner sees for the same status. */
export const LEARNER_STATUS_LABEL: Record<SupportStatus, string> = {
  ...STATUS_LABEL,
  WAITING: "Received",
  ASSIGNED: "With our team",
  PENDING_SUBSCRIBER: "Waiting for your reply",
  PENDING_INTERNAL: "With our team",
  ESCALATED: "With a specialist",
};

const WORKING: SupportStatus[] = ["IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "ESCALATED", "RESOLVED"];

export const STAFF_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  WAITING: ["IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "ESCALATED", "RESOLVED", "CLOSED"],
  ASSIGNED: WORKING,
  IN_PROGRESS: ["PENDING_SUBSCRIBER", "PENDING_INTERNAL", "ESCALATED", "RESOLVED"],
  PENDING_SUBSCRIBER: ["IN_PROGRESS", "PENDING_INTERNAL", "ESCALATED", "RESOLVED", "CLOSED"],
  PENDING_INTERNAL: ["IN_PROGRESS", "PENDING_SUBSCRIBER", "ESCALATED", "RESOLVED"],
  ESCALATED: ["IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "RESOLVED"],
  REOPENED: WORKING,
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export const OPEN_STATUSES: SupportStatus[] = ["WAITING", "ASSIGNED", "IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "ESCALATED", "REOPENED"];
export const DONE_STATUSES: SupportStatus[] = ["RESOLVED", "CLOSED"];

export function canStaffMove(from: SupportStatus, to: SupportStatus) {
  return from === to || STAFF_TRANSITIONS[from].includes(to);
}

/** Days after closure during which the learner can reopen by replying. */
export const REOPEN_WINDOW_DAYS = 14;
/** A resolved case closes itself after this many days without a reply. */
export const AUTO_CLOSE_DAYS = 7;

const RANK: SupportPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
export const higherPriority = (a: SupportPriority, b: SupportPriority) => (RANK.indexOf(a) >= RANK.indexOf(b) ? a : b);
export const bumpPriority = (p: SupportPriority): SupportPriority => RANK[Math.min(RANK.length - 1, RANK.indexOf(p) + 1)];

/**
 * Impact × urgency → priority, the usual service-desk matrix. Each is 1–3.
 * 3+3 is urgent; 5 is high; 3–4 normal; 2 low.
 */
export function matrixPriority(impact?: number | null, urgency?: number | null): SupportPriority {
  if (!impact || !urgency) return "NORMAL";
  const s = impact + urgency;
  if (s >= 6) return "URGENT";
  if (s === 5) return "HIGH";
  if (s >= 3) return "NORMAL";
  return "LOW";
}
