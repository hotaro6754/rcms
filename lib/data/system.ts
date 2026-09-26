/**
 * The revenue cycle as a system: ten stages, each with what it does, what typically goes
 * wrong, the number that tells you, and the level of the Academy that teaches it. Content
 * only; the homepage's SystemFlow renders it and nothing about the copy lives in a
 * component.
 */

export interface SystemStage {
  id: string;
  phase: "Front end" | "Middle" | "Back end";
  label: string;
  does: string;
  breaks: string;
  metric: string;
  /** Academy level that teaches this stage in depth (LEVELS[n - 1]). */
  level: 1 | 2 | 3 | 4 | 5;
}

export const SYSTEM: SystemStage[] = [
  {
    id: "registration",
    phase: "Front end",
    label: "Registration",
    does: "Captures the patient's demographics and insurance before the visit.",
    breaks: "A mistyped member ID or date of birth. The claim is rejected weeks later, far from the desk that caused it.",
    metric: "Registration accuracy",
    level: 1,
  },
  {
    id: "eligibility",
    phase: "Front end",
    label: "Eligibility",
    does: "Confirms active coverage and what the plan will pay, before care is given.",
    breaks: "Coverage ended last month and nobody checked. The visit is now self-pay nobody agreed to.",
    metric: "Eligibility denial rate",
    level: 1,
  },
  {
    id: "authorization",
    phase: "Front end",
    label: "Authorization",
    does: "Secures payer approval for services that require it.",
    breaks: "The payer expands its authorization list; the workflow still runs on last quarter's code set.",
    metric: "Authorization-related denials",
    level: 2,
  },
  {
    id: "charge",
    phase: "Middle",
    label: "Charge capture",
    does: "Makes sure every billable service is documented and posted.",
    breaks: "A missed charge never becomes a denial. It simply never becomes revenue, and nobody sees it go.",
    metric: "Charge lag, in days",
    level: 2,
  },
  {
    id: "coding",
    phase: "Middle",
    label: "Coding",
    does: "Translates clinical documentation into CPT, ICD-10 and modifiers.",
    breaks: "Services that bundle are billed separately, and come back as CO-97 by the thousand.",
    metric: "Coding accuracy",
    level: 2,
  },
  {
    id: "claim",
    phase: "Middle",
    label: "Claim submission",
    does: "Builds the 837, scrubs it against edits and sends it through the clearinghouse.",
    breaks: "Rejections sit in a clearinghouse queue nobody owns, until timely filing runs out.",
    metric: "First-pass clean claim rate",
    level: 2,
  },
  {
    id: "remittance",
    phase: "Back end",
    label: "Remittance",
    does: "The payer adjudicates and returns an 835 explaining what it paid and why.",
    breaks: "An underpayment looks exactly like a payment unless someone checks it against the contract.",
    metric: "Underpayment variance",
    level: 3,
  },
  {
    id: "posting",
    phase: "Back end",
    label: "Payment posting",
    does: "Applies cash, adjustments and denials to the right accounts.",
    breaks: "A denial posted as a zero payment disappears from every worklist.",
    metric: "Posting lag and unapplied cash",
    level: 2,
  },
  {
    id: "ar",
    phase: "Back end",
    label: "A/R follow-up",
    does: "Pursues every unpaid claim until it is paid, corrected or closed.",
    breaks: "Touches without outcomes: the same claim called six times, never escalated.",
    metric: "Days in A/R, A/R over 90",
    level: 2,
  },
  {
    id: "denials",
    phase: "Back end",
    label: "Denials and recovery",
    does: "Appeals what is winnable and removes the cause of what repeats.",
    breaks: "The same denial worked every month, because fixing its cause is nobody's job.",
    metric: "Denial rate and overturn rate",
    level: 3,
  },
];
