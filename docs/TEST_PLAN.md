# Test plan

## 1. Layers

| Layer | Tool | Where | Database | What it proves |
|---|---|---|---|---|
| Unit | Vitest | `tests/unit` | none | Pure rules: permission matrix, question validation and grading, PHI screening, audit redaction, Markdown, block schemas, file sniffing |
| Integration | Vitest | `tests/integration` | real PostgreSQL (`TEST_DATABASE_URL`), truncated before each test | Services end to end: authorisation, workflow, separation of duties, idempotency, money paths |
| End to end | Playwright | `tests/e2e` | the running dev database | Real pages, real server actions, real sessions in a browser |

Integration tests replace exactly one thing: the Razorpay HTTP client (`createOrder`,
`fetchPayment`, `createRefund`). Signatures, webhooks, fulfilment and refunds run for real.

## 2. Running

```bash
# once: a local PostgreSQL with two databases (port and names are examples)
createdb -h 127.0.0.1 -p 5433 -U postgres rcms_dev
createdb -h 127.0.0.1 -p 5433 -U postgres rcms_test

npm run typecheck
npm run lint
npm test                      # unit + integration; migrates rcms_test first (tests/global-setup.ts)
TEST_DATABASE_URL=postgresql://... npm test   # to use another test database

# end to end, against a seeded dev server
npm run db:deploy && npm run db:seed && npm run dev:accounts
npm run dev                   # in another terminal
npm run test:e2e
```

`TEST_DATABASE_URL` is used instead of `DATABASE_URL` so a test run can never truncate a
development or production database by accident. Never point the E2E tests at production: they
sign in with the synthetic `@rcmexcel.com` accounts and change data.

## 3. Results at the time of writing

Run on 15 October 2026 against PostgreSQL 16:

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 0 warnings |
| `npm test` | 7 files, 71 tests, all passed |
| `npm run test:e2e` | 4 tests, all passed |
| `npm run build` | passes |

## 4. Coverage map

| Area | Tests | Negative cases included |
|---|---|---|
| Permissions | `unit/pure` (5) | auditor has nothing writable; authors cannot publish; payout request and approval in different roles; students get nothing |
| Authentication | `integration/security` | sign-up without terms refused; injected role/status/MFA ignored; unverified sign-in refused; self-escalation via profile refused; lockout after 5 failures; suspended account gets no session; owner bootstrap only once |
| Approvals | `integration/security` | requester cannot approve; cannot request own role; director cannot propose super admin; price change waits for its date; course deletion only for drafts and only by a super admin; only requester can cancel |
| CMS | `integration/cms` (17) | learners never see drafts; review lock; reviewer ≠ submitter; compliance ≠ academic; stale approvals; conflicting edits; incomplete course cannot be submitted; learner and agent writes refused and logged; audit trail cannot be edited; rollback; scheduled release; export/import refuses PHI and bad files |
| Learning | `integration/learning` (11) | not enrolled; forged answer tokens; double submit; attempt limit and wait; late answers ignored; grader ≠ learner; edited question keeps recorded result; certificates only on verified completion; revocation verifies; no self-enrol on paid courses |
| Commerce | `integration/commerce` (7) | forged signature; someone else's order; bad webhook signature; replayed event; amount mismatch; failed payment; refund by the same person; exceptional refund needs the director; subscription grace and expiry |
| Vendors | `integration/vendors` (5) | other vendor's deliverable, submission, comment and invoice refused and audited; vendor holds no admin permission; staff cannot be vendor contacts; offboarding ends sessions; incomplete onboarding; payout changer cannot approve payments; validator ≠ approver ≠ payer; invoice above fee |
| People | `integration/people` (5) | seats enforced; managers limited to their organisation; agent cannot suspend; subscriber admin cannot touch staff accounts; phone masked; notes masked; large export needs another person; formula injection neutralised; deletion anonymises |
| Browser | `e2e/journeys` (4) | learner cannot open admin or vendor areas or export; vendor cannot open learner or admin areas; agent refused finance with a notice; sign-up without terms; unknown certificate serial |

## 5. Manual checks that automated tests cannot do here

These need external accounts and have **not** been performed in this work.

**Payments (Razorpay test mode)**, with test keys and a webhook pointing at a reachable URL:
1. Buy a course with a test card and with UPI; confirm the order turns PAID, an invoice number
   is issued, the course appears in the academy and a receipt email is sent.
2. Close the browser right after paying; confirm the webhook alone completes the order.
3. Fail a payment; confirm the order is FAILED with the reason and nothing is granted.
4. Replay a delivered webhook from the dashboard; confirm nothing is duplicated.
5. Request, approve (second person) and submit a refund; confirm the provider refund and that
   the `refund.processed` webhook confirms it and removes access.
6. Buy a subscription; confirm included courses can be enrolled; move the clock past the
   period end with the cron route and confirm grace, then expiry.

**Email (Resend)**: verification, password reset, invitation, receipt and notification emails
arrive, links work once, and nothing sensitive appears in server logs.

**Two-step verification**: enrol with a real authenticator app, sign in with a code, with a
backup code, and confirm a staff account is sent to set it up when `ADMIN_MFA_REQUIRED=true`.

**Accessibility**: keyboard-only pass of the lesson player, assessment runner and curriculum
tree (move buttons); screen reader pass of forms and errors; contrast check.

## 6. Adding tests

New services take an `Actor` and are tested at the service layer with `makeUser` / `staff`
from `tests/helpers.ts`. Every new permission needs a test that the wrong role is refused.
Never skip or weaken a failing test to make a build pass; fix the cause or record it.
