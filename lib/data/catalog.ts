/**
 * Programs, pricing and mentoring. One module so a price is never written twice.
 *
 * Currency note: programs and mentoring are priced in INR because the learners are in
 * India. Client telemetry stays in USD because the payers and collections are US. Both
 * are correct at the same time, and neither converts into the other anywhere on the site.
 */

export interface Level {
  n: number;
  verb: string;
  title: string;
  who: string;
  outcome: string;
  modules: string[];
}

/** The five-level framework. Learn, Perform, Master, Lead, Execute. */
export const LEVELS: Level[] = [
  {
    n: 1,
    verb: "Learn",
    title: "RCM Foundation",
    who: "No healthcare background. Targeting a first revenue cycle role.",
    outcome: "You can explain a claim's journey end to end and read an EOB without help.",
    modules: [
      "Introduction to US healthcare",
      "Insurance fundamentals: commercial, Medicare, Medicaid, TPA",
      "The revenue cycle end to end",
      "Medical terminology for RCM",
      "Patient registration and demographics",
      "Eligibility and benefits",
      "Charge entry and claim submission",
      "Reading an EOB and an ERA",
    ],
  },
  {
    n: 2,
    verb: "Perform",
    title: "RCM Operations",
    who: "One to six years in billing, AR, posting or eligibility.",
    outcome: "You work a queue to a target and defend your numbers in a huddle.",
    modules: [
      "Claim lifecycle and clearinghouse rejections",
      "Denial taxonomy: CARC and RARC to root cause",
      "AR aging strategy beyond the 30/60/90 split",
      "Payer follow-up that closes rather than touches",
      "Appeals that win, and the ones not worth filing",
      "Payment posting and variance",
      "Underpayment detection against contracted rates",
      "Productivity and quality on your own book of work",
    ],
  },
  {
    n: 3,
    verb: "Master",
    title: "Operational Excellence",
    who: "SMEs and senior analysts who are asked why the number moved.",
    outcome: "You run a root cause analysis and produce a corrective action plan that holds.",
    modules: [
      "Denial prevention rather than denial working",
      "Root cause analysis and the five whys",
      "KPI design: what to measure and what to ignore",
      "Productivity baselining that survives scrutiny",
      "Quality frameworks and audit sampling",
      "SLA construction and defence",
      "Client reporting that says something",
      "Process improvement and control plans",
    ],
  },
  {
    n: 4,
    verb: "Lead",
    title: "Team and Operations Leadership",
    who: "Team leads and assistant managers taking on people and metric ownership.",
    outcome: "You own a capacity model and a team's performance, and can explain both.",
    modules: [
      "People management in an operations floor",
      "Workforce planning and capacity models",
      "Shrinkage, attrition and backfill lead time",
      "Performance management and coaching conversations",
      "Escalation handling and client communication",
      "Governance meetings and monthly business reviews",
      "Documentation, SOPs and knowledge transfer",
      "Building a bench",
    ],
  },
  {
    n: 5,
    verb: "Execute",
    title: "Executive Leadership",
    who: "Managers and directors accountable for margin, clients and portfolios.",
    outcome: "You take a portfolio into a board conversation and leave with decisions.",
    modules: [
      "Strategic operations and portfolio thinking",
      "P&L fundamentals and client profitability",
      "Cost to collect and FTE economics",
      "Executive dashboards and the narrative around them",
      "Organisational design for delivery",
      "Transitions, go-lives and new logo playbooks",
      "Automation business cases: bot against headcount",
      "Risk, business continuity and executive communication",
    ],
  },
];

export interface Program {
  id: string;
  tier: string;
  name: string;
  level: number;
  who: string;
  price: number;
  weeks: string;
  flag?: string;
  artefact: string;
  outcomes: string[];
}

/** Five flagship programs. Priced in INR. */
export const PROGRAMS: Program[] = [
  {
    id: "foundation",
    tier: "TIER 01",
    name: "RCM Foundation",
    level: 1,
    who: "No healthcare background. Targeting a first revenue cycle role.",
    price: 2999,
    weeks: "6 weeks",
    artefact: "A worked claim file you can walk an interviewer through",
    outcomes: [
      "US payer landscape: commercial, Medicare, Medicaid, TPA",
      "The claim lifecycle end to end, 837 out and 835 back",
      "Reading an EOB and an ERA line by line",
      "CPT, ICD-10-CM, HCPCS and modifier logic",
      "Interview simulation on real denial scenarios",
    ],
  },
  {
    id: "billing",
    tier: "TIER 02",
    name: "Medical Billing Operations",
    level: 2,
    who: "Billing and charge entry teams wanting depth and speed.",
    price: 4999,
    weeks: "8 weeks",
    artefact: "A rejection trend analysis on a live extract",
    outcomes: [
      "Charge entry, claim creation and scrubbing",
      "Clearinghouse rejections and corrections",
      "Billing quality frameworks and audit sampling",
      "Productivity targets that hold under audit",
      "Billing KPIs and what they hide",
    ],
  },
  {
    id: "ar-denials",
    tier: "TIER 03",
    name: "AR and Denial Management",
    level: 2,
    who: "One to six years in AR, denials or payment posting.",
    price: 5999,
    weeks: "10 weeks",
    artefact: "An appeal packet and a denial root cause memo",
    outcomes: [
      "Denial taxonomy: CARC and RARC to root cause, not to bucket",
      "CO-45, CO-97 and PR-204 appeals that actually win",
      "AR aging strategy beyond the 30/60/90 split",
      "Underpayment detection against contracted rates",
      "SQL and pivot work on live claim extracts",
    ],
  },
  {
    id: "operations",
    tier: "TIER 04",
    name: "RCM Operations Management",
    level: 4,
    who: "SMEs and team leads moving into people and metric ownership.",
    price: 9999,
    weeks: "14 weeks",
    flag: "Most requested",
    artefact: "A capacity model and a monthly business review deck",
    outcomes: [
      "Productivity baselining and fair capacity models",
      "SLA and QA design that survives a client audit",
      "Shrinkage, attrition and workforce planning maths",
      "Root cause workshops and corrective action plans",
      "Running a monthly business review end to end",
    ],
  },
  {
    id: "executive",
    tier: "TIER 05",
    name: "Executive Fellowship",
    level: 5,
    who: "Managers and directors accountable for margin and clients.",
    price: 19999,
    weeks: "6 months, cohort",
    artefact: "A portfolio review pack you could take to a client board",
    outcomes: [
      "Cost to collect, FTE economics and pricing models",
      "Governance architecture across a multi-client portfolio",
      "Transition and go-live playbooks for new logos",
      "Automation business cases: bot against headcount",
      "Board-level narrative for revenue leakage",
    ],
  },
];

export interface Bundle {
  id: string;
  name: string;
  includes: string[];
  price: number;
  saving: number;
  who: string;
}

export const BUNDLES: Bundle[] = [
  {
    id: "beginner",
    name: "Beginner track",
    includes: ["foundation", "billing"],
    price: 6999,
    saving: 999,
    who: "Entering the industry and want the first two levels together.",
  },
  {
    id: "professional",
    name: "Professional track",
    includes: ["billing", "ar-denials"],
    price: 9499,
    saving: 1499,
    who: "Already working a queue and want depth across billing and AR.",
  },
  {
    id: "leadership",
    name: "Leadership track",
    includes: ["ar-denials", "operations"],
    price: 14499,
    saving: 1499,
    who: "Moving from doing the work to owning the numbers.",
  },
];

export interface MentoringOption {
  id: string;
  minutes: number;
  name: string;
  price: number;
  who: string;
  leaveWith: string;
}

export const MENTORING: MentoringOption[] = [
  {
    id: "career",
    minutes: 30,
    name: "Career consultation",
    price: 999,
    who: "Deciding whether to enter RCM, or which lane to take inside it.",
    leaveWith: "A written next step and the two skills to build first",
  },
  {
    id: "professional",
    minutes: 45,
    name: "Professional guidance",
    price: 1499,
    who: "Stuck on a real problem: a denial trend, a QA dispute, an appraisal case.",
    leaveWith: "A root cause sheet or a rewritten CV, whichever the problem called for",
  },
  {
    id: "leadership",
    minutes: 60,
    name: "Leadership mentoring",
    price: 2500,
    who: "Preparing for a lead or manager role, or already in one and drowning.",
    leaveWith: "A capacity model or a governance deck outline for your own floor",
  },
  {
    id: "roadmap",
    minutes: 90,
    name: "Executive career roadmap",
    price: 4500,
    who: "Targeting manager, director or AVP within the next 12 months.",
    leaveWith: "A twelve-month plan mapped against the six-rung ladder",
  },
];

export const CORPORATE = {
  headline: "Corporate and cohort training",
  body: "Teams of ten and above run as a private cohort against your own denial mix, your own aging report and your own SLA. Pricing is per engagement, not per seat.",
  includes: [
    "Curriculum mapped to your payer mix and specialty",
    "Your anonymised extracts used as the working data",
    "Manager dashboard on cohort progress",
    "SOP and benchmark library licensed to your team",
    "Quarterly refresh as payer policy changes",
  ],
};

export const FAQ = [
  {
    q: "Do I need a healthcare background to start?",
    a: "No. Tier 01 assumes nothing and starts at what a payer is and why a claim exists. Around a third of the people who take it come from a non-healthcare BPO or from college.",
  },
  {
    q: "Is there a certificate?",
    a: "Every tier ends with a portfolio artefact instead: a worked claim file, a denial root cause memo, a capacity model, a review deck. A hiring manager can read those. A certificate mostly proves you paid.",
  },
  {
    q: "How is this different from a coding course?",
    a: "Coding teaches you to assign a code. This teaches you to run the operation that gets the claim paid, and then to run the team that runs the operation. The two overlap for about one module.",
  },
  {
    q: "Are sessions live or recorded?",
    a: "Programs are self-paced with structured checkpoints. Mentoring is live, one to one, and is the only place where your own data is on the screen.",
  },
  {
    q: "Can my employer pay?",
    a: "Yes. Invoices are raised against the company and GST details are captured at checkout. For ten or more people the corporate cohort is cheaper than individual seats.",
  },
  {
    q: "What is the refund policy?",
    a: "Seven days from purchase, provided less than 20 percent of the program has been accessed. Mentoring is refundable up to 24 hours before the session. The full terms are on the refund page.",
  },
];

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
