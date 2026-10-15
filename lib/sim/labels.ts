/** Names shared by the server (scoring) and the browser (workbench). No dependencies. */

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
