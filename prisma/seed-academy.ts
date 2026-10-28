import type { PrismaClient } from "@prisma/client";
import { backfillRelease } from "../lib/services/cms/release";

/**
 * Academy structure from the blueprint: the three learning levels, each existing course
 * placed in one, first releases for courses that were already live, and a synthetic
 * Foundation assessment that exercises every automatically graded question type.
 *
 * Everything here is create-if-missing. Once a record exists, the Admin CMS owns it; the
 * seed never overwrites an edit made there.
 */

export const LEVELS = [
  {
    slug: "trainee",
    name: "Trainee",
    displayTitle: "Trainee — Foundation",
    sequence: 1,
    accent: "teal",
    shortDescription: "Understand the US healthcare ecosystem and the basic physician billing workflow.",
    description:
      "Build the vocabulary and process foundation: who the stakeholders are, how insurance and eligibility work, how a professional claim moves from encounter to payment, and why privacy rules apply to every step.",
    audience: "New to RCM: no healthcare background, targeting a first revenue cycle role.",
    prerequisites: ["None"],
    outcomes: ["Explain the claim lifecycle end to end", "Read an EOB and an ERA", "Recognise the main denial categories and who resolves them"],
    coreTopics: [
      "Healthcare stakeholders",
      "Insurance basics",
      "Patient demographics",
      "Eligibility and authorization",
      "Coding overview",
      "CMS-1500 / 837P overview",
      "Claim lifecycle",
      "Payment and denial basics",
      "HIPAA awareness",
    ],
    estimatedEffort: "6 to 8 weeks part-time",
    assessmentRequirement: "Knowledge checks, terminology matching and basic workflow sequencing",
    passingCriteria: "70% on every assessment",
    completionRequirement: "Every lesson complete and every assessment passed",
    badgeName: "Foundation badge",
  },
  {
    slug: "professional",
    name: "Professional",
    displayTitle: "Professional — Execution",
    sequence: 2,
    accent: "blue",
    shortDescription: "Manage end-to-end RCM workflows and resolve operational exceptions.",
    description:
      "Develop end-to-end workflow capability: front-end controls, charge capture, claim edits and rejections, payment posting, underpayments, denials and appeals, AR follow-up and quality controls, tested through scenarios and root-cause cases.",
    audience: "Managing workflows: one to six years in billing, AR, posting or eligibility.",
    prerequisites: ["Trainee level or equivalent experience"],
    outcomes: ["Work a denial from CARC/RARC to root cause", "Prioritise AR by value and risk", "Design corrective actions that prevent repeat errors"],
    coreTopics: [
      "Front-end controls",
      "Charge capture",
      "Coding dependencies",
      "Claim edits and clearinghouse rejections",
      "Payment posting",
      "Underpayments",
      "Denials and appeals",
      "AR follow-up",
      "Credit balances",
      "Quality controls",
      "Payer-specific workflows",
    ],
    estimatedEffort: "8 to 10 weeks part-time",
    assessmentRequirement: "Timed tests, claim scenarios, denial root-cause analysis and corrective-action exercises",
    passingCriteria: "70% on every assessment",
    completionRequirement: "Every lesson complete and every assessment passed",
    badgeName: "Professional badge",
  },
  {
    slug: "leadership",
    name: "Leadership",
    displayTitle: "Leadership — Governance",
    sequence: 3,
    accent: "navy",
    shortDescription: "Lead delivery performance, client outcomes, compliance and continuous improvement.",
    description:
      "Govern service delivery: SLA design, KRA ownership, the KPI dictionary, capacity and productivity, quality architecture, reporting, governance cadence, risk and escalation, coaching, Lean improvement and client communication.",
    audience: "Leading performance: team leads, managers and directors.",
    prerequisites: ["Professional level or equivalent experience"],
    outcomes: ["Interpret an operations dashboard and act on it", "Run a governance cadence that produces decisions", "Write an executive action plan with owners and dates"],
    coreTopics: [
      "SLA design",
      "KRA ownership",
      "KPI dictionary",
      "Capacity and productivity",
      "Quality architecture",
      "Reporting",
      "Governance cadence",
      "Issue and risk management",
      "Escalation",
      "Coaching",
      "Lean improvement",
      "Client communication",
    ],
    estimatedEffort: "3 to 6 months part-time",
    assessmentRequirement: "Dashboard interpretation, governance case studies and executive action plans",
    passingCriteria: "Rubric-marked case work plus 70% on knowledge assessments",
    completionRequirement: "Every lesson complete and every assessment passed",
    badgeName: "Leadership badge",
  },
] as const;

/** Where the five existing programs sit in the blueprint's three levels. */
export const COURSE_LEVEL: Record<string, string> = {
  foundation: "trainee",
  billing: "professional",
  "ar-denials": "professional",
  operations: "leadership",
  executive: "leadership",
};

const DISCLAIMER =
  "Educational content. It does not replace legal, coding, clinical, contractual or payer-specific guidance. Validate against current official sources, contracts, payer policies and your organisation's procedures.";

export async function seedLevels(prisma: PrismaClient) {
  for (const l of LEVELS) {
    const existing = await prisma.learningLevel.findUnique({ where: { slug: l.slug } });
    if (!existing) {
      await prisma.learningLevel.create({
        data: {
          ...l,
          prerequisites: [...l.prerequisites],
          outcomes: [...l.outcomes],
          coreTopics: [...l.coreTopics],
          status: "PUBLISHED",
          disclaimer: DISCLAIMER,
          effectiveDate: new Date("2026-01-01"),
          reviewDate: new Date("2027-01-01"),
        },
      });
    }
  }
  const levels = await prisma.learningLevel.findMany({ select: { id: true, slug: true } });
  for (const [course, level] of Object.entries(COURSE_LEVEL)) {
    const levelId = levels.find((x) => x.slug === level)?.id;
    if (!levelId) continue;
    await prisma.program.updateMany({ where: { slug: course, levelId: null }, data: { levelId } });
    await prisma.program.updateMany({ where: { slug: course, effectiveDate: null }, data: { effectiveDate: new Date("2026-01-01") } });
    await prisma.program.updateMany({ where: { slug: course, reviewDate: null }, data: { reviewDate: new Date("2027-01-01") } });
  }
  console.log(`  learning levels: ${levels.length}`);
}

/** Lessons created by older seeds hold their text in `body`; give each one its first block. */
export async function seedBlocksFromBodies(prisma: PrismaClient) {
  const lessons = await prisma.lesson.findMany({ where: { body: { not: null }, blocks: { none: {} } }, select: { id: true, body: true } });
  for (const l of lessons) {
    if (!l.body?.trim()) continue;
    await prisma.contentBlock.create({ data: { lessonId: l.id, kind: "TEXT", data: { text: l.body }, sortOrder: 0 } });
  }
  if (lessons.length) console.log(`  text blocks created from lesson bodies: ${lessons.length}`);
}

/**
 * The blueprint's "Foundation assessment": terminology matching, workflow sequencing and
 * knowledge checks, on synthetic content only.
 */
export async function seedFoundationAssessment(prisma: PrismaClient) {
  const course = await prisma.program.findUnique({ where: { slug: "foundation" }, select: { id: true } });
  if (!course) return;
  const exists = await prisma.module.findFirst({ where: { programId: course.id, title: "Foundation assessment" } });
  if (exists) return;
  const last = await prisma.module.findFirst({ where: { programId: course.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const mod = await prisma.module.create({
    data: { programId: course.id, title: "Foundation assessment", summary: "Check the vocabulary and the claim journey before moving to the Professional level.", sortOrder: (last?.sortOrder ?? -1) + 1, state: "PUBLISHED" },
  });
  const lesson = await prisma.lesson.create({
    data: { moduleId: mod.id, title: "Foundation assessment", durationSec: 25 * 60, sortOrder: 0, state: "PUBLISHED", completionRule: "ASSESSMENT_PASS", objectives: ["Match core RCM terms to their meaning", "Put the claim lifecycle in order", "Recognise who resolves common denials"] },
  });
  await prisma.contentBlock.createMany({
    data: [
      { lessonId: lesson.id, sortOrder: 0, kind: "CALLOUT", data: { tone: "info", title: "Before you start", text: "Twenty-five minutes, untimed. Pass mark 70%. You can retake it after a one-hour wait, up to three attempts. Wrong answers point you to the lesson to revisit." } },
      {
        lessonId: lesson.id,
        sortOrder: 1,
        kind: "SCENARIO",
        data: {
          title: "Warm-up case: a visit that came back unpaid",
          context:
            "A synthetic clinic, **Riverbend Family Practice**, bills an established-patient office visit for a fictional member. Ten days later the remittance shows the line adjusted with group code CO and reason code 16, and a remark that information is missing.\n\nNo payment was made and nothing was billed to the patient.",
          question: "Before you take the assessment: who should act first, and on what?",
          discussion: "CO means the provider cannot bill the patient. Reason 16 means the claim lacked information needed for adjudication, so the billing team corrects and resubmits; it is a front-end or claim-build problem, not an appeal.",
          synthetic: true,
        },
      },
    ],
  });
  const quiz = await prisma.quiz.create({
    data: { lessonId: lesson.id, title: "Foundation assessment", kind: "FINAL", passingScore: 70, maxAttempts: 3, retakeWaitMinutes: 60, randomizeQuestions: true, randomizeOptions: true, instructions: "Answer every question. Scenario details are synthetic." },
  });
  const q = (sortOrder: number, data: Record<string, unknown>) => prisma.quizQuestion.create({ data: { quizId: quiz.id, sortOrder, ...data } as never });
  await q(0, { type: "MATCHING", prompt: "Match each term to its meaning.", options: ["Allowed amount", "Adjustment", "Patient responsibility", "Clearinghouse"], targets: ["What the payer agreed to pay under the contract", "Difference between billed and allowed", "Deductible, copay or coinsurance owed by the patient", "Moves the claim message between provider and payer", "The provider's list price"], answerKey: { pairs: [0, 1, 2, 3] }, points: 2, competency: "Terminology", rationale: "Billed − allowed = adjustment. The patient owes their cost share; the clearinghouse is a messenger, not a payer." });
  await q(1, { type: "SEQUENCE", prompt: "Put these steps of the professional claim lifecycle in order.", options: ["Eligibility and benefits verified", "Charge captured for the encounter", "Claim scrubbed and submitted (837P)", "Remittance received (835)", "Payment posted and balance worked"], answerKey: { order: [0, 1, 2, 3, 4] }, points: 2, competency: "Claim lifecycle", rationale: "Front end first, then charge, claim, remittance, posting." });
  await q(2, { type: "SINGLE", prompt: "Which claim format is used for professional (physician) services?", options: ["CMS-1500 / 837P", "UB-04 / 837I", "NCPDP D.0", "W-9"], answerKey: { index: 0 }, correct: 0, competency: "Claims", rationale: "Professional services use the CMS-1500 paper form or its electronic equivalent, the 837P." });
  await q(3, { type: "MULTI", prompt: "Which of these belong in an eligibility and benefits check? Select all that apply.", options: ["Coverage is active on the date of service", "Copay, deductible and coinsurance", "Whether prior authorization is required", "The patient's favourite pharmacy"], answerKey: { indices: [0, 1, 2] }, points: 2, competency: "Eligibility and authorization" });
  await q(4, { type: "TRUE_FALSE", prompt: "A CO (contractual obligation) adjustment may be billed to the patient.", options: ["True", "False"], answerKey: { index: 1 }, correct: 1, competency: "Payments and denials", rationale: "CO amounts are the provider's write-off under the contract; PR amounts are patient responsibility." });
  await q(5, {
    type: "SINGLE",
    scenario: "Synthetic case: a claim rejects at the clearinghouse before reaching the payer because the subscriber ID format is invalid.",
    prompt: "What is the right first action?",
    options: ["Correct the demographic data and resubmit", "File a formal appeal with the payer", "Write the balance off", "Bill the patient"],
    answerKey: { index: 0 },
    correct: 0,
    competency: "Claims",
    rationale: "A rejection never reached adjudication, so there is nothing to appeal. Fix the data and resubmit.",
  });
  await q(6, { type: "SINGLE", prompt: "Under HIPAA awareness basics, what may you include in a training exercise or support message?", options: ["Synthetic, made-up details only", "A real patient's name if the claim is old", "A screenshot of a production claim with the name blurred", "A member ID if you trust the recipient"], answerKey: { index: 0 }, correct: 0, competency: "Compliance and privacy", rationale: "Training and support channels must never carry real patient information." });
  console.log("  foundation assessment: 7 questions (matching, sequence, single, multiple, true/false, scenario)");
}

/** Courses that were live before releases existed get version 1 from their current content. */
export async function backfillReleases(prisma: PrismaClient) {
  const courses = await prisma.program.findMany({ where: { state: "PUBLISHED", publishedVersionId: null }, select: { id: true } });
  for (const c of courses) await prisma.$transaction(async (tx) => backfillRelease(tx, c.id));
  if (courses.length) console.log(`  first releases written: ${courses.length}`);
}

export async function seedPlans(prisma: PrismaClient) {
  const plans = [
    { sku: "sub-all-monthly", name: "All-access, monthly", amount: 149900, interval: "MONTH" as const, graceDays: 7 },
    { sku: "sub-all-annual", name: "All-access, annual", amount: 1499900, interval: "YEAR" as const, graceDays: 14 },
  ];
  for (const p of plans) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) await prisma.product.create({ data: { ...p, kind: "SUBSCRIPTION", description: "Every released course included in subscriptions, for as long as the subscription is active.", active: true } });
  }
  console.log(`  subscription plans: ${plans.length}`);
}
