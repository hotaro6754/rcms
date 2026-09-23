/**
 * Governance Room data, seeded from telemetry.ts. Every item here resolves back to a
 * metric, a denial category, a pod or the capacity model. No disconnected fixtures.
 *
 * The whole review has one spine: a payer policy update effective 01 Aug 2026 was never
 * mapped to the authorisation workflow. It shows up as the denial-rate breach, the CO-50
 * inventory, the open escalation, the RCA, the top risk and the two live actions.
 */

import { DENIALS, METRICS, PODS, type MetricId } from "./telemetry";

export type Severity = "critical" | "high" | "medium" | "low";
export type ActionStatus = "not-started" | "in-progress" | "blocked" | "complete";

export const AGENDA = [
  { id: "snapshot", label: "Executive Snapshot", detail: "Where the engagement stands in one screen" },
  { id: "kpi", label: "KPI Review", detail: "Target against actual, with variance owned" },
  { id: "escalations", label: "Escalations", detail: "What the client raised and what it is costing" },
  { id: "rca", label: "Root Cause", detail: "Why the number moved, five levels down" },
  { id: "risk", label: "Risk", detail: "What could move it again" },
  { id: "capacity", label: "Capacity", detail: "What it takes to hold the recovery" },
  { id: "actions", label: "Executive Actions", detail: "Decisions, owners and dates" },
] as const;

export type AgendaId = (typeof AGENDA)[number]["id"];

/** Metrics presented in the KPI review, in review order: lead with the win, end with the miss. */
export const REVIEW_METRICS: MetricId[] = [
  "sla-adherence",
  "days-in-ar",
  "ar-over-90",
  "queue-depth",
  "first-pass",
  "clean-claim",
  "cost-to-collect",
  "denial-rate",
];

// ---------------------------------------------------------------------------

export interface Escalation {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  owner: string;
  raisedHoursAgo: number;
  slaHoursRemaining: number;
  financialImpact: number;
  status: "open" | "mitigating" | "resolved";
  /** The metric this escalation explains. */
  metric: MetricId;
}

export const ESCALATIONS: Escalation[] = [
  {
    id: "ESC-4471",
    severity: "high",
    title: "Payer policy rejection spike",
    detail:
      "Aetna commercial began rejecting cardiac imaging without a prior-authorisation segment on 01 Aug. 312 claims denied CO-50 before the pattern was caught.",
    owner: "Revenue Integrity",
    raisedHoursAgo: 55,
    slaHoursRemaining: 18,
    financialImpact: METRICS["denial-rate"].narrative.financialImpact ?? 184_000,
    status: "mitigating",
    metric: "denial-rate",
  },
  {
    id: "ESC-4468",
    severity: "medium",
    title: "Eligibility pod running unassigned",
    detail:
      "ELIG-01 has had no permanent lead for three weeks. Shrinkage is at 26% against an 12% plan and QA has fallen to 88.3%.",
    owner: "Operations",
    raisedHoursAgo: 132,
    slaHoursRemaining: 96,
    financialImpact: 61_000,
    status: "open",
    metric: "clean-claim",
  },
  {
    id: "ESC-4460",
    severity: "low",
    title: "Client requested weekly aged-A/R extract",
    detail:
      "Practice manager asked for the >90 worklist weekly rather than monthly during the recovery. No system change required.",
    owner: "Client Services",
    raisedHoursAgo: 210,
    slaHoursRemaining: 240,
    financialImpact: 0,
    status: "resolved",
    metric: "ar-over-90",
  },
];

// ---------------------------------------------------------------------------

export interface RcaStep {
  question: string;
  answer: string;
  evidence: string;
}

export const RCA = {
  subject: DENIALS.find((d) => d.underRca)!,
  statement: "Denial rate rose 1.4 points in a single cycle, against a target of 8.5%.",
  steps: [
    {
      question: "Why did the denial rate rise?",
      answer: "312 cardiac imaging claims were denied CO-50, not deemed medically necessary.",
      evidence: "CO-50 inventory moved from 0 to 312 claims between 01 Aug and 29 Aug.",
    },
    {
      question: "Why were they denied as not medically necessary?",
      answer: "They were submitted without the prior-authorisation segment the payer now requires.",
      evidence: "All 312 denials carry RARC N706, missing documentation.",
    },
    {
      question: "Why was the authorisation missing?",
      answer: "The authorisation workflow never fired for these CPT codes.",
      evidence: "Workflow trigger list still scoped to the pre-August code set.",
    },
    {
      question: "Why did the workflow not fire?",
      answer: "The payer changed its policy effective 01 Aug and expanded the code set.",
      evidence: "Aetna commercial bulletin 2026-14, published 12 Jul, effective 01 Aug.",
    },
    {
      question: "Why was the policy change not mapped?",
      answer:
        "No one owns reading payer bulletins into the workflow. The bulletin was received and never actioned.",
      evidence: "Policy-update register has no entry for bulletin 2026-14.",
    },
  ] satisfies RcaStep[],
  conclusion:
    "This is a governance gap, not an analyst performance problem. The control that is missing is an owner for payer policy intake.",
} as const;

// ---------------------------------------------------------------------------

export interface Risk {
  id: string;
  title: string;
  detail: string;
  /** 1-5 */
  probability: number;
  /** 1-5 */
  impact: number;
  owner: string;
  mitigation: string;
}

export const RISKS: Risk[] = [
  {
    id: "R-01",
    title: "Unmapped payer policy",
    detail: "Further bulletins land with no intake owner, repeating the August pattern on a different payer.",
    probability: 4,
    impact: 5,
    owner: "Revenue Integrity",
    mitigation: "Assign bulletin intake to a named owner with a weekly register review.",
  },
  {
    id: "R-02",
    title: "Denial backlog re-ages",
    detail: "The 312 CO-50 claims cross 90 days in November and reverse the A/R gain.",
    probability: 3,
    impact: 4,
    owner: "AR Management",
    mitigation: "Work the CO-50 cohort ahead of fresh inventory for two cycles.",
  },
  {
    id: "R-03",
    title: "Eligibility staffing shortfall",
    detail: "ELIG-01 at 26% shrinkage with no lead; front-end errors flow downstream.",
    probability: 4,
    impact: 3,
    owner: "Operations",
    mitigation: "Confirm the permanent lead before the October cycle; backfill two analysts.",
  },
  {
    id: "R-04",
    title: "Quality bar traded for volume",
    detail: "Pressure to clear denials pulls the audit bar below 93% and rework returns.",
    probability: 2,
    impact: 4,
    owner: "Quality",
    mitigation: "Hold the bar at 93%; fund recovery with automation coverage, not audit reduction.",
  },
  {
    id: "R-05",
    title: "Coding variance on bundling",
    detail: "CO-97 inventory at 1,876 claims suggests an unresolved bundling interpretation.",
    probability: 3,
    impact: 2,
    owner: "Coding",
    mitigation: "Sample 50 CO-97 denials and confirm the modifier position before appealing further.",
  },
];

// ---------------------------------------------------------------------------

export interface ActionItem {
  id: string;
  action: string;
  owner: string;
  due: string;
  status: ActionStatus;
  blockedReason?: string;
  expectedImpact: string;
  linkedMetric: MetricId;
}

export const ACTIONS: ActionItem[] = [
  {
    id: "ACT-118",
    action: "Back-date the authorisation rule to 01 Aug and re-submit the 312 CO-50 claims",
    owner: "Revenue Integrity",
    due: "12 Sep 2026",
    status: "in-progress",
    expectedImpact: "Recovers up to $125K at the 68% historical overturn rate",
    linkedMetric: "denial-rate",
  },
  {
    id: "ACT-119",
    action: "Assign a named owner for payer bulletin intake and stand up a weekly register review",
    owner: "Revenue Integrity",
    due: "19 Sep 2026",
    status: "not-started",
    expectedImpact: "Closes the governance gap that produced the August spike",
    linkedMetric: "denial-rate",
  },
  {
    id: "ACT-120",
    action: "Confirm permanent lead for ELIG-01 and backfill two analysts",
    owner: "Operations",
    due: "30 Sep 2026",
    status: "blocked",
    blockedReason: "Requisition pending client approval of the revised staffing schedule",
    expectedImpact: "Returns eligibility shrinkage to plan and protects clean claim rate",
    linkedMetric: "clean-claim",
  },
  {
    id: "ACT-121",
    action: "Prioritise the CO-50 cohort ahead of fresh inventory through October",
    owner: "AR Management",
    due: "03 Oct 2026",
    status: "in-progress",
    expectedImpact: "Prevents 312 claims re-ageing into the >90 bucket in November",
    linkedMetric: "ar-over-90",
  },
  {
    id: "ACT-115",
    action: "Publish the weekly aged-A/R extract to the practice manager",
    owner: "Client Services",
    due: "05 Sep 2026",
    status: "complete",
    expectedImpact: "Client visibility during the recovery; no system change",
    linkedMetric: "ar-over-90",
  },
];

// ---------------------------------------------------------------------------

export interface ActivityEvent {
  id: string;
  at: string;
  kind: "capacity" | "policy" | "escalation" | "quality" | "recovery";
  message: string;
  detail: string;
}

export const ACTIVITY: ActivityEvent[] = [
  { id: "EV-901", at: "Today 09:12", kind: "recovery", message: "Aged worklist cleared below 10,000 claims", detail: "Queue depth 9,400. First time under the 12,000 target this engagement." },
  { id: "EV-900", at: "Today 08:40", kind: "escalation", message: "ESC-4471 moved to mitigating", detail: "Authorisation rule drafted; awaiting back-date approval." },
  { id: "EV-898", at: "Yesterday 17:22", kind: "policy", message: "Aetna bulletin 2026-14 logged to the register", detail: "Retroactively recorded. Effective date 01 Aug 2026." },
  { id: "EV-895", at: "Yesterday 11:05", kind: "capacity", message: "Two analysts reallocated AR-02 to DEN-01", detail: "Denial inventory prioritised for the September close." },
  { id: "EV-891", at: "04 Sep 14:48", kind: "quality", message: "QA audit bar held at 93%", detail: "Proposal to reduce to 90% for volume was declined." },
];

/** Pods carrying an open risk, resolved rather than restated. */
export const AT_RISK_PODS = PODS.filter((p) => p.capacity === "at-risk" || p.capacity === "tight");
