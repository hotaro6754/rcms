# Known limitations

Kept current. Each item states whether it is a choice, a dependency on something external, or
unfinished work.

## Blocked by external configuration

| Limitation | Needs |
|---|---|
| Payments never run against Razorpay | Razorpay test-mode keys and a reachable webhook URL; run `docs/TEST_PLAN.md` §5 |
| Email never delivered | Resend API key and verified sending domain |
| Two-step verification not tried with a real authenticator | A person with an authenticator app |
| Backups and restore | Production database provider |
| AI provider never called live | `ANTHROPIC_API_KEY`, `ASSISTANT_PROVIDER=anthropic` and an approval decision (`ASSISTANT_EXTERNAL_APPROVED=true`); then evaluate on real questions |

## Unfinished work

| Limitation | Plan ref |
|---|---|
| Automatic subscription renewal charges | not planned this round |
| Corporate self-service seat purchase | not planned this round |
| Real-time chat (polling today) | not planned this round |
| Open Badges 3.0 export | roadmap |
| Malware scanning of uploads | `docs/SECURITY_REVIEW.md` §4 |
| Accessibility: automated axe checks pass; no assistive-technology walkthrough yet | `../validation/acceptance-test-plan.md` |
| Seeded cases and competencies need expert review before publication | `risks-and-decisions.md` |
| Visual learning engine limited to the case workbench (no branching consequence or work-queue simulators) | `implementation-plan.md` |
| Documentation and rationale scoring is keyword-based (instructor can adjust) | Decision 13 |
| Support SLA ignores public holidays and does not pause while waiting for the learner | `../security/THREAT_MODEL.md` scope |
| Assistant search is keyword-based; follow-up questions are answered independently | Decision 17 |
| pg deprecation warning about overlapping queries inside some Prisma paths | `../architecture/architecture-audit.md` |

## Research limitations

- Reddit unreachable from this environment; the owner's Reddit evidence (`../research/practitioner-pain-points.md`) is recorded but not re-verified here. No customer interviews.
- Competitor prices came from search summaries and third-party aggregators; some conflict.
