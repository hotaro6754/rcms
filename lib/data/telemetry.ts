/**
 * SINGLE SOURCE OF TRUTH.
 *
 * The hero and the dashboard read the same values from this module. No metric is ever
 * hard-coded twice. This is what makes the Flip read as one product rather than two mock-ups:
 * the number the hero resolves to is literally the number the MetricCard renders.
 *
 * Client engagement: Meridian Cardiology Partners, a 34-provider cardiology group.
 * Money is USD (US payers, US collections). Delivery cost is USD-normalised offshore cost.
 */

export type MetricId =
  | "queue-depth"
  | "days-in-ar"
  | "ar-over-90"
  | "first-pass"
  | "denial-rate"
  | "clean-claim"
  | "cost-to-collect"
  | "sla-adherence";

export type Health = "on-target" | "at-risk" | "breach";
export type Direction = "lower-is-better" | "higher-is-better";

/** Why the number moved, who owns it, and what happens next. */
export interface Narrative {
  driver: string;
  affectedClaims?: number;
  financialImpact?: number;
  owner: string;
  nextAction: string;
}

export interface Metric {
  id: MetricId;
  label: string;
  short: string;
  unit: "count" | "days" | "percent";
  /** Where this metric stood six periods ago. The hero's "before". */
  before: number;
  /** Where it stands now. The hero's "after" and the dashboard's current value. */
  current: number;
  target: number;
  direction: Direction;
  precision: number;
  /** Six trailing periods, oldest first. series[0] === before, series.at(-1) === current. */
  series: number[];
  narrative: Narrative;
}

export const PERIODS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"] as const;

export const CLIENT = {
  name: "Meridian Cardiology Partners",
  specialty: "Cardiology",
  providers: 34,
  monthlyCollections: 1_280_000,
  reviewPeriod: "September 2026",
} as const;

/**
 * The story these numbers tell, and it must stay coherent across every surface:
 * the operation is winning on inventory (queue, AR, first-pass all improving sharply)
 * and losing on denials, because a payer policy update in August was never mapped.
 * That single fact drives the RCA board, the escalation, the risk matrix and the actions.
 */
export const METRICS: Record<MetricId, Metric> = {
  "queue-depth": {
    id: "queue-depth",
    label: "AR worklist depth",
    short: "Queue depth",
    unit: "count",
    before: 42_000,
    current: 9_400,
    target: 12_000,
    direction: "lower-is-better",
    precision: 0,
    series: [42_000, 36_800, 30_100, 23_400, 15_200, 9_400],
    narrative: {
      driver: "Capacity reallocation into aged inventory, plus eligibility automation clearing front-end rework before human touch",
      affectedClaims: 32_600,
      financialImpact: 4_180_000,
      owner: "Operations",
      nextAction: "Hold staffing through October, then rebalance two analysts to denials",
    },
  },
  "days-in-ar": {
    id: "days-in-ar",
    label: "Days in A/R",
    short: "Days in A/R",
    unit: "days",
    before: 51,
    current: 38,
    target: 40,
    direction: "lower-is-better",
    precision: 0,
    series: [51, 49, 47, 44, 41, 38],
    narrative: {
      driver: "Reduced >90 day inventory",
      affectedClaims: 12_400,
      financialImpact: 1_940_000,
      owner: "AR Management",
      nextAction: "Sustain; risk is denial backlog re-ageing into the 90+ bucket in November",
    },
  },
  "ar-over-90": {
    id: "ar-over-90",
    label: "A/R over 90 days",
    short: "A/R > 90",
    unit: "percent",
    before: 22.6,
    current: 14.2,
    target: 18,
    direction: "lower-is-better",
    precision: 1,
    series: [22.6, 21.4, 19.8, 17.6, 15.9, 14.2],
    narrative: {
      driver: "Aged worklist prioritised ahead of fresh claims for two consecutive cycles",
      affectedClaims: 8_900,
      financialImpact: 2_310_000,
      owner: "AR Management",
      nextAction: "Maintain the aged-first rule until the denial spike is contained",
    },
  },
  "first-pass": {
    id: "first-pass",
    label: "First-pass resolution",
    short: "First-pass",
    unit: "percent",
    before: 78.2,
    current: 89.4,
    target: 88,
    direction: "higher-is-better",
    precision: 1,
    series: [78.2, 80.1, 82.6, 85.0, 87.3, 89.4],
    narrative: {
      driver: "QA audit bar raised to 93%, which cut rework at the cost of ~4 touches per analyst per day",
      affectedClaims: 6_200,
      financialImpact: 780_000,
      owner: "Quality",
      nextAction: "Hold the bar; do not trade it back for volume during the denial recovery",
    },
  },
  "denial-rate": {
    id: "denial-rate",
    label: "Denial rate",
    short: "Denial rate",
    unit: "percent",
    before: 8.2,
    current: 10.4,
    target: 8.5,
    direction: "lower-is-better",
    precision: 1,
    series: [8.2, 8.4, 8.1, 8.6, 9.0, 10.4],
    narrative: {
      driver: "Payer policy update effective 01 Aug was never mapped to the authorisation workflow",
      affectedClaims: 312,
      financialImpact: 184_000,
      owner: "Revenue Integrity",
      nextAction: "Review affected worklist and back-date the authorisation rule to 01 Aug",
    },
  },
  "clean-claim": {
    id: "clean-claim",
    label: "Clean claim rate",
    short: "Clean claim",
    unit: "percent",
    before: 91.2,
    current: 93.1,
    target: 95,
    direction: "higher-is-better",
    precision: 1,
    series: [91.2, 91.8, 92.4, 93.0, 93.4, 93.1],
    narrative: {
      driver: "Improving on registration edits, but pulled back 0.3 points by the same unmapped policy",
      affectedClaims: 210,
      financialImpact: 96_000,
      owner: "Registration",
      nextAction: "Add the policy edit at charge entry rather than catching it downstream",
    },
  },
  "cost-to-collect": {
    id: "cost-to-collect",
    label: "Cost to collect",
    short: "Cost to collect",
    unit: "percent",
    before: 3.9,
    current: 3.09,
    target: 3.4,
    direction: "lower-is-better",
    precision: 2,
    series: [3.9, 3.7, 3.5, 3.3, 3.2, 3.09],
    narrative: {
      driver: "Automation coverage absorbed volume growth without adding headcount",
      financialImpact: 124_000,
      owner: "Delivery",
      nextAction: "Model the denial recovery before approving any overtime",
    },
  },
  "sla-adherence": {
    id: "sla-adherence",
    label: "SLA adherence",
    short: "SLA",
    unit: "percent",
    before: 94.1,
    current: 98.1,
    target: 96,
    direction: "higher-is-better",
    precision: 1,
    series: [94.1, 95.0, 96.2, 97.0, 97.4, 98.1],
    narrative: {
      driver: "Backlog burn cleared the aged queue ahead of the contractual window",
      owner: "Operations",
      nextAction: "No action; this is the metric to lead the review with",
    },
  },
};

/** The four the hero resolves. Order is the order they appear in the reveal. */
export const HERO_METRICS: MetricId[] = ["queue-depth", "days-in-ar", "ar-over-90", "first-pass"];

export const metric = (id: MetricId): Metric => METRICS[id];
export const allMetrics = (): Metric[] => Object.values(METRICS);

// ---------------------------------------------------------------------------
// Derived helpers. Nothing downstream recomputes these by hand.
// ---------------------------------------------------------------------------

export function variance(m: Metric): number {
  return +(m.current - m.target).toFixed(m.precision);
}

export function health(m: Metric): Health {
  const v = m.current - m.target;
  const miss = m.direction === "lower-is-better" ? v : -v;
  if (miss <= 0) return "on-target";
  const tolerance = Math.abs(m.target) * 0.08;
  return miss <= tolerance ? "at-risk" : "breach";
}

/** Percent change from the previous period, signed so negative always means "went down". */
export function periodDelta(m: Metric): number {
  const prev = m.series[m.series.length - 2];
  if (!prev) return 0;
  return +(((m.current - prev) / prev) * 100).toFixed(1);
}

/** Is the most recent move in the direction we want? */
export function deltaIsGood(m: Metric): boolean {
  const d = periodDelta(m);
  if (d === 0) return true;
  return m.direction === "lower-is-better" ? d < 0 : d > 0;
}

export function formatValue(m: Metric, value = m.current): string {
  if (m.unit === "count") return new Intl.NumberFormat("en-US").format(Math.round(value));
  if (m.unit === "percent") return `${value.toFixed(m.precision)}%`;
  return value.toFixed(m.precision);
}

export function unitSuffix(m: Metric): string {
  if (m.unit === "percent") return "%";
  if (m.unit === "days") return " days";
  return "";
}

// ---------------------------------------------------------------------------
// Capacity model. Ported from the original academy.html and kept as the real
// business logic it was: touch capacity -> backlog burn -> AR>90 -> cost to collect.
// ---------------------------------------------------------------------------

export const CAPACITY_BASELINE = {
  /** Current open worklist, not the historical 42,000 the engagement started from. */
  openClaims: 9_400,
  /** 34 providers at roughly 23 billable encounters a day. */
  dailyInflow: 780,
  monthlyCollections: CLIENT.monthlyCollections,
  /** Fully loaded offshore analyst cost, USD per month. */
  costPerAnalyst: 1_050,
  /** Automation licence cost per point of coverage, USD per month. */
  costPerAutomationPoint: 260,
  /** Touches per analyst per day at an 86% audit bar. */
  baseTouchesPerAnalyst: 46,
  /** Touches lost per point of audit coverage above 86%. */
  touchesLostPerQaPoint: 0.54,
} as const;

export interface CapacityInput {
  analysts: number;
  qaBar: number;
  automation: number;
}

export interface CapacityResult extends CapacityInput {
  touchesPerAnalyst: number;
  capacity: number;
  net: number;
  daysToClear: number | null;
  firstPass: number;
  arOver90: number;
  monthlyCost: number;
  costToCollect: number;
  requiredAnalysts: number;
  utilisation: number;
  status: Health;
  headline: string;
  reasoning: string;
}

/**
 * The verdict engine. Preserved from the original build because the written operator
 * reasoning, not the number, is the thing that teaches.
 */
export function runCapacityModel({ analysts, qaBar, automation }: CapacityInput): CapacityResult {
  const b = CAPACITY_BASELINE;
  const touchesPerAnalyst = b.baseTouchesPerAnalyst - (qaBar - 86) * b.touchesLostPerQaPoint;
  const botCapacity = b.dailyInflow * (automation / 100) * 1.35;
  const capacity = Math.round(analysts * touchesPerAnalyst + botCapacity);

  /** Whatever is left after the day's arrivals is what attacks the standing worklist. */
  const net = capacity - b.dailyInflow;
  const daysToClear = net > 0 ? Math.ceil(b.openClaims / net) : null;

  const firstPass = Math.min(97.5, 78 + (qaBar - 86) * 0.95 + automation * 0.075);

  /**
   * A/R over 90 tracks how long inventory sits, not how big it is: the slower the
   * worklist turns over, the more of it crosses the ninety-day line. Capped at 34,
   * the level this engagement started from.
   */
  const arOver90 = net > 0 ? Math.min(34, 6.5 + Math.min(27.5, daysToClear! * 0.09)) : 34;

  const monthlyCost = analysts * b.costPerAnalyst + automation * b.costPerAutomationPoint;
  const costToCollect = (monthlyCost / b.monthlyCollections) * 100;

  const requiredAnalysts = Math.ceil((b.dailyInflow - botCapacity) / touchesPerAnalyst);
  const utilisation = analysts > 0 ? Math.min(140, (requiredAnalysts / analysts) * 100) : 0;

  let status: Health;
  let headline: string;
  let reasoning: string;

  if (net <= 0) {
    status = "breach";
    headline = "Capacity below inflow";
    reasoning =
      "The queue grows every day no matter how well the team performs. This is a staffing decision, not a performance conversation.";
  } else if (arOver90 >= 18) {
    status = "breach";
    headline = "SLA ceiling breached";
    reasoning =
      "A/R over 90 crosses the 18% ceiling written into the contract. Expect a corrective action plan request at the next monthly review.";
  } else if (costToCollect > 3.4) {
    status = "at-risk";
    headline = "Margin threshold exceeded";
    reasoning =
      "SLA holds, but cost to collect is above the 3.4% margin threshold. You are buying the metric with headcount. Defend it with the automation case instead.";
  } else if (firstPass < 85) {
    status = "at-risk";
    headline = "Quality traded for volume";
    reasoning =
      "Volume is being met by lowering the audit bar. Rework surfaces as a denial spike in roughly two cycles.";
  } else {
    status = "on-target";
    headline = "On plan";
    reasoning =
      "Backlog clears inside the SLA window at an affordable cost to collect. This is the version to take into the client review.";
  }

  return {
    analysts,
    qaBar,
    automation,
    touchesPerAnalyst,
    capacity,
    net,
    daysToClear,
    firstPass,
    arOver90,
    monthlyCost,
    costToCollect,
    requiredAnalysts,
    utilisation,
    status,
    headline,
    reasoning,
  };
}

/** The staffing the September numbers were actually produced with. */
export const CURRENT_CAPACITY: CapacityInput = { analysts: 18, qaBar: 93, automation: 15 };

// ---------------------------------------------------------------------------
// Denial inventory. Preserved CARC/RARC data; drives the RCA board and the queues.
// ---------------------------------------------------------------------------

export interface DenialCategory {
  code: string;
  reason: string;
  owner: string;
  claims: number;
  value: number;
  overturnRate: number;
  status: "working" | "queued" | "front-end" | "not-appealable" | "write-off";
  /** Set on the category currently under root-cause analysis. */
  underRca?: boolean;
}

export const DENIALS: DenialCategory[] = [
  { code: "CO-45", reason: "Charge exceeds fee schedule", owner: "Contracting", claims: 3_412, value: 2_810_000, overturnRate: 12, status: "not-appealable" },
  { code: "CO-50", reason: "Not deemed medically necessary", owner: "Revenue Integrity", claims: 312, value: 184_000, overturnRate: 68, status: "working", underRca: true },
  { code: "CO-97", reason: "Bundled into another service", owner: "Coding", claims: 1_876, value: 1_440_000, overturnRate: 61, status: "working" },
  { code: "PR-204", reason: "Not covered under the plan", owner: "Eligibility", claims: 1_204, value: 930_000, overturnRate: 8, status: "front-end" },
  { code: "CO-16", reason: "Missing or invalid information", owner: "Registration", claims: 988, value: 610_000, overturnRate: 74, status: "working" },
  { code: "CO-29", reason: "Timely filing limit expired", owner: "AR", claims: 742, value: 580_000, overturnRate: 4, status: "write-off" },
  { code: "CO-11", reason: "Diagnosis inconsistent with procedure", owner: "Coding", claims: 531, value: 400_000, overturnRate: 57, status: "queued" },
];

// ---------------------------------------------------------------------------
// Pod roster. Preserved; drives roster, capacity ownership and escalation routing.
// ---------------------------------------------------------------------------

export interface Pod {
  id: string;
  fn: string;
  lead: string;
  analysts: number;
  touchesPerDay: number;
  qa: number;
  shrinkage: number;
  capacity: "headroom" | "healthy" | "tight" | "at-risk";
}

export const PODS: Pod[] = [
  { id: "AR-01", fn: "Aged A/R", lead: "Vidya R.", analysts: 5, touchesPerDay: 41.2, qa: 94.1, shrinkage: 11, capacity: "healthy" },
  { id: "AR-02", fn: "Fresh A/R", lead: "Sandeep K.", analysts: 4, touchesPerDay: 36.8, qa: 91.7, shrinkage: 18, capacity: "tight" },
  { id: "DEN-01", fn: "Denials", lead: "Priya S.", analysts: 4, touchesPerDay: 28.4, qa: 96.2, shrinkage: 9, capacity: "healthy" },
  { id: "POST-01", fn: "Payment posting", lead: "Arun M.", analysts: 3, touchesPerDay: 63.9, qa: 98.0, shrinkage: 7, capacity: "headroom" },
  { id: "ELIG-01", fn: "Eligibility", lead: "Unassigned", analysts: 2, touchesPerDay: 52.1, qa: 88.3, shrinkage: 26, capacity: "at-risk" },
];

// ---------------------------------------------------------------------------
// The claim lifecycle the hero draws.
// ---------------------------------------------------------------------------

export const LIFECYCLE = [
  { id: "charge", label: "Charge", detail: "Encounter coded and posted" },
  { id: "claim", label: "Claim", detail: "837 transmitted to the clearinghouse" },
  { id: "payer", label: "Payer", detail: "Adjudication against plan rules" },
  { id: "era", label: "835", detail: "Remittance returned" },
  { id: "posting", label: "Posting", detail: "Cash applied, variance worked" },
] as const;
