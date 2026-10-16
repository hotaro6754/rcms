# Progress log

Newest first. Each entry: what changed, how it was verified.

## 2026-10-16: flagship simulator, support operations, assistant, verification

- **Bulk lesson changes** (all or nothing). Commit `735e319`.
- **Denial case simulator and competency framework**: versioned synthetic cases, server-side
  rubric scoring with critical errors, attempts, instructor review, competency outcomes, manager
  matrix; three seeded cases (in review) and five competencies (draft). Commits `d085667`,
  `c9b874f`, `29de1fd`.
- **Fixed** a silent defect: forms with a field named `id` dropped the clicked button's value, so
  review Approve/Request-changes posted nothing (affected the library review too).
- **Support operations**: teams, deterministic routing, enforced state machine, SLA over support
  hours with breach escalation, history, attachments, context, workspace and settings. `35dc485`.
- **Assistant and copilot** with sources, records-based facts, support hand-off, optional AI
  provider (off by default). `5aa6de3`.
- **Accessibility scan and fixes; CI workflow.** `911dc09`.
- **Verified 16 Oct:** 132 unit/integration tests, 7 end-to-end tests, 3 accessibility scans
  (24 pages), lint, typecheck, production build. CI's first run was in progress when this was written.

## 2026-10-15: research and audit round

- Market, competitor and open-source research written to `docs/research/` (Reddit and most
  vendor sites unreachable; recorded in `RESEARCH_SOURCES.md`).
- Repository re-audit: `docs/audit/REPOSITORY_AUDIT.md`. Found mocked mentoring slots, a stale
  cohort countdown, static public pricing, an unlabelled fictional console, and 19 production
  dependency advisories.
- Plan: `MASTER_IMPLEMENTATION_PLAN.md` (B1–B21).

## Earlier (previous round)

Foundation, CMS, learner loop, assessments, certificates, commerce, support, vendors, corporate,
subscriber administration, account security, E2E journeys, export/import. Commits `f8a5f7f` to
`251b62c`. Verified: 71 unit/integration tests, 4 E2E tests, lint, typecheck, build.
