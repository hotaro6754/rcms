# Security review (this round)

The baseline review is `../SECURITY_REVIEW.md`; the threat model is `THREAT_MODEL.md`. This file
records what changed on 15–16 October 2026.

## New surfaces reviewed
Case simulations, competencies, support routing/SLA/attachments, the assistant and copilot,
fresh sign-in for sensitive actions (from the previous round).

## Defects found and fixed
1. **Submit-button value dropped** in any `ActionForm` whose form had a field named `id`: `form.id` resolved to that input, React's temporary submitter input pointed at no form, and Approve/Request-changes posted with no decision. Fixed in `components/admin/ActionForm.tsx`; covered by the case E2E.
2. **Notifications to non-user authors** (seeded content authored by "seed") raised a foreign-key error and aborted reviews. `notifyUsers` now skips ids without an account.
3. **Concurrent queries inside a transaction** in lesson state changes (pg 9 will reject); made sequential.
4. **Chat state lost on first answer** (remount wiped typed text and a pending reply). Fixed.
5. **Accessibility:** contrast and ARIA defects found by axe; fixed (`../implementation/PROGRESS.md`).

## Checks run
- 132 unit and integration tests, 7 end-to-end tests, 3 accessibility scans: all pass locally.
- Production build passes. `npm audit --omit=dev`: 6 advisories (1 moderate, 5 high) in transitive
  dependencies of the Prisma CLI chain, postcss and others; unchanged from before this round, none
  introduced by it. They need upgrades with breaking changes and are tracked in `KNOWN_LIMITATIONS.md`.

## Not done
No penetration test, no dependency SBOM review, no malware scanning of uploads, no secret-scanning
beyond the repository's existing checks.
