# Feature status

Updated 16 October 2026. Classification:
**VERIFIED** = works end to end and is covered by automated tests that ran and passed on 16 October 2026;
**PARTIAL** = works but with a stated gap; **NOT VERIFIED** = built, but depends on an external
service that was not available; **NOT BUILT** = absent.

| Area | Feature | Status | Evidence / gap |
|---|---|---|---|
| Case simulation | Authoring (structured editor, validation on save, JSON view) | VERIFIED | `tests/integration/sims.test.ts`; E2E approval |
| | Review by a different person, immutable versions, retire/restore | VERIFIED | integration tests |
| | Learner workbench, autosave, return, submit | VERIFIED | `tests/e2e/cases.spec.ts` |
| | Server scoring, weights, critical errors, action gate, delayed reveal | VERIFIED | `tests/unit/sim.test.ts` (10), integration |
| | Answer key absent from learner payloads | VERIFIED | unit test + E2E HTML check |
| | Instructor review with score adjustment | VERIFIED | integration + E2E |
| | Author preview with test scoring | PARTIAL | built; no automated test |
| | Branching multi-step consequences, work-queue and aging simulators | NOT BUILT | |
| Competencies | Framework, review/activation, outcomes from attempts only, reassessment expiry | VERIFIED | integration tests |
| | Corporate manager evidence matrix | VERIFIED | E2E manager step |
| Support | Routing, least-loaded assignment, team queue fallback, race-safe accept | VERIFIED | `tests/integration/support.test.ts` (11) |
| | State machine, resolution summary, reopen window | VERIFIED | integration + `tests/e2e/support.spec.ts` |
| | SLA targets over support hours, breach recording, escalation, auto-close | VERIFIED | unit (6) + integration; runs from `/api/cron` |
| | Attachments with sniffing and authorised download | PARTIAL | service built and typed; no automated upload test; no malware scanning |
| | Settings page (teams, routing, targets, hours) and measures | PARTIAL | built; covered by accessibility scan only |
| | Email notifications | NOT VERIFIED | needs Resend configuration; in-app notifications work |
| Assistant | Permission-filtered retrieval with sources, no answer keys | VERIFIED | `tests/integration/assistant.test.ts` (7) |
| | Records-based answers (progress, certificates, cases) | VERIFIED | integration + E2E |
| | Hand-off creating a real case and quoting its number | VERIFIED | integration + E2E |
| | Staff copilot commands and confirmed assignment | VERIFIED | integration + E2E |
| | External AI provider (Anthropic) | NOT VERIFIED | adapter built and typed; tested with a fake provider; never called against the live API (no key, not approved) |
| | Feedback, rate limit, retention, deletion | VERIFIED | integration |
| Earlier rounds | CMS, releases, library, learner loop, assessments, certificates (PDF), support basics, vendors, corporate, RBAC, fresh sign-in | VERIFIED | 132 tests in total; see `../FEATURE_MATRIX.md` |
| | Payments, refunds, invoices against Razorpay | NOT VERIFIED | needs gateway keys and webhook URL |
| Quality | Production build | VERIFIED | `npm run build` passed 16 Oct |
| | Accessibility (automated) | VERIFIED | `tests/e2e/a11y.spec.ts`: 24 pages, no serious/critical violations |
| | CI | PARTIAL | workflow added; first run in progress at time of writing (see `PROGRESS.md`) |
