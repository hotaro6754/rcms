# Product requirements

Updated 16 October 2026. Status words match `implementation/feature-status.md`.

## Product statement
A role-based US healthcare RCM operations academy where people learn through realistic synthetic
cases, receive evidence-based feedback, and demonstrate readiness against a transparent
competency framework, with help and escalation built into the learning workflow.

## Users and jobs
| User | Job to be done | Primary surfaces |
|---|---|---|
| Learner | Learn a workflow, practise it safely, prove they can do it, get help when stuck | `/academy`, `/cases`, `/assistant`, `/support`, `/certificates` |
| Instructor / reviewer | Author and review content and cases, review attempts, give feedback | `/admin/content`, `/admin/cases`, `/admin/grading/cases` |
| Corporate manager | See whether team members demonstrated competencies | `/team` |
| Support agent / lead | Work routed cases within targets; configure teams, routing, SLA | `/admin/support`, `/admin/support/settings`, `/admin/copilot` |
| Administrators | Users, roles (maker-checker), finance, vendors, audit | `/admin/*` |

## Requirements
### R1 Case simulation (flagship)
1. A case is synthetic and carries claim, payer, denial, timeline, evidence, questions, rubric, critical errors, competencies and sources.
2. Authors edit through forms; every save is fully validated; a reviewer other than the author or submitter approves; approval publishes an immutable version.
3. The learner sees no answer key before submission (no correctness, relevance, explanations or matching terms in any payload).
4. Answers autosave; one open attempt per case; attempt limits; course-linked access.
5. Scoring is server-side, deterministic and weighted per case; any critical error fails; a correct-action gate is configurable; the expected decision is revealed after a pass or the configured attempt.
6. Feedback states what was done well, what was wrong, the risk of the chosen action, the evidence that decides the case, how to correct it, and which competencies need practice.
7. Instructors can adjust the two automated writing scores, dismiss a false identifier flag and leave feedback; history is kept.
### R2 Competencies
Competencies have a code, proficiency level (1–6), expected behaviour, evidence criteria, threshold, optional reassessment period, author and reviewer. Proficiency is awarded only from scored case attempts.
### R3 Support
Topic-based routing to teams, deterministic assignment by load and availability, enforced state machine, first-response and resolution targets over support hours, breach recording and escalation, case history, attachments, context capture, reopen window, workspace views and measures.
### R4 Assistant
Answers only from material the person can read, with sources; personal facts from records; hand-off to support returns the real case number; staff copilot acts only on confirmation through normal services; works with no AI provider; external provider only when explicitly approved and never receives personal records.
### R5 Content governance (existing, extended)
Review before publish for courses, library entries, cases and competencies; immutable releases; review dates and sources; audit trail.

## Out of scope for now
Work-queue and aging simulators; branching multi-step consequence simulations; SCORM/LTI; SSO;
Open Badges; email delivery without a configured provider; payments against a live gateway.
