# Architecture audit

Updated 16 October 2026. The earlier full audit is `../audit/REPOSITORY_AUDIT.md`; this file records
the architecture as it now stands and what was added this round.

## Stack
Next.js 15.5.28 (App Router), React 19, Tailwind v4, Prisma 7.10 on PostgreSQL 16, Better Auth 1.7,
Vitest 3.2.4, Playwright 1.56.1. Optional: `@anthropic-ai/sdk` 0.131.0. Payments: Razorpay; email:
Resend (both need configuration).

## Layers
- **Pages** (`app/`) authorise with `requirePagePermission` / `requireActor` and read through services.
- **Server actions** (`lib/actions/`) parse form data and call services inside `attempt()`, which turns service errors into messages.
- **Services** (`lib/services/**`) take an `Actor`, check permissions (`assertCan`), validate with zod, write, audit and notify. All authorisation lives here; the UI only hides controls.
- **Pure modules** (`lib/sim/*`, `lib/support/*`, `lib/assistant/{search,intents}`) hold scoring, state machines, SLA arithmetic and retrieval with no database access, so they are unit-tested directly.
- **Scheduled work** (`/api/cron`, bearer secret): releases, expiries, approvals, subscriptions, support SLA, transcript and assistant retention.

## Added this round
| Area | Models | Key modules |
|---|---|---|
| Case simulations | SimCase, SimCaseVersion, SimAttempt | `lib/sim/definition.ts`, `lib/sim/score.ts`, `lib/services/sims/*` |
| Competencies | Competency, CompetencyOutcome | `lib/services/sims/competencies.ts` |
| Support operations | SupportTeam, SupportTeamMember, SupportCategorySetting, SupportSlaPolicy, SupportCalendar, SupportTicketEvent, SupportAttachment (+ ticket fields) | `lib/support/{states,sla}.ts`, `lib/services/support/{routing,tickets}.ts` |
| Assistant | AssistantConversation, AssistantMessage | `lib/assistant/*`, `lib/services/assistant/assistant.ts` |

Migrations 0005–0007 are additive (no drops) and add CHECK constraints and a partial unique index
(one open attempt per learner and case).

## Notable design choices
- Case attempts point at an immutable version: republishing never rescores old attempts.
- Retrieval is in-process BM25 over a small, permission-filtered corpus; no vector database.
- Routing is deterministic and explained in the case history; no AI assignment.
- The AI model has no tools; actions are taken only by services after a person confirms.

## Known weaknesses
- In-memory caches (lesson passages) are per server instance.
- Chat and support pages poll rather than push.
- The pg driver warns about overlapping queries in some Prisma code paths; one was fixed, others remain inside library code (`KNOWN_LIMITATIONS.md`).
