# Implementation plan

Living plan. Phases were ordered so each one left the platform working and tested; the
blueprint's recommended first milestone (registration → verification → sign-in → enrolment →
lesson → assessment → persisted progress → certificate → verification) came first, with the
admin CMS built alongside it.

## Phases and status

| Phase | Scope | Status | Commits |
|---|---|---|---|
| 0. Audit | Baseline checks, gap analysis, defects D1–D8 | Done | `docs/IMPLEMENTATION_AUDIT.md` |
| 1. Foundation | Permission model (12 roles, 64 permissions), actor, account statuses, lockout, rate limits, MFA, approvals engine, append-only audit, schema migration with data migration | Done | `f8a5f7f` |
| 2. CMS | Levels, courses, modules, lessons, blocks, media, banks, workflow, review, releases, revisions, rollback, scheduling | Done | `f8a5f7f`, `b96168d` |
| 3. Learner loop | Catalogue, enrolment, lesson player on released snapshots, progress, assessment engine, grading, certificates, badges, verification | Done | `b96168d` |
| 4. Dashboards | Seven dashboards and KPI definitions | Done | `b96168d` |
| 5. Operations | Support desk, finance (checkout, webhooks, invoices, refunds, subscriptions, coupons, reconciliation), vendors and settlements | Done | `36912c7`, `7cb3521` |
| 6. People | Subscriber administration, corporate accounts, approvals inbox, audit viewer, users and roles, settings, privacy requests | Done | `5e15c11` |
| 7. Account | Terms and consent capture, two-step verification, account page, invitations, team view, D6–D8 | Done | `2ac1356` |
| 8. Verification | Playwright journeys, page guards, export/import, documentation | Done | `0410c18`, `9ffe25c`, docs commit |

## Remaining work (prioritised)

**Before taking real learners or money**
1. Razorpay test-mode run of `docs/TEST_PLAN.md` §5, then live keys. *(Needs the business's Razorpay account.)*
2. Email delivery configured and checked end to end. *(Needs a Resend account and domain.)*
3. Staging deployment with object storage, backups and a restore drill (`docs/OPERATIONS.md`).
4. Independent penetration test; malware scanning for uploads.
5. Legal review of terms, privacy and refund pages against the actual refund settings.
6. Replace marketing placeholders (WhatsApp number, founder credentials) and reconcile the
   marketing site's "five levels" ladder with the three learning levels (a content decision for
   the owner; the marketing pages were preserved as instructed).
7. Author real (synthetic-data) course content and assessments for each level and send them
   through review. The seeded Foundation assessment is a sample.

**Product gaps from the blueprint**
8. Automatic recurring billing (mandates) instead of prepaid periods.
9. Corporate self-service seat purchase and corporate invoicing.
10. Multi-select bulk actions in the CMS (archive, move, state change).
11. PDF certificates (today: verifiable HTML page, printable).
12. Real-time chat presence (today: polling).
13. Accessibility audit and fixes.
14. Nonce-based CSP.

**Not started by design**: mentoring scheduling, community, full CRM pipeline.
