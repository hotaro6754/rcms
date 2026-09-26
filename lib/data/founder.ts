/**
 * Founder facts. Only what is verified goes here; the homepage and the About page both read
 * this module so a claim is never written twice or embellished in one place.
 */

export const FOUNDER = {
  name: "V K Chakradhar Gangaraju",
  role: "US Healthcare Revenue Cycle Operations",
  years: 21,
  focus: "Operations leadership, governance, process improvement, people development",
};

export const CAREER: [string, string][] = [
  ["Operations delivery", "Multi-client revenue cycle delivery across physician and hospital billing, onshore and offshore."],
  ["People leadership", "Building and running AR, denials, posting, eligibility and coding support teams."],
  ["Governance", "Monthly and quarterly client reviews, SLA construction, corrective action planning."],
  ["Process improvement", "Root cause programs, quality frameworks, productivity baselining and automation cases."],
];

/** The role ladder: what each level of the job is trusted to own, and the numbers that prove it. */
export const ROLE_LADDER = [
  { level: "L1", role: "Associate", owns: "Your own output", metrics: "Touches per day, QA score" },
  { level: "L2", role: "Senior Analyst", owns: "A payer or a denial category", metrics: "First-pass rate, appeal win rate" },
  { level: "L3", role: "Subject Matter Expert", owns: "Why the number moved", metrics: "Denial trend, RCA closure" },
  { level: "L4", role: "Team Lead", owns: "A capacity model", metrics: "Productivity, shrinkage, SLA" },
  { level: "L5", role: "Operations Manager", owns: "A P&L line and a client", metrics: "A/R over 90, cost to collect" },
  { level: "L6", role: "Director / AVP", owns: "A portfolio", metrics: "Margin, net collection rate" },
];
