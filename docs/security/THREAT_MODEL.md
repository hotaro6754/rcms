# Threat model

Updated 16 October 2026. Method: list assets, entry points and actors; for each threat give the
control in the code and what remains. Controls established in earlier rounds (authentication,
sessions, payments, audit log immutability) are detailed in `../SECURITY_REVIEW.md`.

## Assets
Learner accounts and progress; assessment and case answer keys; certificates; support conversations
and attachments; staff roles; payment records; the audit log; content under review.

## Actors
Anonymous visitor; learner; corporate manager; vendor contact; staff (twelve roles); a compromised
staff account; an external AI provider (optional); a malicious content author.

## Threats and controls

| # | Threat | Control | Residual |
|---|---|---|---|
| T1 | Learner obtains a case answer key before submitting | `learnerView()` strips correctness, relevance, explanations, risks, matching terms and the expected decision; unit and E2E tests assert the page HTML contains none of it | Feedback after a failed attempt reveals per-criterion hints by design |
| T2 | Learner forges a score or submits twice | Scoring runs on the server from stored answers; submission is a conditional update on `IN_PROGRESS`; partial unique index allows one open attempt | — |
| T3 | Author approves their own case or competency | Review requires `content.review.academic` and a person other than author and submitter | Two colluding staff accounts |
| T4 | Agent sees cases outside their team | `assertVisible`: requester, managers, assignee, or team members for unassigned team cases; denials audited | — |
| T5 | Client posts an arbitrary support status | Server enforces `STAFF_TRANSITIONS`; resolution needs a summary; learners cannot set statuses | — |
| T6 | Two agents claim the same case | Accept and reassign are conditional updates on the previous assignee | — |
| T7 | Malicious attachment | Type sniffed from content (declared type ignored), 10 MB limit, 10 per case, private storage, download only after visibility check, `nosniff`, sandbox CSP, attachment disposition | No malware scanning (`KNOWN_LIMITATIONS.md`) |
| T8 | PHI or identifiers entered in support, cases or assistant | Pattern masking before storage (support, assistant); identifier detection is a critical error in case notes; content authoring refuses identifiers | Pattern screening misses free-text identifiers such as names |
| T9 | Prompt injection through course content or questions | The model has no tools; sources are wrapped as data with an instruction to ignore embedded instructions; output links stripped; citations limited to sent sources; personal facts never come from the model | A model may still produce a wrong summary: answers are labelled AI-written with sources |
| T10 | Personal data sent to an external AI provider | Provider off unless `ASSISTANT_PROVIDER` and `ASSISTANT_EXTERNAL_APPROVED=true`; only the masked question and approved teaching passages are sent; records-based questions never reach it; each generation is audited | Approval is a deployment decision, not enforced by a contract check |
| T11 | Assistant used to act beyond permissions | Copilot commands check permissions; the single state-changing action is proposed, then executed on confirmation through the normal service, which re-checks | — |
| T12 | Assistant abuse or scraping | 20 questions per 10 minutes per user; 1000-character limit; auth required | No global cost cap for a configured provider |
| T13 | Retrieval leaks unreleased or restricted lessons | Index built per request from released snapshots only; lesson text included only where the person can open it; assessments never indexed | — |
| T14 | Lost submit-button values cause silent no-ops (found this round) | `ActionForm` copies the submitter into the form; E2E covers review approvals | — |
| T15 | Stale or wrong RCM content presented as authoritative | Review before publish, sources and review dates, fictional labels on synthetic payers, disclaimers on AI answers | Content accuracy depends on reviewers |

## Out of scope
Infrastructure hardening, DDoS, backups (`../OPERATIONS.md`), and any certification claim. The
platform is not represented as HIPAA- or PCI-certified.
