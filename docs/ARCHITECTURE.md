# Architecture

How the RCM Operations Excellence Academy platform is put together, and why. Read with
`docs/FEATURE_MATRIX.md` (what exists) and `docs/SECURITY_REVIEW.md` (how it is protected).

## 1. One application, four environments

One Next.js 15 application, one PostgreSQL database, one user table, one session cookie.
The environments are route groups with their own layout guard:

| Environment | Routes | Who | Guard |
|---|---|---|---|
| Public site and catalogue | `app/(site)`, `app/page.tsx`, `/certificates/[serial]` | anyone | none (static or public data only) |
| Learner portal | `app/(portal)`: `/academy`, `/library`, `/certificates`, `/labs`, `/support`, `/account`, `/checkout`, `/team` | signed-in learners (and staff) | `app/(portal)/layout.tsx`; vendor-only contacts are sent to `/vendor` |
| Admin Control Center | `app/admin` | anyone holding a staff role | `app/admin/layout.tsx` (staff, verified, not blocked, MFA when required) |
| Vendor portal | `app/vendor` | vendor contacts | `app/vendor/layout.tsx` (vendor membership) |

Layout guards are navigation, not security. Every page calls a permission guard and every
write goes through a service that checks permission itself (§3).

## 2. Request path

```
page (server component) ──read──▶ service ──▶ Prisma ──▶ PostgreSQL
form ──▶ server action ──▶ requireActor() ──▶ service (assertCan, validation, transaction, audit)
API route (files, exports, webhooks, cron) ──▶ getActor() / signature / bearer ──▶ service
```

- **Services** (`lib/services/**`) hold all business rules. Every exported function that
  changes data takes an `Actor` and calls `assertCan(actor, permission)` first. They are the
  unit the integration tests drive.
- **Server actions** (`lib/actions/**`) are thin: parse `FormData`, call the service, revalidate
  paths. They wrap everything in `attempt()`, which turns `ServiceError`, `AuthorisationError` and
  Zod errors into `{ ok: false, error }` sentences and lets Next's redirect/notFound signals pass.
- **Pages** read through services or Prisma directly for display, after a page guard
  (`requirePagePermission`, `requireActor`).
- **Client components** never import server modules. Shared client-safe constants live in
  separate files (e.g. `lib/assessment/labels.ts`).

## 3. Identity, roles and permissions

- **Authentication**: Better Auth (`lib/auth.ts`): email and password with verification, TOTP
  two-step verification with backup codes, database-backed rate limits, lockout, session hooks
  that refuse blocked accounts and record sign-ins. `role`, `status` and `twoFactorEnabled` are
  not writable through any auth endpoint.
- **Actor** (`lib/actor.ts`): loaded fresh per request (React `cache`) with effective staff
  roles, the permission set, vendor memberships and organisations the person manages.
- **Permissions** (`lib/permissions.ts`): 64 action-level permissions, 12 staff roles, a
  role → permission matrix in code (reviewable in diffs, testable without a database). Grants
  are rows in `StaffRoleAssignment`; legacy `OWNER/ADMIN/TRAINER` map onto staff roles.
- **Maker-checker** (`lib/services/approvals.ts`): role changes, price changes, vendor payout
  changes, large exports, configuration changes, progress resets and permanent course deletion
  are requests. A different person with the approving permission decides; approval executes
  in the same transaction (or on the effective date via the scheduler).

## 4. Learning content and releases

```
LearningLevel ─┬─ Program (course) ─┬─ Module ─┬─ Lesson ─┬─ ContentBlock (10 kinds)
               │                    │          │          ├─ Resource (file)
               │                    │          │          └─ Quiz ─ QuizQuestion (or QuestionBank draw)
               │                    ├─ ContentRevision (every edit: diff + snapshot)
               │                    ├─ ReviewDecision (academic / compliance / publication)
               │                    └─ CourseVersion (immutable released snapshot)
```

- **The course is the unit of release.** Staff edit the live draft rows. Publishing builds a
  JSON snapshot of the whole course (`buildSnapshot` in `release.ts`), stores it as a
  `CourseVersion`, and points `Program.publishedVersionId` at it.
- **Learners only read snapshots** (`lib/services/learning/catalog.ts`). A draft edit, an
  unreviewed lesson or a deleted block never reaches a learner until the next release.
  Attempts, progress and certificates record the version they were made against.
- **Workflow**: Draft → In Development → Academic Review → Compliance Review → Approved →
  Scheduled → Published → Under Revision → Archived. Editing a published course moves it to
  Under Revision; the released version stays live. Review stages lock editing. Approvals are
  tied to a draft stamp (count of revisions), so a change after approval invalidates it.
- **Safety rails**: PHI and card-number screening on all authored text (`lib/cms/screen.ts`);
  restricted Markdown with no raw HTML (`lib/cms/markdown.tsx`); video embeds from an allow-list
  (`lib/cms/blocks.ts`); delete only when nothing references the item, otherwise archive.
- **Transfer**: courses export to versioned JSON and import as a new draft (`transfer.ts`).

## 5. Assessment engine

`lib/assessment/questions.ts` (pure) and `lib/services/learning/attempts.ts`:

1. Start: checks enrolment, attempt limit and retake wait; draws from the bank if configured;
   shuffles; replaces option indexes with opaque per-attempt tokens; stores the prepared
   questions (with keys) in the attempt row. The learner receives prompts and tokens only.
2. Save: answers are stored server-side as the learner works.
3. Submit: graded on the server against the stored snapshot, all-or-nothing per question,
   weighted by points; a conditional update makes double submission grade once; answers after
   the deadline (+30 s grace) are ignored. Written and file answers go to `PENDING_REVIEW`.
4. Manual grading by someone other than the learner; remediation lessons are suggested for
   missed competencies.

## 6. Commerce

```
learner ──▶ startCheckout (Order PENDING, Razorpay order) ──▶ Razorpay hosted checkout
   ▲                                                              │
   │   confirmCheckout: verify signature + fetch payment ──┐      │ webhook (HMAC over raw body,
   │                                                       ▼      ▼  idempotent by event id)
   └────────── access ◀──── fulfil(): the only place an order becomes PAID
                             (amount check, enrolment / subscription, invoice number, receipt)
```

- Money is integer paise everywhere. Numbers (`ORD-`, `INV-`, `SUP-`, `VEN-`) come from a
  locked `Counter` row, so they are sequential without gaps from races.
- A browser redirect never marks an order paid: `fulfil()` runs only after a verified
  signature plus a server-side fetch, or a verified webhook. An amount mismatch is recorded as
  a reconciliation exception and grants nothing.
- Subscriptions are prepaid periods with a grace period and expiry run by the scheduler.
- Refunds: request (policy window, consumption, routine limit) → approval by another person
  (exceptional refunds need the Academy Director) → provider refund → confirmation by webhook.

## 7. Support, vendors, corporate

- **Support** (`lib/services/support/tickets.ts`): tickets and a polling chat channel, internal
  notes, assignment, escalation map (privacy and security cases are urgent and escalated),
  approved response templates, PHI masking, transcript retention.
- **Vendors** (`lib/services/vendors/vendors.ts`): every portal function derives the vendor from
  the actor's membership, never from the request. Payout details are a provider reference and
  last four digits; changes go through approval; the person who changed or approved payout
  details cannot approve that vendor's payments; validation, approval and payment are three
  different people.
- **Corporate** (`lib/services/people/corporate.ts`): organisations with seats, groups and
  group course assignment; managers see their own organisation only.

## 8. Audit, files, scheduled work

- **Audit** (`lib/audit.ts`): one row per sensitive action and per refusal, with actor roles,
  outcome and redacted before/after. A database trigger refuses `UPDATE` and `DELETE` on
  `AuditLog` (migration `0003_platform`). Writing an audit row never fails the business action.
- **Files** (`lib/storage.ts`): stored under `storage/<area>/` outside `public/`; type decided
  by content sniffing, not the file name; size limits (25 MB, 5 MB for images); every download
  goes through a route that checks access and sets `nosniff` and a safe disposition.
- **Scheduler** (`/api/cron`, bearer `CRON_SECRET`, idempotent): scheduled releases, approved
  changes reaching their effective date, subscription lifecycle, transcript purge. The admin
  dashboard also runs the first two on load as a backstop.

## 9. Data model

79 tables and 35 enums in `prisma/schema.prisma`, grouped: identity and access, staff
authority and approvals, consent and privacy, organisations, academy content, revisions and
releases, assessment, progress and certificates, commerce, support, vendors, audit and
platform. Migrations: `0001_init`, `0002_certificates`, `0003_platform` (this work, includes the data
migration from the earlier lesson bodies and quiz answers, and the audit trigger).

## 10. Decisions

| Decision | Why |
|---|---|
| Keep the stack (Next.js, Prisma, Better Auth, Razorpay, Resend) | Working and appropriate; no reason to churn. |
| `Program` stays the course table | Renaming would touch every query for no behavioural gain. |
| Permissions in code, grants in the database | Reviewable, testable, and still changeable without a deploy through approved grants. |
| Released snapshots as JSON | Learners can never see unreleased content; history is exact. |
| Anonymise instead of delete for erasure | Financial retention and an append-only audit trail both reference the account. |
| No KPI targets | The blueprint gives none; inventing healthcare targets was ruled out. |
| INR, Razorpay, GST fields | Matches the existing business setup. |
