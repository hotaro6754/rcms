import { applicableCriteria, CRITERION_LABEL, type Answers, type CaseDefinition, type CaseOption, type Criterion } from "./definition";

/**
 * Scoring a case attempt. Pure and deterministic: the same definition and answers always give
 * the same result, so a score can be recomputed and audited.
 *
 * Documentation and rationale are checked for required elements by matching terms. That is a
 * coarse automated check, not a judgement of writing quality, and the result says so; an
 * instructor can replace those two scores (and dismiss an identifier flag) in review.
 */

export interface CriterionResult {
  key: Criterion;
  label: string;
  weight: number;
  /** 0-100. */
  score: number;
  comment: string;
  adjusted?: boolean;
}

export interface SimResult {
  score: number;
  passMark: number;
  passed: boolean;
  /** True when the case requires the expected action to pass and a different one was chosen. */
  actionGateFailed: boolean;
  criteria: CriterionResult[];
  criticalErrors: { id: string; label: string; explanation: string }[];
  /** Risk of the action the learner chose, when it was not the expected one. */
  actionRisk: string | null;
  /** Identifier-like strings found in notes or rationale (masked). */
  identifiers: string[];
  revealed: null | {
    decision: string;
    howToCorrect: string;
    correct: { issue: string; action: string; policy: string | null; deadline: string | null; escalate: boolean; escalation: string };
    supportingEvidence: string[];
    missingInfo: string[];
    chosenExplanations: { question: string; label: string; explanation: string }[];
  };
  automatedNote: string;
}

export interface ScoreOverrides {
  documentation?: number;
  rationale?: number;
  dismissIdentifierFlag?: boolean;
}

const IDENTIFIER_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "a social security number", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "an email address", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { label: "a phone number", re: /(?<!\d)(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\d)/g },
  { label: "a date of birth", re: /\b(?:dob|d\.o\.b\.|date of birth|born)\b[:\s-]*\S+/gi },
];

/** Identifier-like strings a working note does not need. Masked so the result does not store them. */
export function findIdentifiers(text: string) {
  const out: string[] = [];
  for (const p of IDENTIFIER_PATTERNS) for (const m of text.matchAll(p.re)) out.push(`${p.label} (${m[0].slice(0, 2)}…)`);
  return [...new Set(out)];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

function coverage(text: string, elements: { label: string; terms: string[] }[], minLength: number) {
  const t = norm(text);
  const missing = elements.filter((e) => !e.terms.some((term) => t.includes(norm(term))));
  let s = (elements.length - missing.length) / elements.length;
  const short = text.trim().length < minLength;
  if (short) s *= 0.5;
  return { s, missing: missing.map((m) => m.label), short };
}

function setScore(chosen: string[] | undefined, correct: string[]) {
  const sel = new Set(chosen ?? []);
  const hits = correct.filter((c) => sel.has(c)).length;
  const wrong = [...sel].filter((c) => !correct.includes(c)).length;
  if (correct.length === 0) return Math.max(0, 1 - 0.5 * wrong);
  return Math.max(0, Math.min(1, (hits - 0.5 * wrong) / correct.length));
}

const correctOf = (list: CaseOption[]) => list.find((o) => o.correct);
const labelOf = (list: CaseOption[], id?: string) => list.find((o) => o.id === id)?.label;
const pct = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100);

export function scoreAttempt(d: CaseDefinition, a: Answers, opts: { attemptNo: number; overrides?: ScoreOverrides } = { attemptNo: 1 }): SimResult {
  const o = opts.overrides ?? {};
  const raw: Partial<Record<Criterion, { s: number; comment: string; adjusted?: boolean }>> = {};

  const issueOk = a.issue === correctOf(d.issueOptions)?.id;
  raw.issue = { s: issueOk ? 1 : 0, comment: issueOk ? "You identified the problem the remittance describes." : a.issue ? "The issue you chose does not match what the remittance codes and evidence show. Re-read the group code, CARC and RARC against the claim." : "You did not classify the issue." };

  const relevant = d.evidence.filter((e) => e.relevant).map((e) => e.id);
  const ev = setScore(a.supportingEvidence, relevant);
  const missingCorrect = d.missingInfoOptions.filter((m) => m.correct).map((m) => m.id);
  const mi = d.missingInfoOptions.length ? setScore(a.missingInfo, missingCorrect) : null;
  const evidence = mi === null ? ev : (ev + mi) / 2;
  raw.evidence = {
    s: evidence,
    comment:
      evidence >= 0.75
        ? "You relied on the evidence that decides this case."
        : `${ev < 0.75 ? "Some evidence that decides this case was missed, or items that do not bear on it were cited. " : ""}${mi !== null && mi < 0.75 ? "Check again what information is genuinely missing before acting." : ""}`.trim(),
  };

  if (d.policyOptions.length) {
    const ok = a.policy === correctOf(d.policyOptions)?.id;
    raw.policy = { s: ok ? 1 : 0, comment: ok ? "You applied the rule that governs this situation." : "The rule you applied is not the one that governs this situation. Read the payer policy excerpts again." };
  }
  if (d.deadline) {
    const ok = a.deadline === correctOf(d.deadline.options)?.id;
    raw.deadline = { s: ok ? 1 : 0, comment: ok ? "You worked out the deadline correctly." : "The deadline is not right. Count from the date the rule names, using the dates in the timeline." };
  }

  const actionOk = a.action === correctOf(d.actionOptions)?.id;
  const chosenAction = d.actionOptions.find((x) => x.id === a.action);
  raw.action = { s: actionOk ? 1 : 0, comment: actionOk ? "Your next action resolves the case." : a.action ? "That action does not resolve this case." : "You did not choose a next action." };

  let esc = a.escalate === d.escalation.required ? 1 : 0;
  if (esc && d.escalation.required && (a.escalationReason ?? "").trim().length < 10) esc = 0.5;
  raw.escalation = {
    s: esc,
    comment:
      esc === 1
        ? d.escalation.required ? "You escalated, and said why." : "You handled this within your own authority, which is right here."
        : esc === 0.5 ? "Escalating was right; say what the supervisor needs to decide." : a.escalate == null ? "You did not say whether this needs escalation." : d.escalation.required ? "This case needs someone with more authority or information than the account owner." : "This case does not need escalation; it can be resolved at your level.",
  };

  const notes = a.notes ?? "";
  const rationale = a.rationale ?? "";
  const doc = coverage(notes, d.documentation.elements, d.documentation.minLength);
  raw.documentation = o.documentation !== undefined
    ? { s: o.documentation / 100, comment: "Score set by an instructor in review.", adjusted: true }
    : { s: doc.s, comment: doc.missing.length || doc.short ? `${doc.short ? "The note is too short for someone else to pick up the account. " : ""}${doc.missing.length ? `Not covered: ${doc.missing.join("; ")}.` : ""}`.trim() : "Your note covers what the next person needs." };
  const rat = coverage(rationale, d.rationale.elements, d.rationale.minLength);
  raw.rationale = o.rationale !== undefined
    ? { s: o.rationale / 100, comment: "Score set by an instructor in review.", adjusted: true }
    : { s: rat.s, comment: rat.missing.length || rat.short ? `${rat.short ? "The rationale is too brief. " : ""}${rat.missing.length ? `Not addressed: ${rat.missing.join("; ")}.` : ""}`.trim() : "Your reasoning connects the evidence to the decision." };

  const identifiers = o.dismissIdentifierFlag ? [] : findIdentifiers(`${notes}\n${rationale}\n${a.escalationReason ?? ""}`);
  raw.compliance = { s: identifiers.length ? 0 : 1, comment: identifiers.length ? `Your writing includes ${identifiers.join(", ")}. Account notes should carry only what the next person needs: the account and claim references are enough.` : "You kept identifiers out of your notes." };

  const criteria: CriterionResult[] = applicableCriteria(d).map((key) => ({ key, label: CRITERION_LABEL[key], weight: d.rubric.weights[key], score: pct(raw[key]!.s), comment: raw[key]!.comment, ...(raw[key]!.adjusted ? { adjusted: true } : {}) }));
  const totalWeight = criteria.reduce((n, c) => n + c.weight, 0);
  const score = Math.round(criteria.reduce((n, c) => n + c.weight * c.score, 0) / totalWeight);

  const criticalErrors = d.rubric.criticalErrors
    .filter((ce) => {
      switch (ce.trigger.type) {
        case "action":
          return a.action === ce.trigger.optionId;
        case "issue_wrong":
          return !issueOk;
        case "deadline_wrong":
          return !!d.deadline && a.deadline !== correctOf(d.deadline.options)?.id;
        case "escalation_missed":
          return d.escalation.required && a.escalate !== true;
        case "identifier_in_notes":
          return identifiers.length > 0;
      }
    })
    .map((ce) => ({ id: ce.id, label: ce.label, explanation: ce.explanation }));

  const actionGate = d.rubric.requireCorrectAction && !actionOk;
  const passed = score >= d.rubric.passMark && criticalErrors.length === 0 && !actionGate;
  const reveal = passed || (d.rubric.revealAfterAttempts > 0 && opts.attemptNo >= d.rubric.revealAfterAttempts);

  const chosen: { question: string; label: string; explanation: string }[] = [];
  const explain = (question: string, list: CaseOption[], idv?: string) => {
    const x = list.find((y) => y.id === idv);
    if (x?.explanation) chosen.push({ question, label: x.label, explanation: x.explanation });
  };
  if (reveal) {
    explain("Issue", d.issueOptions, a.issue);
    explain("Policy", d.policyOptions, a.policy);
    if (d.deadline) explain("Deadline", d.deadline.options, a.deadline);
    explain("Action", d.actionOptions, a.action);
  }

  return {
    score,
    passMark: d.rubric.passMark,
    passed,
    actionGateFailed: actionGate,
    criteria,
    criticalErrors,
    actionRisk: !actionOk && chosenAction?.risk ? chosenAction.risk : null,
    identifiers,
    revealed: reveal
      ? {
          decision: d.expected.decision,
          howToCorrect: d.expected.howToCorrect,
          correct: {
            issue: correctOf(d.issueOptions)!.label,
            action: correctOf(d.actionOptions)!.label,
            policy: labelOf(d.policyOptions, correctOf(d.policyOptions)?.id) ?? null,
            deadline: d.deadline ? (correctOf(d.deadline.options)?.label ?? null) : null,
            escalate: d.escalation.required,
            escalation: d.escalation.explanation,
          },
          supportingEvidence: d.evidence.filter((e) => e.relevant).map((e) => e.title),
          missingInfo: d.missingInfoOptions.filter((m) => m.correct).map((m) => m.label),
          chosenExplanations: chosen,
        }
      : null,
    automatedNote: "Documentation and rationale were checked automatically for required elements, not read for quality. An instructor may review and adjust them.",
  };
}

/** Lowest score among a competency's criteria in this result; null if none of them applied. */
export function evidenceFor(result: Pick<SimResult, "criteria">, criteria: string[]) {
  const scores = result.criteria.filter((c) => criteria.includes(c.key)).map((c) => c.score);
  return scores.length ? Math.min(...scores) : null;
}
