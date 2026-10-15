import { z } from "zod";

/**
 * A denial-management case: what the learner sees, what counts as a good answer, and how it is
 * scored. Pure module: no database. The full definition (with its answer key) is only ever read
 * on the server; learners receive `learnerView(definition)`.
 *
 * Every case is synthetic. Payers, patients, providers and policies are fictional and labelled
 * as such; claim adjustment codes are cited to their published code list in `sources`.
 */

export const CRITERIA = ["issue", "evidence", "policy", "deadline", "action", "escalation", "documentation", "compliance", "rationale"] as const;
export type Criterion = (typeof CRITERIA)[number];

export const CRITERION_LABEL: Record<Criterion, string> = {
  issue: "Issue identification",
  evidence: "Evidence interpretation",
  policy: "Policy or rule application",
  deadline: "Deadline awareness",
  action: "Appropriate action",
  escalation: "Escalation judgement",
  documentation: "Documentation quality",
  compliance: "Compliance and privacy",
  rationale: "Rationale quality",
};

export const EVIDENCE_KINDS = ["CLAIM", "REMIT", "EOB", "NOTE", "POLICY", "DOCUMENT", "PORTAL", "CORRESPONDENCE"] as const;
export const EVIDENCE_LABEL: Record<(typeof EVIDENCE_KINDS)[number], string> = {
  CLAIM: "Claim",
  REMIT: "Remittance",
  EOB: "Explanation of benefits",
  NOTE: "Account note",
  POLICY: "Payer policy",
  DOCUMENT: "Clinical document",
  PORTAL: "Payer portal",
  CORRESPONDENCE: "Correspondence",
};

const id = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/, "Ids use lowercase letters, digits and hyphens.");
const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const money = z.number().int("Amounts are in cents.").min(0).max(100_000_000);

const Option = z.object({
  id,
  label: text(300, 2),
  correct: z.boolean().default(false),
  /** Why this choice is right or wrong. Shown once the answer is revealed. */
  explanation: z.string().trim().max(1500).default(""),
  /** What goes wrong if someone does this. Shown whenever the learner picks it. */
  risk: z.string().trim().max(800).default(""),
});
export type CaseOption = z.infer<typeof Option>;

const Evidence = z.object({
  id,
  kind: z.enum(EVIDENCE_KINDS),
  title: text(200, 2),
  date: text(40).optional(),
  body: text(6000),
  /** Part of the answer key: this item supports the expected decision. */
  relevant: z.boolean().default(false),
});

const Element = z.object({
  label: text(200, 2),
  /** Any one of these, case-insensitively, counts as covering the element. */
  terms: z.array(text(60, 2)).min(1).max(15),
});

const CriticalError = z.object({
  id,
  label: text(200, 4),
  explanation: text(1200, 10),
  trigger: z.discriminatedUnion("type", [
    z.object({ type: z.literal("action"), optionId: id }),
    z.object({ type: z.literal("issue_wrong") }),
    z.object({ type: z.literal("deadline_wrong") }),
    z.object({ type: z.literal("escalation_missed") }),
    z.object({ type: z.literal("identifier_in_notes") }),
  ]),
});
export type CriticalErrorDef = z.infer<typeof CriticalError>;

const Weights = z.object(Object.fromEntries(CRITERIA.map((c) => [c, z.number().min(0).max(10)])) as Record<Criterion, z.ZodNumber>);

export const CaseDefinition = z
  .object({
    title: text(160, 4),
    summary: text(600, 20),
    difficulty: z.number().int().min(1).max(5),
    estimatedMinutes: z.number().int().min(5).max(240),
    brief: text(2000, 20),
    payer: z.object({ name: text(120, 2), plan: text(120, 2) }),
    claim: z.object({
      claimNumber: text(40),
      patientRef: text(40),
      providerRef: text(80),
      dateOfService: text(40),
      submittedOn: text(40),
      billed: money,
      paid: money,
      lines: z.array(z.object({ code: text(20), description: text(200), units: z.number().int().min(1).max(999), charge: money })).min(1).max(20),
      diagnosis: z.array(text(120)).max(12).default([]),
    }),
    denial: z.object({
      groupCode: z.enum(["CO", "PR", "OA", "PI"]),
      carc: text(10),
      rarc: text(10).optional(),
      description: text(500, 4),
      deniedOn: text(40),
    }),
    financial: z.object({ atRisk: money, priority: z.enum(["LOW", "MEDIUM", "HIGH"]) }),
    timeline: z.array(z.object({ date: text(40), event: text(400) })).min(1).max(30),
    evidence: z.array(Evidence).min(2).max(20),
    issueOptions: z.array(Option).min(2).max(8),
    missingInfoOptions: z.array(Option).max(10).default([]),
    policyOptions: z.array(Option).max(8).default([]),
    deadline: z.object({ question: text(300, 5), options: z.array(Option).min(2).max(6) }).optional(),
    actionOptions: z.array(Option).min(2).max(10),
    escalation: z.object({ required: z.boolean(), explanation: text(1200, 10) }),
    documentation: z.object({ elements: z.array(Element).min(1).max(10), minLength: z.number().int().min(20).max(2000).default(80) }),
    rationale: z.object({ elements: z.array(Element).min(1).max(10), minLength: z.number().int().min(20).max(2000).default(60) }),
    expected: z.object({ decision: text(2000, 20), howToCorrect: text(2000, 10) }),
    rubric: z.object({
      weights: Weights,
      passMark: z.number().int().min(50).max(100),
      criticalErrors: z.array(CriticalError).max(10).default([]),
      /** Show the expected decision after this many attempts even without a pass (0 = only after a pass). */
      revealAfterAttempts: z.number().int().min(0).max(10).default(2),
      /** 0 = unlimited. */
      maxAttempts: z.number().int().min(0).max(20).default(3),
      /** Passing needs the expected action, whatever the aggregate score. */
      requireCorrectAction: z.boolean().default(true),
    }),
    competencyCodes: z.array(text(20)).max(10).default([]),
    sources: z.array(text(400)).min(1, "Cite at least one source for the codes and rules used.").max(20),
  })
  .superRefine((d, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const uniq = (list: { id: string }[], path: string) => {
      const seen = new Set<string>();
      for (const [i, x] of list.entries()) {
        if (seen.has(x.id)) issue([path, i, "id"], `Duplicate id "${x.id}".`);
        seen.add(x.id);
      }
    };
    const oneCorrect = (list: CaseOption[], path: string, label: string) => {
      if (list.length && list.filter((o) => o.correct).length !== 1) issue([path], `${label}: mark exactly one option correct.`);
    };
    uniq(d.evidence, "evidence");
    uniq(d.issueOptions, "issueOptions");
    uniq(d.missingInfoOptions, "missingInfoOptions");
    uniq(d.policyOptions, "policyOptions");
    uniq(d.actionOptions, "actionOptions");
    uniq(d.rubric.criticalErrors, "rubric.criticalErrors");
    oneCorrect(d.issueOptions, "issueOptions", "Issue");
    oneCorrect(d.policyOptions, "policyOptions", "Policy");
    oneCorrect(d.actionOptions, "actionOptions", "Action");
    if (d.deadline) oneCorrect(d.deadline.options, "deadline", "Deadline");
    if (!d.evidence.some((e) => e.relevant)) issue(["evidence"], "Mark at least one evidence item as supporting the expected decision.");
    for (const [i, ce] of d.rubric.criticalErrors.entries()) {
      if (ce.trigger.type === "action") {
        const opt = d.actionOptions.find((o) => o.id === (ce.trigger as { optionId: string }).optionId);
        if (!opt) issue(["rubric", "criticalErrors", i], `Critical error "${ce.label}" names an action that does not exist.`);
        else if (opt.correct) issue(["rubric", "criticalErrors", i], `Critical error "${ce.label}" names the correct action.`);
      }
      if (ce.trigger.type === "deadline_wrong" && !d.deadline) issue(["rubric", "criticalErrors", i], "A deadline critical error needs a deadline question.");
      if (ce.trigger.type === "escalation_missed" && !d.escalation.required) issue(["rubric", "criticalErrors", i], "An escalation critical error needs escalation to be required.");
    }
    if (applicableCriteria(d).length === 0) issue(["rubric", "weights"], "Give at least one criterion a weight above zero.");
  });

export type CaseDefinition = z.infer<typeof CaseDefinition>;
export type CaseDefinitionInput = z.input<typeof CaseDefinition>;

/** Criteria that count for this case: weighted, and with the question they need. */
export function applicableCriteria(d: Pick<CaseDefinition, "rubric" | "policyOptions" | "deadline">): Criterion[] {
  return CRITERIA.filter((c) => d.rubric.weights[c] > 0 && (c !== "policy" || d.policyOptions.length > 0) && (c !== "deadline" || !!d.deadline));
}

/** zod issues as one readable sentence per problem, with where it is. */
export function describeIssues(err: z.ZodError) {
  return err.issues.slice(0, 8).map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message));
}

// ---------------------------------------------------------------------------
// What the learner may see before submitting: no correctness, explanations, relevance flags,
// expected decision or matching terms.
// ---------------------------------------------------------------------------

export function learnerView(d: CaseDefinition) {
  const opt = (o: CaseOption) => ({ id: o.id, label: o.label });
  return {
    title: d.title,
    summary: d.summary,
    difficulty: d.difficulty,
    estimatedMinutes: d.estimatedMinutes,
    brief: d.brief,
    payer: d.payer,
    claim: d.claim,
    denial: d.denial,
    financial: d.financial,
    timeline: d.timeline,
    evidence: d.evidence.map((e) => ({ id: e.id, kind: e.kind, title: e.title, date: e.date, body: e.body })),
    issueOptions: d.issueOptions.map(opt),
    missingInfoOptions: d.missingInfoOptions.map(opt),
    policyOptions: d.policyOptions.map(opt),
    deadline: d.deadline ? { question: d.deadline.question, options: d.deadline.options.map(opt) } : null,
    actionOptions: d.actionOptions.map(opt),
    documentationGuide: d.documentation.elements.map((e) => e.label),
    documentationMinLength: d.documentation.minLength,
    rationaleMinLength: d.rationale.minLength,
    rubric: {
      criteria: applicableCriteria(d).map((c) => ({ key: c, label: CRITERION_LABEL[c], weight: d.rubric.weights[c] })),
      passMark: d.rubric.passMark,
      criticalErrors: d.rubric.criticalErrors.map((c) => c.label),
      requireCorrectAction: d.rubric.requireCorrectAction,
      maxAttempts: d.rubric.maxAttempts,
    },
    sources: d.sources,
  };
}
export type LearnerCase = ReturnType<typeof learnerView>;

// ---------------------------------------------------------------------------
// Learner answers
// ---------------------------------------------------------------------------

const pick = z.string().trim().max(40).optional();
export const Answers = z.object({
  issue: pick,
  missingInfo: z.array(z.string().max(40)).max(20).optional(),
  supportingEvidence: z.array(z.string().max(40)).max(30).optional(),
  policy: pick,
  deadline: pick,
  action: pick,
  escalate: z.boolean().nullable().optional(),
  escalationReason: z.string().max(2000).optional(),
  rationale: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});
export type Answers = z.infer<typeof Answers>;
