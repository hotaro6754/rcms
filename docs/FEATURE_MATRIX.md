# Feature matrix

Blueprint requirement → what exists now → where → how it is evidenced. Status as of commit on
branch `ccr-b00f5748-k3unfe`, 15 October 2026.

**Status key**

| Status | Meaning |
|---|---|
| Done | Implemented end to end and covered by an automated test or a recorded browser run. |
| Done (UI) | Implemented and exercised in the browser smoke run; no dedicated automated test. |
| Partial | Works, but a named part of the blueprint requirement is missing. |
| Needs configuration | Code is complete, but it depends on an external account that has not been configured or tested here. |
| Not built | Not implemented. |

Test references: `U` = `tests/unit/pure.test.ts`, `cms` / `learning` / `security` / `commerce` /
`vendors` / `people` = `tests/integration/<name>.test.ts`, `E2E` = `tests/e2e/journeys.spec.ts`.

## 1. Environments

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Public marketing site preserved | Done | `app/(site)`, `app/page.tsx` | build; unchanged pages |
| Public course catalogue and course detail | Done (UI) | `app/(site)/catalog` | smoke run |
| Learner portal | Done | `app/(portal)` | E2E learner journey |
| Admin Control Center, permission-filtered navigation | Done | `app/admin`, `lib/admin-nav.ts` | E2E role boundaries |
| Vendor portal, isolated | Done | `app/vendor`, `lib/services/vendors` | vendors, E2E |
| Corporate manager view | Done | `app/(portal)/team` | people |

## 2. Identity and access

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Registration with country, time zone, terms (server-enforced), marketing consent | Done | `lib/auth.ts`, `components/auth/AuthForm.tsx` | security, E2E |
| Consent records with policy version | Done | `ConsentRecord` | security |
| Email verification before sign-in; account activates on verification | Done | `lib/auth.ts` | security |
| Password reset | Done | `app/(auth)/forgot-password`, `reset-password` | pre-existing; manual |
| Account statuses (pending, active, trial, payment pending/failed, grace, suspended, cancelled, completed, deactivated, archived) | Done | `AccountStatus`, `lib/actor.ts` | security, people |
| Blocked statuses cannot open a session; suspension ends sessions | Done | `session.create.before`, `setStatus` | security, people |
| Lockout after repeated failed passwords | Done | `lib/auth.ts` (5 / 15 min, configurable) | security |
| Rate limits on auth endpoints, database-backed | Done | `lib/auth.ts` `rateLimit` | config; disabled in tests |
| TOTP two-step verification, backup codes, trusted device | Done (UI) | `/account/security`, `/two-factor` | browser run; plugin is Better Auth's |
| MFA required for staff in production; staff cannot disable it | Done | `lib/actor.ts` `mfaRequired`, `lib/auth.ts` | admin layout redirect |
| No public administrator registration; first-owner bootstrap only | Done | `scripts/bootstrap-admin.ts`, `OWNER_EMAILS` (first run only) | security |
| Role and status cannot be set from the client | Done | `additionalFields input:false`, `user.create.before` | security, E2E |
| Invitations (hashed token, 14 days, single use) | Done (UI) | `/invite/[token]`, `subscribers.invite` | code path; page rendered in browser run |

## 3. Roles and permissions

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| 12 staff roles from the blueprint | Done | `lib/permissions.ts` `STAFF_ROLES` | U |
| Action-level permissions (64), enforced in services | Done | `assertCan` in every service | cms, security, vendors, people |
| Page guards with audited refusal | Done | `requirePagePermission` | E2E |
| Role changes by request + approval by another administrator | Done | `approvals.ts` `ROLE_CHANGE` | security |
| Only a Super Administrator may grant Super Administrator; the last one cannot be removed | Done | `ROLE_CHANGE` handler | U, security (grant rule); code path (last-one rule) |
| Denied access is audited | Done | `assertCan` | cms, vendors |

## 4. Learning content (CMS)

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Hierarchy Academy → Level → Course → Module → Lesson → Blocks / Resources / Assessment | Done | schema, `lib/services/cms` | cms |
| Three levels (Trainee, Professional, Leadership) seeded from the blueprint | Done | `prisma/seed-academy.ts` | seed |
| Tree view with drag and drop and keyboard-accessible move controls | Done (UI) | `components/cms/CurriculumTree.tsx` | browser run |
| Block editor: text, heading, callout, image, video (allow-listed hosts), link, table, steps, scenario, code | Done | `lib/cms/blocks.ts` | U, cms |
| Restricted Markdown (no HTML) | Done | `lib/cms/markdown.tsx` | U |
| PHI / card-number screening on authored content | Done | `lib/cms/screen.ts` | U, cms |
| Media library with usage tracking and archive | Done (UI) | `/admin/content/media` | browser run |
| Duplicate, move (within and across parents), archive, restore, safe delete | Done | `structure.ts` | cms |
| Workflow Draft → In Development → Academic Review → Compliance Review → Approved → Scheduled → Published → Under Revision → Archived | Done | `release.ts` | cms |
| Separation of duties (reviewer ≠ submitter; compliance ≠ academic approver; publisher rules) | Done | `release.ts` | cms |
| Review lock while in review | Done | `core.ts` `lockedCheck` | cms |
| Revisions with field diff, compare, rollback; release history and rollback | Done | `history.ts`, `release.ts` | cms |
| Learners only ever see the released snapshot | Done | `CourseVersion`, `catalog.ts` | cms |
| Scheduled publication | Done | `runScheduledPublications`, `/api/cron` | cms |
| Optimistic concurrency on edits | Done | `lockVersion`, `expectedUpdatedAt` | cms |
| Course export / import (JSON) | Done | `transfer.ts` | cms |
| Bulk operations | Partial | group course assignment, bulk invitations | No multi-select bulk edit of lessons or courses |
| Preview as learner | Done (UI) | `/admin/content/courses/[id]/preview` | browser run |

## 5. Assessment

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Question types: single, multiple, true/false, matching, sequence, short answer, file upload, scenario stem | Done | `lib/assessment/questions.ts` | U, learning |
| Server-side grading; answer keys never sent before submission | Done | `attempts.ts` | learning |
| Time limit with server deadline, attempt limit, retake wait | Done | `attempts.ts` | learning |
| Question banks with random draw; randomised question and option order | Done | `assessments.ts`, `questions.ts` | U (opaque per-attempt tokens); bank draw is a code path without a dedicated test |
| Manual grading queue; grader ≠ learner | Done | `/admin/grading`, `gradeManually` | learning |
| Remediation links to lessons | Done | `remediationLessonId` | learning |
| Lesson completion on assessment pass | Done | `completionRule` | learning |

## 6. Progress, certificates, badges

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Lesson views, completion, resume, persisted progress | Done | `progress.ts` | learning, E2E |
| Certificate eligibility from the released version | Done | `lib/certificates.ts` | learning |
| Claim, manual issue, revoke, re-issue (new serial, old one still resolves as revoked) | Done | `learning/certificates.ts` | learning |
| Public verification page | Done | `/certificates/[serial]` | E2E |
| Level badges | Done | `maybeAwardBadge` | learning |
| PDF certificate | Not built | — | The certificate is an HTML page that prints from the browser |

## 7. Subscribers

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Directory with search and filters | Done (UI) | `/admin/subscribers` | smoke run |
| Profile: status, enrolments, access extension, complimentary access, notes, orders, tickets, consent, notifications | Done | `/admin/subscribers/[id]` | people, E2E |
| Sensitive fields masked without permission; sensitive views audited | Done | `subscribers.profile` | people |
| Staff accounts excluded from learner administration | Done | `LEARNERS_ONLY` | people |
| Progress reset via approval | Done (UI) | `PROGRESS_RESET` | code path (approval engine itself is tested in security) |
| Exports: minimum fields, formula-injection safe, approval above threshold | Done | `exportSubscribers` | people |
| Privacy requests: access (JSON export), correction, deletion (anonymisation) | Done | `/admin/privacy`, `/account` | people |

## 8. Corporate accounts

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Organisations with seats, contract dates, managers | Done | `corporate.ts` | people |
| Groups, group course assignment → corporate enrolments | Done | `corporate.ts` | people |
| Team progress for managers (own organisation only) | Done | `teamReport`, `/team` | people |
| Corporate self-service purchase of seats | Not built | — | Seats are set by staff against an offline contract |

## 9. Commerce

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Products: course, track, subscription plans; activation needs price authority | Done | `products.ts` | commerce |
| Price changes by approval with effective date | Done | `PRICE_CHANGE` | security |
| Hosted checkout (Razorpay), signature verification, server fetch of the payment | Needs configuration | `checkout.ts`, `lib/payments/razorpay.ts` | commerce (provider HTTP mocked) |
| Webhooks: signature check, idempotency, amount mismatch → reconciliation exception | Needs configuration | `webhooks.ts` | commerce |
| Never paid on a browser redirect alone | Done | single `fulfil()` path | commerce |
| Invoices with sequential numbers; printable | Done | `Invoice`, `/account/invoices/[id]` | commerce |
| Coupons | Done (UI) | `/admin/finance/coupons` | smoke run |
| Subscriptions: prepaid periods, grace period, expiry, cancellation at period end | Done | `runSubscriptionLifecycle` | commerce |
| Automatic recurring card charges | Not built | — | Renewal is a new purchase; no mandate/auto-debit |
| Refunds: policy window and consumption check, maker-checker, exceptional → Academy Director, provider refund, confirmation by webhook | Done / Needs configuration | `refunds.ts` | commerce |
| Reconciliation status per payment | Done (UI) | `/admin/finance` | smoke run |
| Card data never stored | Done | hosted checkout only | design |

Nothing here has been run against Razorpay's servers. Before taking money, run the checklist in
`docs/TEST_PLAN.md` §5 with test-mode keys.

## 10. Support

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Tickets with categories, priorities, SLA first-response target, escalation map | Done (UI) | `tickets.ts`, `/support`, `/admin/support` | browser run |
| Chat channel | Partial | `channel: CHAT` | Polls for new messages; no websocket presence |
| Internal notes, assignment, queue, approved response templates (edit → re-approval) | Done (UI) | `/admin/support/*` | browser run |
| PHI warning and masking in messages | Done | `mask()` | U |
| Transcript retention purge | Done | `purgeTranscripts`, cron | code path |

## 11. Vendors

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Vendor profile, type, risk, data-access class, contract dates | Done | `vendors.ts` | vendors |
| Lifecycle Proposed → … → Offboarded; approval needs complete onboarding + access expiry | Done | `setVendorStatus` | vendors |
| Onboarding checklist | Done | `ONBOARDING` | vendors |
| Documents with expiry and vendor visibility | Done (UI) | `/admin/vendors/[id]` | browser run |
| Deliverables, submissions, review, comments, scorecard | Done | `vendors.ts` | vendors |
| Portal isolation (own records only; no subscribers, revenue, settings) | Done | `portalVendor` | vendors, E2E |
| Payout details as provider reference + last four only; change by approval | Done | `VENDOR_PAYOUT_CHANGE` | vendors |
| Invoice → validation → approval → payment recorded → reconciled, each by a different person | Done | settlements | vendors |
| Whoever changed payout details cannot approve that vendor's payments | Done | `approveSettlement` | vendors |
| Offboarding ends portal sessions | Done | `setVendorStatus` | vendors |

## 12. Dashboards and reporting

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Seven dashboards (executive, learning, subscribers, support, finance, vendors, compliance) | Done (UI) | `dashboards.ts`, `/admin/reports` | smoke run |
| KPI definitions (formula, population, exclusions, source, owner, reviewer) | Done (UI) | `kpi.ts` (16 KPIs) | shown on each dashboard |
| Targets | Deliberately empty | `kpi.ts` | The blueprint gives none; inventing them was ruled out |
| CSV export of dashboard aggregates, audited | Done | `/api/reports/[board]` | code path |

## 13. Security, privacy and audit

| Requirement | Status | Where | Evidence |
|---|---|---|---|
| Append-only audit log (database trigger) with filters | Done | migration `0003`, `/admin/audit` | cms |
| Redaction of secrets and card-like numbers in audit data | Done | `lib/audit.ts` | U |
| Upload type sniffing, size limits, storage outside `public/`, access-checked downloads | Done | `lib/storage.ts`, `app/api/*` | U |
| Security headers and CSP | Done | `next.config.ts` | curl check |
| Public form rate limits | Done | `lib/rate-limit.ts` | code path |
| Malware scanning of uploads | Not built | — | See SECURITY_REVIEW residual risks |
| Formal accessibility audit | Not done | — | Keyboard alternatives built; no WCAG audit run |

## 14. Not in scope of this round

Mentoring scheduling, community, the full CRM pipeline and the governance console pages exist
as they did before this work (or as static pages) and were not extended.
