/**
 * The homepage Operations Lab: one real-shaped problem and the first question an operator
 * would ask. Built on the same RCA as the Governance Room, so the lab, the review and the
 * console all tell one story. Content only.
 */

import { RCA } from "./governance";

export type Verdict = "on-path" | "symptom" | "dead-end";

export interface LabChoice {
  id: string;
  label: string;
  verdict: Verdict;
  finding: string;
}

export const LAB = {
  code: RCA.subject.code,
  reason: RCA.subject.reason,
  claims: RCA.subject.claims,
  value: RCA.subject.value,
  statement: RCA.statement,
  prompt: "Where do you look first?",
  choices: [
    {
      id: "productivity",
      label: "Analyst productivity",
      verdict: "dead-end",
      finding:
        "Touches are on target. The team is working the denials as fast as they arrive. Volume is not what changed.",
    },
    {
      id: "coding",
      label: "Coding accuracy",
      verdict: "dead-end",
      finding:
        "The audit sample is clean. Codes match the documentation, so CO-50 here is not a coding error.",
    },
    {
      id: "documentation",
      label: "Clinical documentation",
      verdict: "symptom",
      finding:
        "The notes support medical necessity. The payer never read them: the claims were denied before any clinical review.",
    },
    {
      id: "authorization",
      label: "Authorization workflow",
      verdict: "on-path",
      finding:
        "All 312 carry RARC N706. The authorization workflow never fired for these CPT codes. That is the thread; now ask why.",
    },
    {
      id: "followup",
      label: "A/R follow-up",
      verdict: "symptom",
      finding:
        "Appeals would recover some of it, one claim at a time. None of that stops next month's 312.",
    },
    {
      id: "payer",
      label: "Payer policy changes",
      verdict: "on-path",
      finding:
        "Aetna bulletin 2026-14 expanded the authorization code set from 01 Aug. It was received and never mapped into the workflow.",
    },
  ] satisfies LabChoice[],
  steps: RCA.steps,
  conclusion: RCA.conclusion,
  /** The level that teaches this way of thinking. */
  level: 3,
} as const;

export const VERDICT_LABEL: Record<Verdict, string> = {
  "on-path": "On the root-cause path",
  symptom: "A symptom, not the cause",
  "dead-end": "Ruled out",
};
