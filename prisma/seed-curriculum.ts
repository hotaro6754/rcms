import type { PrismaClient } from "@prisma/client";

/**
 * The Academy curriculum from the Website Development Specification (v1.0, 12 Nov 2026, §6):
 * four progressive levels, one course per level, each module holding one lesson ready for its
 * three formats (video, slides, reading). Created as DRAFT shells: nothing is published, priced
 * or visible to learners until the course team adds the content and the course passes academic
 * and compliance review in the Admin CMS.
 *
 * Create-if-missing, like every seed: once a course exists, the Admin CMS owns it.
 */

const DISCLAIMER =
  "Educational content only. Not legal advice, medical advice, official regulatory guidance, payer-specific instructions or a substitute for an organisation's policies and compliance program. Regulations, coding guidelines, reimbursement requirements and payer policies change: verify current requirements with official sources before applying them.";

export const SPEC_LEVELS = [
  {
    slug: "beginner",
    name: "Beginner",
    displayTitle: "Beginner — US Healthcare RCM Foundation",
    sequence: 1,
    accent: "teal",
    shortDescription: "The US healthcare ecosystem, its participants and the end-to-end physician RCM claim lifecycle.",
    description:
      "For freshers, graduates, new RCM employees and professionals moving into US Healthcare Revenue Cycle Management. Builds the vocabulary and process foundation, from the 3Ps to the claim lifecycle and HIPAA awareness.",
    audience: "Freshers, graduates, new RCM employees and professionals transitioning into US Healthcare RCM.",
    prerequisites: ["None"],
    outcomes: ["Explain the US Healthcare ecosystem and core RCM participants", "Use common US healthcare and RCM terminology", "Describe the end-to-end physician RCM claim lifecycle"],
    coreTopics: ["Introduction to US Healthcare", "Providers, payers and patients", "Claim lifecycle", "Patient access", "Coding overview", "Claims, payments and AR", "HIPAA awareness"],
    estimatedEffort: "To be confirmed",
    assessmentRequirement: "Module quizzes and a final examination",
    passingCriteria: "75% (proposed; owner approval required)",
    completionRequirement: "Every lesson complete and every assessment passed",
    badgeName: "Beginner level",
  },
  {
    slug: "professional",
    name: "Professional",
    displayTitle: "Professional — Departmental Process Excellence",
    sequence: 2,
    accent: "blue",
    shortDescription: "Detailed departmental workflows and SOPs, from patient access to denials, appeals and quality.",
    description:
      "For AR, billing, coding, payment posting, eligibility, authorization, quality and experienced operations professionals. Each module follows the standard SOP template: objective, workflow, roles, errors, denials, root causes, controls, escalation, SLAs, QA and KPIs.",
    audience: "AR, billing, coding, payment posting, eligibility, authorization, quality and experienced operations professionals.",
    prerequisites: ["Beginner level or equivalent experience"],
    outcomes: ["Execute departmental workflows to SOP", "Work denials from root cause to prevention", "Apply RCA and CAPA to recurring errors"],
    coreTopics: ["Departmental SOPs", "Claim edits and rejections", "Payment posting and reconciliation", "Denial management", "AR follow-up", "Appeals", "Quality audits", "RCA and CAPA"],
    estimatedEffort: "To be confirmed",
    assessmentRequirement: "Module quizzes, scenario questions and a final examination",
    passingCriteria: "75% (proposed; owner approval required)",
    completionRequirement: "Every lesson complete and every assessment passed",
    badgeName: "Professional level",
  },
  {
    slug: "leader",
    name: "Leader",
    displayTitle: "Leader — Department and Operational Management",
    sequence: 3,
    accent: "navy",
    shortDescription: "Running a department: SLAs, KPIs, capacity, inventory, quality governance, reporting and people.",
    description:
      "For team leaders, supervisors, assistant managers, managers and account managers. Covers span of control, shrinkage and attrition, skill matrices, backlog control, SLA breach management, governance meetings, action trackers and decision logs.",
    audience: "Team leaders, supervisors, assistant managers, managers and account managers.",
    prerequisites: ["Professional level or equivalent experience"],
    outcomes: ["Govern SLAs, TATs and KPIs for a department", "Plan capacity and manage work queues", "Run an operating cadence that produces decisions"],
    coreTopics: ["SOP governance", "SLA and TAT management", "KRAs and KPIs", "Capacity planning", "Inventory and work queues", "Quality governance", "Operating cadence", "Team development"],
    estimatedEffort: "To be confirmed",
    assessmentRequirement: "Module quizzes, case studies and a final examination",
    passingCriteria: "75% (proposed; owner approval required)",
    completionRequirement: "Every lesson complete and every assessment passed",
    badgeName: "Leader level",
  },
  {
    slug: "executive",
    name: "Executive Leadership",
    displayTitle: "Executive Leadership — Strategic and Business Excellence",
    sequence: 4,
    accent: "gold",
    shortDescription: "Business outcomes: financial performance, cost to collect, ROI, client retention, transformation and risk.",
    description:
      "For senior managers, senior account managers, directors, senior directors, AVPs and aspiring RCM executives. Emphasises financial performance, margin, cost to collect, ROI, client retention, provider outcomes, transformation governance, workforce strategy and enterprise risk.",
    audience: "Senior managers, senior account managers, directors, senior directors, AVPs and aspiring RCM executives.",
    prerequisites: ["Leader level or equivalent experience"],
    outcomes: ["Connect RCM operations to business and financial outcomes", "Build business cases and govern transformation", "Lead executive reviews and strategic planning"],
    coreTopics: ["Strategic RCM operations", "Lean and Six Sigma", "Project management", "Revenue cycle economics", "Cost to collect", "ROI and business cases", "Executive governance", "Change management"],
    estimatedEffort: "To be confirmed",
    assessmentRequirement: "Module quizzes, a business simulation and a final examination",
    passingCriteria: "75% (proposed; owner approval required)",
    completionRequirement: "Every lesson complete and every assessment passed",
    badgeName: "Executive Leadership level",
  },
] as const;

const COURSES: { slug: string; level: (typeof SPEC_LEVELS)[number]["slug"]; n: number; name: string; who: string; modules: string[] }[] = [
  {
    slug: "rcm-foundation",
    level: "beginner",
    n: 1,
    name: "US Healthcare RCM Foundation",
    who: "Freshers, graduates and new RCM employees",
    modules: [
      "Introduction to US Healthcare",
      "The 3Ps – Providers, Payers and Patients",
      "Essential US Healthcare Terminology",
      "End-to-End Claim Lifecycle",
      "Patient Access Fundamentals",
      "Eligibility and Benefits Verification",
      "Prior Authorization and Precertification Basics",
      "Medical Coding Overview – ICD-10-CM, CPT and HCPCS",
      "Charge Capture and Charge Entry",
      "Claims Submission – CMS-1500 and 837P",
      "Claim Rejections and Denials – Fundamentals",
      "Payment Posting and Adjustments",
      "Accounts Receivable Follow-up",
      "Patient Billing and Collections",
      "HIPAA and Compliance Awareness",
      "RCM Performance Measurement – Beginner KPI Guide",
      "Common Operational Bottlenecks and Risk Awareness",
      "Integrated Beginner Case Study",
    ],
  },
  {
    slug: "process-excellence",
    level: "professional",
    n: 2,
    name: "Departmental Process Excellence",
    who: "AR, billing, coding, posting, eligibility, authorization and quality professionals",
    modules: [
      "Patient Access – Detailed Process and SOP",
      "Eligibility and Benefits – Workflow and SOP",
      "Authorization and Precertification – Detailed SOP",
      "Medical Coding – Workflow, Edits and Compliance",
      "Charge Capture and Charge Entry SOP",
      "Claims Generation and Submission SOP",
      "Claim Edits, Rejections and Correction Process",
      "Payment Posting and Reconciliation SOP",
      "Denial Management – End-to-End Process",
      "AR Follow-up – Process and Inventory Handling",
      "Appeals and Medical Necessity Documentation",
      "Patient Billing and Collections SOP",
      "Quality Audits and Error Identification",
      "Root Cause Analysis (RCA)",
      "Corrective and Preventive Actions (CAPA)",
      "Common Denials and Preventive Measures",
      "Escalation Matrix and Communication Cadence",
      "Productivity, Quality and TAT Management",
      "Departmental Reporting and Performance Analysis",
      "Professional RCM Case Studies",
    ],
  },
  {
    slug: "operational-management",
    level: "leader",
    n: 3,
    name: "Department and Operational Management",
    who: "Team leaders, supervisors, managers and account managers",
    modules: [
      "Transition from Executive to Team Leader",
      "Departmental SOP Governance",
      "SLA and TAT Management",
      "KRA and KPI Development",
      "Productivity and Capacity Planning",
      "Workforce Management and Resource Allocation",
      "Inventory and Work Queue Management",
      "AR Aging and Denial Inventory Management",
      "Bottleneck Identification and Prevention",
      "Quality Governance and Audit Management",
      "Performance Reporting and Dashboard Management",
      "Daily, Weekly and Monthly Operating Cadence",
      "Escalation and Issue Management",
      "RCA and CAPA Governance",
      "Team Management and Employee Development",
      "Client Communication and Operational Reviews",
      "Risk Management and Business Continuity",
      "Departmental Financial Performance",
      "Process Enhancement and Automation Opportunities",
      "Integrated Department Management Case Study",
    ],
  },
  {
    slug: "strategic-excellence",
    level: "executive",
    n: 4,
    name: "Strategic and Business Excellence",
    who: "Senior managers, directors, AVPs and aspiring RCM executives",
    modules: [
      "Executive Leadership in US Healthcare RCM",
      "Strategic RCM Operations Management",
      "Lean Management in US Healthcare",
      "Lean Six Sigma – DMAIC and Process Excellence",
      "Project Management – PMP Framework and Applications",
      "People Leadership and Organizational Development",
      "Business Process Reengineering",
      "Process Enhancement and Automation Strategy",
      "Client Relationship and Strategic Account Management",
      "Provider Education and Revenue Optimization",
      "Financial Management and Revenue Cycle Economics",
      "Cost to Collect and Client Profitability",
      "ROI, Business Cases and Investment Decisions",
      "Revenue Forecasting and Financial Planning",
      "Executive KPI and SLA Governance",
      "POL – Productivity, Operational and Financial Leadership",
      "Business Risk and Compliance Governance",
      "Change Management and Transformation",
      "Executive Reporting and Business Reviews",
      "Strategic Planning and Decision-Making",
      "Business Continuity and Growth Strategy",
      "Integrated Executive RCM Business Simulation",
    ],
  },
];

export async function seedSpecCurriculum(prisma: PrismaClient) {
  for (const l of SPEC_LEVELS) {
    const existing = await prisma.learningLevel.findUnique({ where: { slug: l.slug } });
    if (existing) continue;
    await prisma.learningLevel.create({
      data: {
        ...l,
        prerequisites: [...l.prerequisites],
        outcomes: [...l.outcomes],
        coreTopics: [...l.coreTopics],
        status: "DRAFT",
        disclaimer: DISCLAIMER,
      },
    });
  }
  const levels = new Map((await prisma.learningLevel.findMany({ select: { id: true, slug: true } })).map((l) => [l.slug, l.id]));

  let created = 0;
  for (const [i, c] of COURSES.entries()) {
    if (await prisma.program.findUnique({ where: { slug: c.slug }, select: { id: true } })) continue;
    const program = await prisma.program.create({
      data: {
        slug: c.slug,
        tier: `LEVEL 0${c.n}`,
        name: c.name,
        level: c.n,
        levelId: levels.get(c.level) ?? null,
        who: c.who,
        artefact: "Video lessons, slide decks and study material, with module quizzes and a final examination",
        weeks: "To be confirmed",
        outcomes: [...(SPEC_LEVELS.find((x) => x.slug === c.level)?.outcomes ?? [])],
        sortOrder: 100 + i,
        state: "DRAFT",
        status: "DRAFT",
        disclaimer: DISCLAIMER,
        description: SPEC_LEVELS.find((x) => x.slug === c.level)?.description ?? null,
      },
    });
    for (const [m, title] of c.modules.entries()) {
      const mod = await prisma.module.create({ data: { programId: program.id, title: `${m + 1}. ${title}`, sortOrder: m, state: "DRAFT" } });
      await prisma.lesson.create({ data: { moduleId: mod.id, title, sortOrder: 0, state: "DRAFT" } });
    }
    created++;
  }
  console.log(`  specification curriculum: ${SPEC_LEVELS.length} levels, ${COURSES.length} courses (${created} new, draft, ${COURSES.reduce((n, c) => n + c.modules.length, 0)} modules)`);
}
