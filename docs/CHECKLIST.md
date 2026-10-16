# RCMS status checklist

As of 16 October 2026, branch `ccr-b00f5748-k3unfe`.

Key: ✅ done and verified by tests or CI · 🟡 done with a stated gap · ⬜ not done · 👤 needs you (an account, a key, a decision or an expert)

Evidence for every ✅: 132 unit and integration tests, 7 end-to-end tests and 3 accessibility scans. All of them passed in GitHub Actions run 3, which also ran lint, typecheck and the production build. Feature-by-feature evidence is in `implementation/feature-status.md`.

---

## 1. Your production-readiness checklist

### Core functionality
- ✅ **All primary journeys work end to end:** learner, case practice, support, assistant, authoring and review, manager.
- 🟡 Payments, refunds and invoices are built, but have never run against Razorpay. 👤 Test-mode keys are needed.
- ✅ **No dead buttons, placeholder data or fake functionality.** These were removed in the previous round: invented mentoring slots, cohort countdown, static prices, the unlabelled fictional console and the decorative bell.
- 🟡 **Loading, empty, success and error states:** every form shows pending, error and success states, and lists show empty states. This has not been checked page by page.

### Security
- ✅ **Authorization is enforced by the backend:** every service checks permissions, the UI only hides controls, and tests cover refusals.
- ✅ **No exposed secrets:** `.env` is ignored, and `.env.example` holds placeholders only.
- ✅ **Input validation, rate limiting and security review:**
  - zod validation runs on all input.
  - Sign-in and the assistant are rate-limited.
  - Identifiers are masked in support and assistant text.
  - The threat model and security review are in `security/`.
- ⬜ No penetration test, no malware scanning of uploads.

### Data and APIs
- ✅ **Database constraints and migrations verified:** migrations 0001–0007 apply from empty in CI, with CHECK constraints and unique indexes.
- 🟡 **API and external failures handled:**
  - Payment webhooks are idempotent.
  - The assistant falls back to quoting if AI fails.
  - Email delivery is unverified (👤 Resend key).
- ✅ **Duplicate requests and concurrent updates:** optimistic locking, conditional updates and partial unique indexes, with tests for double-submit and two agents accepting at once.

### UI and accessibility
- 🟡 **Mobile, tablet, desktop:** desktop checked throughout and phone width checked on the case workbench. Tablet has not been checked.
- 🟡 **Keyboard, focus, labels, contrast:** automated WCAG 2.1 A/AA scans pass on 24 pages. ⬜ No manual keyboard or screen-reader walkthrough yet.
- 🟡 **Console errors and broken assets:** a duplicate-key error on public pages was fixed today. Not every page has been scanned for console errors.

### Testing
- ✅ Unit and integration tests pass (132).
- ✅ Critical journeys are tested end to end (7 tests, plus the recorded demo).
- ✅ Unauthorized access and regression cases are tested: role boundaries, permission refusals, visibility, answer-key leakage.

### Production readiness
- ✅ **Production build succeeds from a clean checkout** (CI).
- 🟡 **Environment variables and deployment configuration:** documented in `.env.example`. 👤 Not deployed anywhere yet.
- ⬜ **Monitoring, backups and rollback plan:** not set up. 👤 This needs your hosting and database provider (`OPERATIONS.md` has the starting points).

### Business readiness
- 🟡 **Pricing and permissions:** prices on the site are the ones checkout charges, and permissions are tested. 👤 The gateway is not live.
- 🟡 **Privacy, retention and legal:**
  - Retention is implemented: support transcripts after 730 days, assistant conversations after 90 days.
  - Data requests are built in.
  - 👤 Terms, privacy and refund pages need a lawyer's review.
  - No HIPAA or PCI claims are made.
- ✅ **Documentation and support paths** are in place.

---

## 2. What has been built (all rounds)

### Platform foundation
- ✅ Roles and permissions: 12 staff roles; role grants need a second person's approval (maker-checker); account status checks.
- ✅ Sign-in: two-step verification, lockout, and a fresh sign-in required for sensitive actions.
- ✅ Audit log that cannot be edited or deleted (enforced by a database trigger).
- ✅ Admin bootstrap with no public admin registration.

### Content and learning
- ✅ **CMS:**
  - Levels, courses, modules, lessons and nine content block types, including audio with a transcript.
  - Templates, prerequisites, scheduled release and expiry, review dates and sources, bulk actions, revision history and rollback.
- ✅ Two-stage review (academic, then compliance) before release; learners read immutable released versions.
- ✅ Library (glossary, processes, case studies, toolkit), reviewed before it appears on public pages.
- ✅ Assessments: question banks, randomisation, manual grading of written answers and uploads.
- ✅ Certificates with public verification and PDF download; revoke and reissue.
- ✅ Bookmarks, progress, module locks.

### Flagship: denial case simulator
- ✅ Authoring: structured editor and preview. A different reviewer approves, which freezes an immutable version; cases can be retired.
- ✅ Learner workbench:
  - Claim layout, timeline and evidence.
  - Workflow strip showing the steps.
  - Autosave and resume; attempt limits.
- ✅ Scoring:
  - Server-side, with a weighted rubric.
  - Critical errors fail an attempt.
  - Passing can require the correct action.
  - Identifiers in notes are detected.
  - The answer is revealed only after a pass or the second attempt.
- ✅ Instructor review: adjust the two writing scores, write feedback; earlier outcomes are kept in history.
- ✅ Three seeded synthetic cases (👤 need expert review).

### Competencies
- ✅ Framework with levels 1–6, evidence criteria, thresholds and reassessment; activated by a different reviewer.
- ✅ Demonstrated only through scored cases; learner view and corporate manager matrix.

### Support operations
- ✅ Teams and members (lead, availability, case limit); topic routing; least-loaded automatic assignment with a team-queue fallback.
- ✅ **Enforced status flow:** resolving needs a learner-visible summary, and learners can reopen within 14 days.
- ✅ **Targets and escalation:** first-response and resolution targets over support hours. Warnings and breaches are recorded once, raise the priority and alert team leads. Resolved cases close automatically after 7 days.
- ✅ Case history, attachments, context capture (course, page, lesson), "ask support" links, workspace views, search, and a settings page with measures.

### Assistant and copilot
- ✅ Answers only from material the person may read, with sources. Answer keys and drafts are never searched.
- ✅ Progress, certificates and tickets are answered from records; asking for a human creates a real ticket and returns its number.
- ✅ Staff copilot: read-only commands, plus assigning a ticket only after confirmation.
- ✅ Feedback buttons, rate limit, user deletion, 90-day retention.
- 🟡 Optional AI provider: built, off by default, never called live.

### Commerce, vendors and corporate (earlier rounds)
- 🟡 **Checkout, payments, refunds and invoices:**
  - Built: checkout, payment webhooks (signature-verified and idempotent), refunds with a second approval (maker-checker) and invoices.
  - Not run against a live gateway.
- ✅ Vendor portal (separation of duties for bank details and payments), corporate accounts and groups, subscriber administration, privacy requests.

### Quality and delivery
- ✅ CI on GitHub Actions; accessibility scans; production build.
- ✅ Research, audit, architecture, security, plan and validation docs.
- ✅ **Recorded demo:** `npm run demo:record` re-records it.

---

## 3. Needs you 👤
- [ ] An RCM expert reviews and approves the three seeded cases, the five competencies and the 21 library entries.
- [ ] Razorpay test-mode keys and a reachable webhook URL, then run `TEST_PLAN.md` §5.
- [ ] Resend API key and a verified sending domain, so email notifications can be checked.
- [ ] Choose hosting and a database provider; set up monitoring, backups and a rollback plan.
- [ ] Legal review of terms, privacy and refund pages.
- [ ] **Decide the assistant's ML direction.**
  - Proposal: local embedding search and re-ranking, with a confidence-based hand-off and n8n as orchestrator.
  - To test with real models here, allow `huggingface.co` in this environment's network settings.
  - Confirm n8n's licence fits your use.
- [ ] Run the validation interviews in `research/assumptions-and-validation.md` (learners, team leads, BPO training heads).
- [ ] Have someone try two-step verification with a real authenticator app.

## 4. Still to build ⬜ (suggested order)
1. **ML retrieval for the assistant:**
   - Local sentence embeddings combined with keyword search, plus a re-ranker.
   - A confidence threshold that triggers the hand-off.
   - A signed n8n webhook contract and a starter n8n workflow.
2. **More cases:** the top denial types from team-lead ranking (eligibility, coordination of benefits, timely filing, coding/modifier, underpayment).
3. **Work-queue and AR-aging simulators:** prioritising a queue under time pressure.
4. **Branching cases:** a choice leads to a new situation, and consequences play out over several steps.
5. **Competencies from quizzes:** quiz questions tagged with a competency feed outcomes.
6. **Ticket routing:** an ML classifier once there are a few hundred real labelled tickets.
7. **Live updates:** real-time support chat and notifications (polling today).
8. **Enterprise:** Open Badges certificates, SSO, self-service corporate seat purchase, automatic subscription renewal.
9. **Hardening:**
   - Malware scanning of uploads.
   - Dependency upgrades for the six advisories.
   - Support targets that pause while waiting for the learner, plus a holiday calendar.
10. **Manual accessibility and device pass:** keyboard, screen reader, tablet.
