# Practitioner pain points

Updated 16 October 2026. Consolidates two evidence sets:

- **User-supplied practitioner research** (sources U1–U5): Reddit threads and quotes gathered by the
  product owner and supplied in the build brief. Reddit was not reachable from this build
  environment (`RESEARCH_SOURCES.md`), so these were **not re-fetched or independently verified
  here**; they are recorded as supplied, with the owner's own caveat that individual comments are
  not survey statistics.
- **Secondary sources fetched during the build** (S-numbers in `RESEARCH_SOURCES.md`): vendor
  surveys, job postings, training-provider pages. Detail in `USER_PAIN_POINTS.md`.

Format per finding: evidence → type → confidence → product implication → unknown → how to validate.

## Source register (user-supplied)

| ID | Source | Type |
|---|---|---|
| U1 | https://www.reddit.com/r/MedicalCoding/comments/1r1uyg8/what_is_most_frustrating_about_medical_coding/ | Practitioner anecdote |
| U2 | https://www.reddit.com/r/jobs/comments/1vbsj5o/started_a_medical_billing_job_with_zero/ | Practitioner anecdote |
| U3 | https://www.reddit.com/r/CodingandBilling/comments/1mnqsvi/new_to_claims_denialsneed_help/ | Practitioner anecdote |
| U4 | https://www.reddit.com/r/CodingandBilling/comments/1hzklng/denials_management/ | Practitioner anecdote |
| U5 | https://www.reddit.com/r/CodingandBilling/comments/1m6tlap | Practitioner anecdote |

## Findings

### P1. Courses feel exam-oriented and disconnected from the job
- **Evidence:** U1 comments quoted in the brief: "The real world is 50% coding and 50% dealing with denials, appeals, and payer-specific quirks that no textbook covers"; "The real learning begins when you get your first job." Secondary: S20 warns against short programs promising jobs.
- **Type / confidence:** practitioner anecdote + secondary guide. Medium (recurring theme, small sample).
- **Implication:** teach whole workflows with evidence and decisions, not definitions. **Built:** denial case simulator (`/cases`).
- **Unknown:** how widespread; whether learners would pay for practice over credentials.
- **Validate:** 10 learner interviews; compare case-practice completion and pass rates with lesson-only learners.

### P2. New hires are left alone too early
- **Evidence:** U2 (a new biller with two or three days of team-lead training); U3 (denials hire shown software navigation, not how to choose correction vs reconsideration). Secondary: S23 (92% of executives said new hires make costly claim errors; vendor survey).
- **Type / confidence:** anecdote + vendor survey. Medium.
- **Implication:** guided practice with an explainable decision path, contextual help and an escalation route. **Built:** case feedback with delayed reveal; assistant with support hand-off; help links from lessons and results.
- **Unknown:** whether employers will assign practice time.
- **Validate:** pilot with one BPO team; measure time-to-independent work.

### P3. The hard part is deciding the next action
- **Evidence:** U3–U5 (ambiguous denial messages, documentation issues, correct vs appeal vs investigate).
- **Type / confidence:** anecdote. Medium.
- **Implication:** cases where appeal is *not* always the answer; scoring of action, rule, deadline, escalation and rationale. **Built:** three seeded cases (no action / corrected claim / clinical escalation) with critical errors.
- **Unknown:** which denial types matter most to employers.
- **Validate:** ask five team leads to rank denial types by training need.

### P4. Quality and productivity must be taught together
- **Evidence:** brief's synthesis of U1–U5; secondary S21 (denial rates, rework).
- **Type / confidence:** anecdote + vendor survey. Low–medium.
- **Implication:** queue prioritisation, aging, audits and manager views. **Partly built:** manager competency matrix; support analytics. **Not built:** work-queue simulator, aging exercises.
- **Validate:** manager interviews on what "ready" means.

## What this research does not show
Market size, willingness to pay, conversion, or that practitioners would switch from AAPC/HFMA routes.
None of those figures are stated anywhere in this repository.
