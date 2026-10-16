# Implementation plan

The original backlog B1–B21 is in `MASTER_IMPLEMENTATION_PLAN.md`. This plan follows the brief's
stages and records where each stands.

| Stage | Scope | Status |
|---|---|---|
| 0 Baseline and research | Audit, research docs, plan | Done (`../audit`, `../research`) |
| 1 Product foundation | RBAC, CMS, learner loop, assessments, certificates | Done in earlier rounds |
| 2 CMS and learner workflow | Templates, prerequisites, expiry, review metadata, bulk actions, bookmarks, library | Done |
| 3 Visual learning engine | Workflow strip, claim anatomy, timeline, evidence cards | Partial: case workbench only; no general diagram or branching engine |
| 4 Flagship denial simulator | Authoring, attempts, scoring, feedback, review, versions | Done |
| 5 Assessments and competencies | Competency framework, outcomes, manager view | Done for cases; quiz items do not yet feed competencies |
| 6 Role workflows and support | Teams, routing, SLA, state machine, attachments, workspace | Done |
| 7 AI and analytics | Assistant, copilot, support measures | Done (provider optional and unverified live) |
| 8 Credentials and enterprise | Open Badges, SSO, seat purchase | Not started |
| 9 Final verification | Build, tests, E2E, accessibility, CI, docs | Done locally; CI first run pending |

## Next, in order
1. Expert review and approval of the three seeded cases and five competencies.
2. More cases (top denial types from team-lead ranking), then a work-queue prioritisation simulator.
3. Feed quiz items tagged with competencies into outcomes.
4. Configure email; verify notifications.
5. Evaluate the AI provider on a question set before approving it.
6. Dependency upgrades for the remaining advisories.
