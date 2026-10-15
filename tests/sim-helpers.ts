import type { Answers, CaseDefinition } from "@/lib/sim/definition";

/** The answers an expert would give, built from the answer key, with notes that cover every element. */
export function expert(d: CaseDefinition): Answers {
  return {
    issue: d.issueOptions.find((o) => o.correct)!.id,
    missingInfo: d.missingInfoOptions.filter((o) => o.correct).map((o) => o.id),
    supportingEvidence: d.evidence.filter((e) => e.relevant).map((e) => e.id),
    policy: d.policyOptions.find((o) => o.correct)?.id,
    deadline: d.deadline?.options.find((o) => o.correct)?.id,
    action: d.actionOptions.find((o) => o.correct)!.id,
    escalate: d.escalation.required,
    escalationReason: d.escalation.required ? "Needs the clinical lead to confirm the documentation." : "",
    notes: d.documentation.elements.map((e) => `Covered ${e.terms[0]}.`).join(" ").padEnd(d.documentation.minLength + 5, "."),
    rationale: d.rationale.elements.map((e) => `Because of ${e.terms[0]}.`).join(" ").padEnd(d.rationale.minLength + 5, "."),
  };
}
