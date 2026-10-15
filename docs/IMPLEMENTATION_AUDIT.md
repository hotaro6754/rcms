# Implementation audit

Audit of the `rcms` repository against `US_Healthcare_RCM_Website_Blueprint_and_HTML_Templates.docx`
(the "blueprint"). Performed 15 October 2026 on branch `ccr-b00f5748-k3unfe`, starting from commit
`30f9bde`.

Every finding below is marked **[verified]** (read in the source, or reproduced by running it) or
**[assumption]** (inferred, not proven). Nothing in this document is a guess presented as fact.

## 1. Baseline

Run before any file was changed, against a local PostgreSQL 16 database:

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | passes [verified] |
| Migrations | `npx prisma migrate deploy` | 2 migrations apply cleanly [verified] |
| Seed | `npm run db:seed` | 5 programs, 19 lessons, 8 resources, 2 scenarios [verified] |
| Typecheck | `npx tsc --noEmit` | 0 errors [verified] |
| Lint | `npm run lint` | 0 problems [verified] |
| Build | `npm run build` | 47 routes, builds clean [verified] |
| Tests | — | **none exist**; no test runner configured [verified] |
| CI | — | no workflow files [verified] |

## 2. Stack (kept as-is)

- Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui primitives.
- Prisma 7 with the `pg` driver adapter; PostgreSQL. `lib/db.ts` caches the client.
- Better Auth 1.7 (email + password, email verification, password reset; Google optional).
- Server actions in `lib/actions/*` for every write; server components read Prisma directly.
- Local file storage under `storage/` (outside `public/`) behind an access-checked route.
- Resend for email, falling back to printing mail to the server log.
- GSAP + Motion on the marketing site, with an ownership audit script.

There is no technical reason to change any of this, so the platform is built on it.

## 3. What genuinely works

| Area | Status | Evidence |
|---|---|---|
| Marketing site (home, about, learning paths, courses, pricing, mentoring, community, blog, contact, 4 legal pages) | Working, static | `app/(site)/*`, `app/page.tsx` [verified by build] |
| Contact form → scored lead | Working | `lib/actions/leads.ts` `submitContact` [verified] |
| Registration, email verification, sign-in, sign-out, password reset | Working | `lib/auth.ts`, `components/auth/*` [verified in code; README records a manual end-to-end proof] |
| Owner bootstrap without a public admin route | Working | `OWNER_EMAILS` hook in `lib/auth.ts`, `scripts/set-role.ts` [verified] |
| Server-side role checks | Working, coarse | `lib/rbac.ts` rank-based `requireRole` [verified] |
| Audit rows on writes, with redaction | Working | `lib/audit.ts` [verified] |
| Admin-granted enrolment, revoke | Working | `lib/actions/academy.ts` [verified] |
| Lesson player, mark complete, progress | Working | `app/(portal)/academy/*` [verified] |
| Single-choice quizzes graded on the server, key never sent before submission | Working | `lib/actions/quiz.ts`, `QuizRunner` [verified] |
| Trainer authoring: modules, lessons, quiz questions, materials, publish toggle | Working, basic | `lib/actions/studio.ts`, `components/studio/*` [verified] |
| Certificates: rule-based eligibility, claim, admin issue/revoke, public verify page | Working | `lib/certificates.ts`, `lib/actions/certificates.ts` [verified] |
| Material downloads gated by enrolment, audited | Working | `app/api/materials/[id]/route.ts` [verified] |
| Governance Labs (capacity run, RCA, actions, executive note, rubric grading) | Working | `lib/actions/labs.ts` [verified] |

## 4. Gaps against the blueprint

### Identity and access
- **One coarse role enum** (`STUDENT/TRAINER/ADMIN/OWNER`). None of the twelve blueprint staff roles
  exist; there are no action-level permissions. Any `ADMIN` can do everything an admin can. [verified]
- **No MFA**, no login lockout, no account status (`bannedAt` exists but nothing reads or writes it),
  `lastSeenAt` never written, no last-login notice. [verified]
- Better Auth's rate limiter is at its default: memory storage, production only. [verified]
- No maker-checker anywhere (role changes, prices, refunds, exports). [verified]
- No consent or communication-preference records. [verified]

### Learning content
- **No learning-level entity.** `Program.level` is an integer on a five-step ladder
  (Learn/Perform/Master/Lead/Execute); the blueprint's three levels (Trainee, Professional,
  Leadership) do not exist as data. [verified]
- **No content blocks.** A lesson is one plain-text `body`. No images, video, callouts, scenarios. [verified]
- **Publishing is instant and per-lesson.** Any trainer can publish; an edit to a published lesson
  changes what learners see immediately. No review workflow, no published snapshot, no version
  history, no rollback. [verified]
- No duplicate, move-between-parents, archive/restore for modules or courses; courses cannot be
  created in the UI at all. [verified]
- Admin "Programs" page is read-only. [verified]

### Assessment
- Single-choice questions only, one quiz per lesson, no attempt limits, timers, retake waits, banks,
  randomisation, difficulty, competencies, manual grading or remediation. [verified]

### Commerce
- Schema only (`Product`, `Order`, `Payment`, `Invoice`, `Refund`, `Coupon`). No checkout, no
  webhook, no refund workflow, no subscriptions. Pricing is hard-coded in `lib/data/catalog.ts`. [verified]

### Operations
- No support tickets or chat. No vendor model or portal. Corporate (`Organisation`, `OrgMember`)
  is schema only. [verified]
- Admin overview is real counts but no blueprint dashboard, no KPI definitions, no exports. [verified]
- Audit log has no outcome, no record of denied access, no viewer beyond the latest ten rows, and
  nothing prevents rows being updated or deleted. [verified]

### Quality
- No automated tests, no CI. [verified]
- `.env.example` is referenced by the README but does not exist: `.gitignore` has `.env*`, which
  also ignores the example file. [verified]

## 5. Defects found in existing code

| # | Defect | Severity | Where | Status |
|---|---|---|---|---|
| D1 | Deleting a lesson checks for progress but not quiz attempts. `Quiz → Lesson` and `QuizAttempt → Quiz` cascade, so a lesson whose quiz was attempted but never marked complete deletes the learner's attempts. | High (assessment evidence loss) | `lib/actions/studio.ts` `deleteLesson` | Planned |
| D2 | Deleting a quiz question after attempts exist orphans the stored answers; historical review breaks. | Medium | `deleteQuestion` | Planned |
| D3 | Re-issuing a revoked certificate overwrites the serial on the same row, so the revoked serial stops resolving and its verification page 404s instead of saying "revoked". | Medium (verification integrity) | `lib/actions/certificates.ts` `issue` | Planned |
| D4 | `completeLesson` and `submitQuizAttempt` do not check that the lesson is published; a learner who knows a draft lesson id can complete it or attempt its quiz. | Medium | `lib/actions/academy.ts`, `lib/actions/quiz.ts` | Planned |
| D5 | Uploads trust the browser-declared MIME type. | Medium | `lib/actions/materials.ts` | Planned |
| D6 | Public contact and newsletter forms have no rate limit. | Low | `lib/actions/leads.ts` | Planned |
| D7 | No security headers (CSP frame-ancestors, nosniff, referrer policy). | Low | `next.config.ts` | Planned |
| D8 | `.env.example` missing / ignored. | Low | `.gitignore` | Planned |

## 6. Decisions taken (conservative, documented)

1. **Program is the blueprint's Course.** The table keeps its name to avoid churning every query;
   the admin UI calls it a course.
2. **Three learning levels are added as data** and the five existing programs are mapped into them:
   Foundation → Trainee; Operations and Operational Excellence → Professional; Team Leadership and
   Executive Leadership → Leadership. The marketing site's five-step ladder is untouched.
3. **The course is the unit of review and publication.** Learners read an immutable published
   release (a JSON snapshot of the whole course); staff edit a working draft. The blueprint's
   status workflow applies to the course release. See `docs/ARCHITECTURE.md`.
4. **Permissions are defined in code** (`lib/permissions.ts`), reviewed like any other code, and
   assigned to people through staff roles that are granted with maker-checker approval.
5. **Brand name, INR pricing and Razorpay** (all decided before this work) are kept.
6. **Rich text is a restricted Markdown subset rendered without HTML**, so stored XSS is not
   possible by construction rather than by sanitiser configuration.
