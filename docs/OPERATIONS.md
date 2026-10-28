# Operations runbook

Procedures for running the platform. Commands assume the repository root and a configured
`.env` (see `.env.example`). Nothing here has been rehearsed against a production deployment;
rehearse each procedure on staging before relying on it.

## 1. First deployment

The step-by-step guide for a single server with Docker is `docs/DEPLOYMENT.md`. In short:

1. Provision MariaDB 10.6+ or MySQL 8.0.16+ with automated backups (on Hostinger, the website's own database).
2. Set the environment (host secret store, not a committed file): `DATABASE_URL`,
   `BETTER_AUTH_SECRET` (32+ random bytes), `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` (the
   public origin), `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, business invoice fields.
   Leave Razorpay keys empty until §6 is done; paid checkout stays disabled and says so.
3. `npm ci && npm run db:deploy && npm run build`.
4. Seed reference content once: `npm run db:seed` (idempotent; never overwrites).
5. Create the first administrator: the person signs up on the site with their own password
   and verifies their email; then run `npm run admin:bootstrap -- owner@yourdomain` (refuses
   if a Super Administrator already exists). They must enrol two-step verification before the
   admin area opens (enforced in production).
6. Grant other staff roles from **Administration → Users and roles**: one administrator
   requests, another approves. Never share accounts.
7. Schedule `GET /api/cron` every 15 minutes with `Authorization: Bearer $CRON_SECRET`.
8. Check **Administration → Settings and integrations**: every integration should read
   "configured" except the ones you have deliberately left off.

Never run `scripts/dev-accounts.ts` or `npm run db:reset` against production.

## 2. Routine

| When | Task | Where |
|---|---|---|
| Daily | Work the admin dashboard queue: reviews, grading, support, approvals, invoices, privacy requests | `/admin` |
| Daily | Check reconciliation exceptions and failed payments | Finance |
| Weekly | Review denied-access entries in the audit log for patterns | Audit log, outcome = denied |
| Monthly | Review staff roles; remove roles no longer needed (request + approval) | Users and roles |
| Monthly | Review vendor document expiry, contract end dates and portal access expiry | Vendors |
| Quarterly | Restore a backup to a scratch database and open it (§7) | Database provider |
| On staff departure | Remove roles, suspend the account, rotate any shared secret they could see | Users and roles; host |

## 3. Content releases

Authors draft → submit → academic review (different person) → compliance review (different
person from the academic approver) → publish or schedule. To fix a mistake in a live course:
edit the draft (the live version is untouched), send it through review, publish. To undo
quickly: **Course → History → Releases → Roll back** republishes an earlier release.

## 4. Suspected PHI or real data in the platform

1. Do not copy, forward or screenshot it.
2. Course content: archive the affected lesson or unpublish the course; edit the draft to
   remove the data; the revision history still holds it, so ask a Super Administrator to
   record the incident and, if required, have the database operator purge the affected
   revision rows under change control.
3. Support message: the message is masked on entry where patterns match; if not, record an
   internal note, close the case, and have the Super Administrator follow the same purge route.
4. Record what happened, when, who saw it and what was removed. Follow your organisation's
   incident and notification obligations. The platform does not decide these for you.

## 5. Account and access requests

- **Locked out**: wait 15 minutes or use "Forgotten it?". Staff can **Reset authentication**
  for learners from the subscriber profile (signs out everywhere, sends a reset link).
- **Lost authenticator**: the person uses a backup code. If they have none, a Super
  Administrator verifies identity out of band and removes their two-factor record in the
  database under change control; record it in the audit log notes.
- **Privacy requests**: **Subscribers → Privacy requests**. Verify identity first. Access →
  download the JSON and send it securely. Deletion → anonymises the account and revokes its
  certificates; orders and the audit trail are kept.

## 6. Payments go-live

1. Create Razorpay test-mode keys; set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
2. Add a webhook to `https://<origin>/api/payments/razorpay/webhook` for `payment.captured`,
   `order.paid`, `payment.failed`, `refund.processed`, `refund.failed`,
   `payment.dispute.created`; set `RAZORPAY_WEBHOOK_SECRET`.
3. Run every check in `docs/TEST_PLAN.md` §5. Record the results.
4. Only then switch to live keys and a live webhook secret.
5. Products are created inactive; activation and price changes need a second person with price
   authority.

## 7. Backups and restore

The application does not back itself up. Use the database provider's automated backups and
point-in-time recovery. Restore drill: restore into a new database, set `DATABASE_URL` for a
local build, start it, sign in, open a course, an order and the audit log, then destroy the
copy. Record the date and result; the compliance dashboard shows backup status as "not
visible to the application".

## 8. Secrets rotation

| Secret | Effect of rotating |
|---|---|
| `BETTER_AUTH_SECRET` | Everyone is signed out; two-factor secrets encrypted with it need re-enrolment, so plan it |
| `RAZORPAY_KEY_SECRET` | Update in Razorpay and the host together; in-flight checkouts may fail signature checks |
| `RAZORPAY_WEBHOOK_SECRET` | Update in Razorpay and the host together; failed deliveries can be retried from the dashboard |
| `CRON_SECRET` | Update the scheduler at the same time |
| `RESEND_API_KEY` | No user impact |

## 9. Vendor payouts

A payout detail change is always a request (from the vendor or the vendor manager), verified
by calling the vendor on a number already on file, and approved by a different finance person.
That approver, and whoever requested it, cannot approve that vendor's payments. Never accept a
bank change by email alone.
