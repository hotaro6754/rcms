# Repository audit

Audit of branch `ccr-b00f5748-k3unfe` at commit `251b62c` (plus the research commit), 15 October
2026, against the blueprint and the "Research, Audit & Build" master prompt. The first audit of the
original repository (commit `30f9bde`) is kept in `docs/IMPLEMENTATION_AUDIT.md`; this one
describes the platform as it stands after that round of work.

Every classification is backed by a test, a code reference or an observation in a running app.

| Classification | Meaning here |
|---|---|
| VERIFIED WORKING | Automated test or recorded browser run exercises it |
| PARTIALLY IMPLEMENTED | Works, but a named part of the requirement is missing |
| UI ONLY / MOCKED | Shown on screen without real behaviour behind it |
| BROKEN | Reproducibly wrong |
| NOT IMPLEMENTED | Absent |
| NOT VERIFIED | Code exists but no test or run covers it, usually because it needs an external account |

## 1. Architecture and stack

Next.js 15.5.25 (App Router, server actions), React 19.1, TypeScript strict, Tailwind v4,
shadcn/ui primitives, Prisma 7.10 with the `pg` adapter, PostgreSQL 16, Better Auth 1.7 with the
two-factor plugin, Razorpay (orders, checkout, webhooks), Resend email, local file storage, GSAP
and Motion on the marketing site. Node 22, npm 10. Detailed in `docs/ARCHITECTURE.md`.

Layering: pages → server actions → services (`lib/services/**`, which hold every permission check
and business rule) → Prisma. Learners read immutable released course snapshots.

## 2. Structure and entry points

| Entry point | Path |
|---|---|
| Public site and catalogue | `app/page.tsx`, `app/(site)/**` |
| Auth pages | `app/(auth)/**`; API `app/api/auth/[...all]` |
| Learner portal | `app/(portal)/**` |
| Admin Control Center | `app/admin/**` |
| Vendor portal | `app/vendor/**` |
| Teaching console (worked example) | `app/(product)/**` |
| Webhook / cron / file / export routes | `app/api/**` |
| Schema and migrations | `prisma/schema.prisma` (79 models, 35 enums), `prisma/migrations/0001–0003` |
| Seeds | `prisma/seed.ts`, `prisma/seed-academy.ts`; `scripts/dev-accounts.ts` (local only) |

## 3. Implemented features

| Feature | Classification | Evidence |
|---|---|---|
| Registration with server-enforced terms and consent records | VERIFIED WORKING | `lib/auth.ts` hooks; `tests/integration/security.test.ts`; `tests/e2e/journeys.spec.ts` |
| Email verification gate, status activation | VERIFIED WORKING | security test |
| Email delivery | NOT VERIFIED | `lib/email.ts`; Resend key not configured |
| Lockout, rate limits, blocked statuses | VERIFIED WORKING | security test |
| Two-step verification (TOTP, backup codes) | NOT VERIFIED | `/account/security`, `/two-factor`; pages rendered, no real authenticator run |
| 12 roles, 64 permissions, service-layer enforcement | VERIFIED WORKING | `lib/permissions.ts`; unit + integration tests; E2E role boundaries |
| Maker-checker approvals | VERIFIED WORKING | `lib/services/approvals.ts`; security, people, vendors tests |
| CMS hierarchy, block editor, workflow, reviews, releases, history, rollback, scheduling, export/import | VERIFIED WORKING | `lib/services/cms/**`; `tests/integration/cms.test.ts` (17) |
| CMS drag-and-drop tree, media library, preview | VERIFIED WORKING (browser) | recorded browser runs; no automated UI test |
| Assessment engine (types, timing, limits, banks, manual grading, remediation) | VERIFIED WORKING | `lib/assessment/questions.ts`, `lib/services/learning/attempts.ts`; unit + learning tests |
| Progress, completion rules, resume | VERIFIED WORKING | learning test; E2E persists after reload |
| Certificates: eligibility, claim, issue, revoke, re-issue, public verification | VERIFIED WORKING | learning test; E2E verification page |
| Level badges | VERIFIED WORKING | learning test |
| Subscriber administration, exports, privacy requests | VERIFIED WORKING | `tests/integration/people.test.ts` |
| Corporate accounts and manager view | VERIFIED WORKING | people test |
| Checkout, webhooks, refunds, invoices, subscriptions | VERIFIED WORKING against mocked provider HTTP; **NOT VERIFIED** against Razorpay | `tests/integration/commerce.test.ts` |
| Support tickets, templates, escalation | PARTIALLY IMPLEMENTED | `lib/services/support/tickets.ts`; browser run; no automated test; chat is polling |
| Vendors: lifecycle, deliverables, settlements, isolation, payout separation | VERIFIED WORKING | `tests/integration/vendors.test.ts` |
| Seven dashboards with KPI definitions | VERIFIED WORKING (browser) | `lib/services/reports/**`; pages rendered; no numeric assertions |
| Append-only audit log and viewer | VERIFIED WORKING | trigger tested in cms test; viewer rendered |
| Security headers, upload sniffing, CSV injection guard | VERIFIED WORKING | curl check; unit tests |

## 4. Partially implemented

| Feature | Missing part |
|---|---|
| Public course catalogue | `/catalog` reads the database, but `/courses`, `/learning-paths`, `/pricing` and the homepage learning-path section read **hard-coded** data in `lib/data/catalog.ts` (old five-level ladder, fixed prices). Prices shown there can disagree with what checkout charges. |
| CMS | No reusable templates; no audio block; no scheduled expiry/unpublish; no prerequisites between modules or courses; lesson-level supporting sources and last/next review dates (course-level dates exist); no multi-select bulk actions; no autosave |
| Learner portal | No bookmarks; no self-service account deactivation (privacy deletion request exists) |
| Certificates | No downloadable PDF |
| Sensitive admin actions | Approvals exist, but no re-authentication step before deciding them |
| Support | Chat is polling, not real-time |
| Billing | Prepaid periods only; no automatic renewal charges; no corporate self-service purchase |

## 5. Missing from the blueprint / master prompt

| Requirement | Classification |
|---|---|
| Public RCM process library | NOT IMPLEMENTED |
| Public resources and glossary | NOT IMPLEMENTED |
| Public tests and case studies page | NOT IMPLEMENTED |
| Public leadership toolkit | NOT IMPLEMENTED |
| Content review and governance policy page | NOT IMPLEMENTED (legal pages cover terms, privacy, refund, disclaimer) |
| AI support assistant over approved content | NOT IMPLEMENTED (optional in the prompt; not started deliberately) |
| Open Badges / verifiable credential export | NOT IMPLEMENTED (roadmap) |

## 6. Broken or misleading flows

| Ref | Defect | Classification | Evidence |
|---|---|---|---|
| A1 | Mentoring "booking" panel shows invented time slots for "week of 8 September", some marked "already booked", that are not stored anywhere; the button only links to `/contact` | UI ONLY / MOCKED | `components/site/BookingPanel.tsx` `SLOTS` |
| A2 | Footer "Next cohort" countdown to 6 October 2026, now in the past, shows 0 days; there is no cohort feature | UI ONLY / MOCKED | `components/site/footer/FooterLive.tsx`, `NEXT_COHORT` |
| A3 | Public pricing and course pages can show prices that differ from the products checkout charges | BROKEN (data integrity) | `app/(site)/pricing/page.tsx` uses `lib/data/catalog.ts`; checkout uses `Product` |
| A4 | Teaching console shows a client name and operational metrics with no label saying the client is fictional and the data synthetic | UI ONLY / MOCKED (unlabelled) | `app/(product)/**`, `lib/data/telemetry.ts` `CLIENT` |
| A5 | Public site still describes five levels while the academy delivers three | Content inconsistency | `lib/data/catalog.ts` `LEVELS`, `components/home/LearningPath.tsx` |

## 7. Security and authorisation

No open authorisation defect found in this audit. Earlier findings D1–D11 are fixed and listed in
`docs/SECURITY_REVIEW.md`. Weaknesses that remain:

- Production dependency advisories (`npm audit --omit=dev`, 15 Oct 2026): **1 critical, 15 high,
  3 moderate**. Some have non-breaking fixes, including `next` 15.5.28 (SSG/ISR cache poisoning,
  bundled PostCSS issues), `proxy-addr`, `sharp`, `brace-expansion`, `source-map-js`. Others come
  through tooling (`prisma` CLI's `@prisma/config`/`mysql2`, `shadcn` CLI) where the suggested fix
  is a major downgrade.
- `shadcn` (a CLI) is a runtime dependency; it should be a dev dependency.
- No re-authentication before sensitive approvals.
- CSP allows inline scripts; uploads are not malware-scanned (documented residual risks).

## 8. Database and data integrity

- Strong points: restrict foreign keys on learner history; released snapshots; unique constraints
  for attempts, webhook events and numbering counters; append-only audit trigger.
- Risk: public price display not sourced from `Product` (A3).
- Risk: no automated migration test against a copy of production-shaped data (only fresh databases).

## 9. UX, accessibility and responsive design

- Keyboard alternatives for drag-and-drop; labelled form fields; status regions for form results.
- **No automated accessibility check has been run.** No screen-reader pass.
- Admin header is crowded at medium widths (observed in screenshots).

## 10. Testing and deployment

- 71 unit/integration tests and 4 Playwright tests pass (see `docs/TEST_PLAN.md`).
- **No CI workflow**, no Dockerfile, no `engines` field. Builds are verified only locally.
- E2E covers 5 of the prompt's 15 mandatory scenarios directly; most others are covered at the
  service layer only.

## 11. Dependencies and maintenance

- Core dependencies are current majors. Advisories in §7.
- GSAP + Motion on the marketing site with an ownership audit script.

## 12. Technical debt

- Two catalogue sources (static `lib/data/catalog.ts` and the database).
- `lib/rbac.ts` kept as a compatibility re-export.
- Legacy `Program.level` (marketing ladder number) alongside `levelId`.
- Documentation split across `docs/*.md` (previous round) and the folders this prompt asks for;
  the previous files remain and are linked from the new ones.
