# Risks and decisions

Decisions 1–10 are in `DECISIONS.md`; 11–18 below were taken this round.

| # | Decision | Why | Reversal |
|---|---|---|---|
| 11 | Build the denial case simulator first, as its own domain (not inside Governance Labs) | Owner's recommendation; labs are instructor-graded leadership exercises with a different shape | Merge later if the engines converge |
| 12 | Case definitions are JSON validated by zod, edited through forms, frozen per version | Rich structure without dozens of tables; versions make scoring reproducible | Normalise into tables if reporting needs it |
| 13 | Documentation and rationale are scored by required-element matching, labelled as automated, adjustable by instructors | No reliable automated writing judgement without an AI dependency | Swap in a reviewed AI rubric later behind the same function |
| 14 | Competency is awarded only from scored case attempts | Brief: completion is not competence | — |
| 15 | Support categories stay a fixed enum; labels, visibility, team and priority are configurable | Avoids a risky enum-to-table migration; covers the configuration needs found | Move to a table when new categories are needed often |
| 16 | Routing is deterministic (least load, then least recently assigned) | Explainable and testable; brief advises against AI routing | Add skills-based rules later |
| 17 | Assistant answers from keyword retrieval and records; AI provider optional and off by default | Works with no provider; no vector database for a small corpus; data flow to a provider needs approval | Enable the provider by configuration |
| 18 | Supersedes Decision 9 (no assistant) | The new brief makes the assistant and ticketing core | — |

## Risks

| Risk | Likelihood | Impact | Mitigation | Owner action |
|---|---|---|---|---|
| Seeded case content contains an RCM inaccuracy | Medium | High | Seeded in review, not published; sources cited; fictional payers | A qualified reviewer must check each case before approval |
| Keyword checks misjudge writing | Medium | Medium | Instructor review, adjustable scores, learner can request review | Run A3 in `../research/assumptions-and-validation.md` |
| Learners game the reveal (answer shown after attempt 2) | Medium | Low | Configurable per case; attempts limited | Tune per case |
| External AI misstates guidance | Medium | High | Off by default; sources shown; labelled; no records sent | Approve only after evaluation on real questions |
| Six production advisories in transitive dependencies | — | Medium | Tracked; need breaking upgrades | Plan Prisma CLI and postcss upgrades |
| Email not delivered | High until configured | Medium | In-app notifications | Configure Resend and verify |
