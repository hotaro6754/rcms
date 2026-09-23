/**
 * Governance Lab scenarios.
 *
 * The Meridian engagement seeded from lib/data/telemetry.ts is the worked example a visitor
 * sees on the marketing site. These are the assessed ones: a learner meets a client they
 * have not seen, with a different failure mode, and has to find it themselves.
 *
 * Each scenario carries the same shape as the telemetry module so the lab surfaces render
 * from data rather than from anything hard-coded.
 */

export interface ScenarioMetric {
  id: string;
  label: string;
  short: string;
  unit: "count" | "days" | "percent";
  before: number;
  current: number;
  target: number;
  direction: "lower-is-better" | "higher-is-better";
  precision: number;
  series: number[];
  driver: string;
  affectedClaims?: number;
  financialImpact?: number;
  owner: string;
}

export interface ScenarioSeed {
  slug: string;
  clientName: string;
  specialty: string;
  providers: number;
  reviewPeriod: string;
  monthlyCollections: number;
  /** What the learner is not told. The grader checks whether they found it. */
  hiddenCause: string;
  brief: string;
  metrics: ScenarioMetric[];
  denials: {
    code: string;
    reason: string;
    owner: string;
    claims: number;
    value: number;
    overturnRate: number;
    status: string;
  }[];
  pods: {
    id: string;
    fn: string;
    lead: string;
    analysts: number;
    touchesPerDay: number;
    qa: number;
    shrinkage: number;
  }[];
  capacity: {
    openClaims: number;
    dailyInflow: number;
    costPerAnalyst: number;
    staffed: number;
  };
  escalations: {
    id: string;
    severity: "high" | "medium" | "low";
    title: string;
    detail: string;
    owner: string;
    slaHoursRemaining: number;
    financialImpact: number;
  }[];
}

/**
 * Northgate Orthopaedics. The failure is not a payer policy this time: a clearinghouse
 * migration silently dropped a batch, and by the time anyone noticed, part of the inventory
 * had crossed timely filing. The tell is in the denial mix, not the headline metrics.
 */
export const NORTHGATE: ScenarioSeed = {
  slug: "northgate-orthopaedics-oct-2026",
  clientName: "Northgate Orthopaedic Associates",
  specialty: "Orthopaedics",
  providers: 22,
  reviewPeriod: "October 2026",
  monthlyCollections: 1_940_000,
  hiddenCause:
    "A clearinghouse migration on 12 September dropped a batch of 1,100 claims that were never transmitted. Nobody reconciled submitted against accepted, so the gap surfaced six weeks later as CO-29 timely filing denials that cannot be appealed.",
  brief:
    "Days in A/R and worklist depth both look acceptable and the team is hitting productivity. Collections are down 9% on the quarter and nobody has explained why. Find it, and decide what you are going to do about the part that is already lost.",

  metrics: [
    {
      id: "days-in-ar",
      label: "Days in A/R",
      short: "Days in A/R",
      unit: "days",
      before: 41,
      current: 44,
      target: 42,
      direction: "lower-is-better",
      precision: 0,
      series: [41, 40, 42, 41, 43, 44],
      driver: "Drifting slowly. On its own this reads as noise rather than a problem.",
      affectedClaims: 4_100,
      financialImpact: 610_000,
      owner: "AR Management",
    },
    {
      id: "queue-depth",
      label: "AR worklist depth",
      short: "Queue depth",
      unit: "count",
      before: 11_800,
      current: 10_400,
      target: 12_000,
      direction: "lower-is-better",
      precision: 0,
      series: [11_800, 11_500, 11_100, 10_900, 10_600, 10_400],
      driver: "Falling, which is why nobody looked here. A queue can shrink because work is leaving the wrong way.",
      owner: "Operations",
    },
    {
      id: "clean-claim",
      label: "Clean claim rate",
      short: "Clean claim",
      unit: "percent",
      before: 94.2,
      current: 94.6,
      target: 95,
      direction: "higher-is-better",
      precision: 1,
      series: [94.2, 94.1, 94.4, 94.3, 94.5, 94.6],
      driver: "Stable. The claims that never transmitted were never scrubbed, so they never counted against this.",
      owner: "Registration",
    },
    {
      id: "denial-rate",
      label: "Denial rate",
      short: "Denial rate",
      unit: "percent",
      before: 7.9,
      current: 9.8,
      target: 8.5,
      direction: "lower-is-better",
      precision: 1,
      series: [7.9, 8.1, 7.8, 8.0, 8.4, 9.8],
      driver: "Up sharply in one cycle, concentrated almost entirely in a single CARC code.",
      affectedClaims: 1_100,
      financialImpact: 512_000,
      owner: "AR Management",
    },
    {
      id: "first-pass",
      label: "First-pass resolution",
      short: "First-pass",
      unit: "percent",
      before: 88.1,
      current: 87.4,
      target: 88,
      direction: "higher-is-better",
      precision: 1,
      series: [88.1, 88.3, 88.0, 87.9, 87.6, 87.4],
      driver: "Slightly down, consistent with more rework arriving.",
      owner: "Quality",
    },
    {
      id: "sla-adherence",
      label: "SLA adherence",
      short: "SLA",
      unit: "percent",
      before: 97.2,
      current: 97.8,
      target: 96,
      direction: "higher-is-better",
      precision: 1,
      series: [97.2, 97.4, 97.1, 97.6, 97.5, 97.8],
      driver: "Comfortably ahead of target, which is exactly why the review nearly missed the problem.",
      owner: "Operations",
    },
  ],

  denials: [
    {
      code: "CO-29",
      reason: "Timely filing limit expired",
      owner: "AR",
      claims: 1_100,
      value: 512_000,
      overturnRate: 3,
      status: "not-appealable",
    },
    {
      code: "CO-97",
      reason: "Bundled into another service",
      owner: "Coding",
      claims: 640,
      value: 288_000,
      overturnRate: 58,
      status: "working",
    },
    {
      code: "CO-16",
      reason: "Missing or invalid information",
      owner: "Registration",
      claims: 410,
      value: 132_000,
      overturnRate: 71,
      status: "working",
    },
    {
      code: "PR-1",
      reason: "Deductible amount",
      owner: "Patient Billing",
      claims: 2_240,
      value: 418_000,
      overturnRate: 0,
      status: "front-end",
    },
  ],

  pods: [
    { id: "AR-01", fn: "Aged A/R", lead: "Kavya N.", analysts: 6, touchesPerDay: 39.4, qa: 93.2, shrinkage: 13 },
    { id: "AR-02", fn: "Fresh A/R", lead: "Rohit T.", analysts: 5, touchesPerDay: 41.1, qa: 92.8, shrinkage: 11 },
    { id: "DEN-01", fn: "Denials", lead: "Meera J.", analysts: 4, touchesPerDay: 26.9, qa: 95.4, shrinkage: 8 },
    { id: "SUB-01", fn: "Submissions", lead: "Unassigned", analysts: 2, touchesPerDay: 58.0, qa: 90.1, shrinkage: 22 },
  ],

  capacity: {
    openClaims: 10_400,
    dailyInflow: 610,
    costPerAnalyst: 1_050,
    staffed: 17,
  },

  escalations: [
    {
      id: "ESC-2210",
      severity: "high",
      title: "Collections down 9% on the quarter",
      detail:
        "The practice manager has asked for an explanation before the next board meeting. Operational metrics do not obviously account for the gap.",
      owner: "Client Services",
      slaHoursRemaining: 30,
      financialImpact: 512_000,
    },
    {
      id: "ESC-2204",
      severity: "medium",
      title: "Submissions pod running on two analysts with no lead",
      detail:
        "SUB-01 has had no permanent lead since the clearinghouse migration. Shrinkage is 22% against a 12% plan.",
      owner: "Operations",
      slaHoursRemaining: 120,
      financialImpact: 0,
    },
  ],
};

/**
 * The rubric a trainer grades against. Deliberately about judgement rather than recall:
 * the numbers are on the screen, so scoring someone for reading them off would measure
 * nothing.
 */
export const RUBRIC = [
  {
    criterion: "Found the actual cause",
    max: 5,
    guidance:
      "Did they reach the root cause, or stop at the metric that moved? Stopping at 'denial rate is up' is a 1. Naming the unreconciled submission gap is a 5.",
  },
  {
    criterion: "Separated recoverable from lost",
    max: 5,
    guidance:
      "Timely-filing denials at a 3% overturn rate are not worth working. Did they say so, and redirect effort to what can still be collected?",
  },
  {
    criterion: "Proposed a control, not just a fix",
    max: 5,
    guidance:
      "Reworking the claims is a fix. A submitted-against-accepted reconciliation with a named owner is a control. Only the second one stops it recurring.",
  },
  {
    criterion: "Capacity decision is defensible",
    max: 5,
    guidance:
      "Does their staffing choice hold SLA at an affordable cost to collect, and can they explain the trade-off they accepted?",
  },
  {
    criterion: "Executive summary lands",
    max: 5,
    guidance:
      "Would a client executive know what happened, what it cost, who owns it and what happens next, without asking a follow-up question?",
  },
] as const;
