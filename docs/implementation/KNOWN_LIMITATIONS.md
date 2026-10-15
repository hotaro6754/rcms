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

## Unfinished work

| Limitation | Plan ref |
|---|---|
| Automatic subscription renewal charges | not planned this round |
| Corporate self-service seat purchase | not planned this round |
| Real-time chat (polling today) | not planned this round |
| Open Badges 3.0 export | roadmap |
| AI support assistant | Decision 9 |
| Malware scanning of uploads | `docs/SECURITY_REVIEW.md` §4 |
| Formal accessibility audit (automated checks planned, B20) | B20 |

## Research limitations

- No Reddit or first-hand community evidence; no customer interviews.
- Competitor prices came from search summaries and third-party aggregators; some conflict.
