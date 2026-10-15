# Decisions

Each decision is reversible unless stated. Format: decision, why, how to undo.

| # | Date | Decision | Why | Reversal |
|---|---|---|---|---|
| 1 | 2026-10-15 | Keep the existing Next.js / Prisma / Better Auth stack | Working, tested, appropriate; research found no reason to switch (`docs/research/OPEN_SOURCE_AUDIT.md`) | — |
| 2 | 2026-10-15 | Do not adopt Moodle, Open edX or Canvas | Would replace the domain workflow already built; AGPL obligations for two of them | Revisit only if the custom platform is abandoned |
| 3 | 2026-10-15 | Payments stay on Razorpay (INR) | Existing integration; learners and businesses in India | Provider boundary is `lib/payments/razorpay.ts` |
| 4 | 2026-10-15 | Public catalogue, levels and prices read the database; `lib/data/catalog.ts` keeps only copy (FAQ, corporate blurb) | One source of truth; prices must match checkout | Restore imports |
| 5 | 2026-10-15 | Library content (glossary, processes, case studies, toolkit) is a separate CMS type with a single review stage, not a course | Reference content changes often and does not award certificates; course-grade two-stage review would slow it without benefit. Compliance-sensitive entries still need a reviewer other than the author | Could be modelled as courses later |
| 6 | 2026-10-15 | Mentoring "booking" becomes a request that creates a lead; no scheduling engine | No calendar integration exists; showing invented slots is fake functionality | Add a scheduler (e.g. Cal.com API) later |
| 7 | 2026-10-15 | The teaching console stays public but is labelled as a fictional worked example | It is teaching material; unlabelled it could be mistaken for client data | Remove the routes |
| 8 | 2026-10-15 | PDF certificates via a maintained MIT library if installable; otherwise documented as blocked | pdf-lib unmaintained since 2022 | Swap generator behind one function |
| 9 | 2026-10-15 | No AI assistant this round | The prompt makes it optional; it needs grounding and evaluation work that would displace core gaps | Add later over published library and lessons |
| 10 | 2026-10-15 | New prompt's documentation folders added; previous `docs/*.md` kept and cross-linked | Avoid losing history and breaking links | Consolidate later |
