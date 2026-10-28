# Acceptance test plan

Automated tests are the acceptance evidence where they exist. Run:
`npm test` (unit and integration, needs PostgreSQL), then with seeded data and a running app
`npm run test:e2e` (end-to-end and accessibility). CI runs both (`.github/workflows/ci.yml`).

| Scenario | Automated by | Manual check still needed |
|---|---|---|
| Learner completes a lesson; progress persists | `e2e/journeys.spec.ts` | — |
| Role boundaries hold in the browser | `e2e/journeys.spec.ts` | — |
| Certificate verification is public; unknown serials do not leak | `e2e/journeys.spec.ts` | PDF visual check |
| Reviewer approves a case; learner works it, saves, returns, submits, gets scored feedback; instructor reviews; manager sees competency | `e2e/cases.spec.ts` | Content accuracy review by an RCM expert |
| Answer key never in the learner's page before submission | `e2e/cases.spec.ts`, `unit/sim.test.ts` | — |
| Critical error fails a high score; escalation required; reveal threshold | `unit/sim.test.ts`, `integration/sims.test.ts` | — |
| Support case routed, replied, resolved with summary, reopened; history recorded | `e2e/support.spec.ts`, `integration/support.test.ts` | Email delivery once configured |
| Two agents accepting at once; invalid status moves refused; SLA breach once | `integration/support.test.ts` | — |
| Assistant answers from records and sources; hands off with the real case number; copilot assigns only on confirmation | `e2e/assistant.spec.ts`, `integration/assistant.test.ts` | Live AI provider evaluation |
| Assistant never retrieves lessons the person cannot open or answer keys | `integration/assistant.test.ts` | — |
| Accessibility: no serious or critical WCAG 2.1 A/AA violations on 24 key pages | `e2e/a11y.spec.ts` | Screen reader and keyboard walkthrough |
| Payments, refunds, invoices | integration tests with signed test payloads | Run against Razorpay test mode (`../TEST_PLAN.md` §5) |
| Mobile layout | spot-checked (workbench at 390px) | Full device pass |
