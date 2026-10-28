/**
 * KPI definitions (blueprint §10). Every figure on a dashboard has one: what it is for, how it
 * is calculated, the population and exclusions, where the data comes from and who owns it.
 *
 * Targets and thresholds are deliberately empty. The blueprint is explicit that universal
 * targets should not be presented without a contract, payer rule or validated benchmark;
 * the Academy sets them per KPI once it has a basis, and until then the dashboards show
 * the figure without a red/amber/green judgement.
 */

export interface KpiDefinition {
  key: string;
  name: string;
  purpose: string;
  formula: string;
  numerator?: string;
  denominator?: string;
  population: string;
  exclusions: string;
  source: string;
  frequency: string;
  target: string | null;
  warning: string | null;
  critical: string | null;
  owner: string;
  reviewer: string;
  drillDown: string;
  effectiveDate: string;
}

const EFFECTIVE = "2026-10-15";
const base = { target: null, warning: null, critical: null, effectiveDate: EFFECTIVE, frequency: "On demand; reviewed weekly and monthly" };

export const KPIS: Record<string, KpiDefinition> = {
  registered: { ...base, key: "registered", name: "Registered subscribers", purpose: "Size of the learner base.", formula: "Count of learner accounts", population: "Accounts with the learner role", exclusions: "Staff and vendor accounts; anonymised (deleted) accounts", source: "User", owner: "Subscriber Administration", reviewer: "Academy Director", drillDown: "Subscriber directory" },
  active: { ...base, key: "active", name: "Active subscribers", purpose: "Learners currently able to learn.", formula: "Count of learner accounts in Active, Trial or Grace period status", population: "Learner accounts", exclusions: "Suspended, deactivated, archived, pending verification", source: "User.status", owner: "Subscriber Administration", reviewer: "Academy Director", drillDown: "Subscriber directory filtered by status" },
  newEnrolments: { ...base, key: "newEnrolments", name: "New enrolments", purpose: "Is enrolment growing?", formula: "Enrolments created in the period", population: "All enrolment sources", exclusions: "None", source: "Enrolment.createdAt", owner: "Academic Operations", reviewer: "Academy Director", drillDown: "Level › course" },
  completionRate: { ...base, key: "completionRate", name: "Course completion rate", purpose: "Are learners finishing what they start?", formula: "Completed ÷ eligible enrolments × 100", numerator: "Enrolments in Completed state (all requirements met and certificate claimed)", denominator: "Enrolments in Active or Completed state started at least 7 days before the period end", population: "Learner enrolments", exclusions: "Cancelled, refunded, suspended enrolments; staff accounts", source: "Enrolment", owner: "Academic Operations", reviewer: "Academy Director", drillDown: "Level › course › module › subscriber" },
  passRate: { ...base, key: "passRate", name: "Assessment pass rate", purpose: "Are assessments calibrated and learners prepared?", formula: "Passed ÷ graded attempts × 100", numerator: "Graded attempts with passed = true", denominator: "Graded or expired attempts in the period", population: "All assessment attempts", exclusions: "In-progress and pending-review attempts", source: "QuizAttempt", owner: "Academic Reviewer", reviewer: "Academy Director", drillDown: "Course › assessment › question" },
  revenue: { ...base, key: "revenue", name: "Net collected revenue", purpose: "Is RCMExcel generating sustainable revenue?", formula: "Paid order value − confirmed refunds, in the period", numerator: "Sum of Order.amount for paid orders", denominator: "—", population: "Orders paid through the payment provider", exclusions: "Complimentary and admin enrolments (no order); unconfirmed refunds", source: "Order, Refund", owner: "Finance", reviewer: "Academy Director", drillDown: "Level › course › order" },
  refunds: { ...base, key: "refunds", name: "Refund value", purpose: "Watch refund volume and exceptions.", formula: "Sum of confirmed refunds in the period", population: "Refunds", exclusions: "Requested or rejected refunds", source: "Refund", owner: "Finance", reviewer: "Academy Director", drillDown: "Refund register" },
  failedPayments: { ...base, key: "failedPayments", name: "Failed payments", purpose: "Spot checkout or provider problems early.", formula: "Orders that moved to Failed in the period", population: "Orders", exclusions: "Abandoned checkouts still in Created", source: "Order", owner: "Finance", reviewer: "Academy Director", drillDown: "Orders filtered by failed" },
  openCases: { ...base, key: "openCases", name: "Active support cases", purpose: "Support load and backlog.", formula: "Tickets not Resolved or Closed", population: "All support tickets", exclusions: "None", source: "SupportTicket", owner: "Support Manager", reviewer: "Academy Director", drillDown: "Support queue" },
  satisfaction: { ...base, key: "satisfaction", name: "Subscriber satisfaction", purpose: "Are subscribers satisfied with support?", formula: "Mean of 1–5 ratings given on resolved tickets in the period", population: "Rated tickets", exclusions: "Unrated tickets", source: "SupportTicket.rating", owner: "Support Manager", reviewer: "Academy Director", drillDown: "Rated tickets" },
  awaitingApproval: { ...base, key: "awaitingApproval", name: "Content awaiting approval", purpose: "Review throughput.", formula: "Courses in Academic review, Compliance review or Approved", population: "Courses", exclusions: "Archived", source: "Program.status", owner: "Academy Director", reviewer: "Compliance Reviewer", drillDown: "Review queue" },
  complianceBacklog: { ...base, key: "complianceBacklog", name: "Compliance-review backlog", purpose: "Compliance review capacity.", formula: "Courses in Compliance review", population: "Courses", exclusions: "—", source: "Program.status", owner: "Compliance Reviewer", reviewer: "Academy Director", drillDown: "Review queue" },
  firstResponse: { ...base, key: "firstResponse", name: "Average first-response time", purpose: "How quickly learners hear back.", formula: "Mean of (first staff reply − ticket created), hours", population: "Tickets with a staff reply created in the period", exclusions: "Tickets with no staff reply yet", source: "SupportTicket.firstResponseAt", owner: "Support Manager", reviewer: "Academy Director", drillDown: "Agent › ticket" },
  paymentSuccess: { ...base, key: "paymentSuccess", name: "Payment success rate", purpose: "Checkout health.", formula: "Paid ÷ (paid + failed) orders × 100", numerator: "Orders paid in the period", denominator: "Orders paid or failed in the period", population: "Orders that reached the provider", exclusions: "Orders still Created (abandoned)", source: "Order", owner: "Finance", reviewer: "Academy Director", drillDown: "Orders" },
  acceptanceRate: { ...base, key: "acceptanceRate", name: "Deliverable acceptance rate", purpose: "Vendor content quality.", formula: "Accepted ÷ (accepted + rejected + changes requested) × 100", population: "Vendor deliverables reviewed", exclusions: "Not yet submitted", source: "Deliverable", owner: "Vendor Manager", reviewer: "Academy Director", drillDown: "Vendor › deliverable" },
};
