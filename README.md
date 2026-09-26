# RCMS Operations Academy

Public site, student portal, trainer studio and admin OS on one data layer.
Next.js 15 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Prisma · PostgreSQL · GSAP · Motion.

Build plan and phase gates: `preview/build-plan.html`.

---

## Running it

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL and BETTER_AUTH_SECRET at minimum

# Option A — no database of your own yet:
npm run db:dev            # PGlite serves real Postgres on 127.0.0.1:55432, leave running
# then set DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/postgres"
# and DATABASE_POOL_MAX="1"

npm run db:deploy         # applies prisma/migrations
npm run db:seed           # programs, products, scenario, channels, flags
npm run dev
```

`npm run db:dev` is PostgreSQL compiled to WebAssembly, served over the real wire protocol.
Prisma, psql and the app cannot tell it from a hosted database — no Docker, no cloud account.
It serves **one connection at a time**, which is why `DATABASE_POOL_MAX` must be `1` against
it. Point `DATABASE_URL` at Neon or Supabase later and nothing in the application changes.

Without a `DATABASE_URL` the marketing site still runs — every page under `/` is static and
does not touch the database. Only auth, checkout and the portals need it.

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build, 34 routes |
| `npm run lint` | ESLint |
| `npm run db:dev` | Local Postgres via PGlite, persisted in `.pgdata/` |
| `npm run db:dev:fresh` | Same, wiping `.pgdata/` first |
| `npm run db:migrate` | Apply migrations in development |
| `npm run db:deploy` | Apply migrations in production, no prompts |
| `npm run db:seed` | Idempotent seed from `lib/data/*` |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate, re-seed. Destructive |
| `npm run audit:ownership` | Fails if GSAP and Motion touch the same element |

---

## Architecture decisions

**Money is stored in paise.** `Product.amount`, `Order.amount` and every other monetary column
is an integer in minor units. No float touches money anywhere. Rupees exist only at the
presentation layer, via `inr()` in `lib/data/catalog.ts`.

**Audit is not optional.** Every mutation calls `audit()` or `withAudit()` from `lib/audit.ts`.
It never throws — a failed audit write must not roll back a successful business operation —
and it redacts tokens, passwords and gateway payloads before writing. This went in during
Phase 0 on purpose: retrofitting audit means reconstructing history you no longer have.

**Authorisation is enforced server-side.** `lib/rbac.ts` exposes `requireUser`,
`requireRole`, `requireAdmin` and `requireSelfOrAdmin`. They throw rather than return null, so
a forgotten check fails loudly instead of leaking. Hiding a link in the UI is presentation,
not security.

**Prisma 7 connects through a driver adapter.** The connection URL lives in
`prisma.config.ts` for Migrate and reaches the runtime client via `PrismaPg` in `lib/db.ts`.
The client is cached on `globalThis` in development so hot reload does not exhaust the
connection pool.

**One animation system per property.** GSAP owns the hero timeline, all hero SVG, scroll
choreography and the Flip into the dashboard. Motion owns tabs, dialogs, the command palette,
row expansion and presence. CSS owns hover and focus. `lib/animation-ownership.md` has the
full matrix; `npm run audit:ownership` enforces it and currently reports zero conflicts across
88 files with one documented exception.

**Warm stone, ink, one quiet accent.** Researched against the category: premium healthcare
brands (Abridge, Cedar, Function, Tia, Maven) put a warm stone ground under near-black ink and
spend one restrained accent; generic RCM vendors and course platforms are corporate blue.
Primary is ink, the accent is a muted eucalyptus (`--brand`). The hero sky is a live sage mist
ribbon on stone (`components/environment/AuroraField.tsx`, raw WebGL, art-directed after
FeralUI's Aurora and Mist); the closing band is ink (`.env-ink`). Environments re-declare
tokens rather than fork components, so anything placed inside one re-themes itself.

---

## Layout

```
app/
  (site)/            marketing: about, courses, pricing, mentoring, community, blog, contact, legal
  (product)/         console: overview, metrics, queues, roster, activity, policy-updates, governance
  page.tsx           homepage: hero, metric strip, programs, ladder, governance walkthrough
components/
  hero/              GSAP sequence: blueprint, lifecycle, queue, metric resolve, Flip reveal
  governance/        the Governance Room, seven stages
  dashboard/         metric cards, telemetry charts, tables, status
  site/ product/ ui/ chrome and shadcn primitives
lib/
  data/              telemetry, governance, catalog — the single source of truth
  gsap/              plugin registration and the shared "exec" ease
  db.ts auth.ts rbac.ts audit.ts
prisma/
  schema.prisma      45 tables, 8 enums
  migrations/        0001_init
  seed.ts
```

---

## Data model

45 tables in eight groups: identity, academy, commerce, sales, mentoring, governance,
community, platform. Every table carries `createdAt`/`updatedAt`; every mutation writes an
`AuditLog` row.

The governance group is the part with no equivalent in an off-the-shelf LMS. `Scenario` holds
a whole engagement's telemetry as JSON, and `LabAttempt` plus `CapacityRun`, `RcaBoard`,
`ActionItem`, `ExecutiveNote` and `RubricScore` capture what a learner decided and how it was
graded. Storing the computed capacity result on the run means a graded attempt keeps the
numbers it was graded against even if the teaching model is later edited.

---

## Known state

Built and verified end to end: marketing site, design system, GSAP hero, Governance Room,
telemetry model, database schema, migrations, seed, authentication, email verification,
RBAC and the audit trail.

The Phase 0 gate is met. Proven against a live database: registration, a verification email
carrying a working link, sign-in refused with `EMAIL_NOT_VERIFIED` before verification and
accepted after, `/account` redirecting when signed out and rendering when signed in, and
audit rows written for both `create User` and `login Session`.

**Phase 2** (thin loop) and **Phase 3** (Trainer Studio) are done. A contact enquiry becomes
a scored lead; an admin grants enrolment; a student works the curriculum and takes quizzes;
a trainer authors modules, lessons and questions and publishes them without a developer.

Not built yet: payments (Phase 1, parked), Governance Labs assessment, CRM pipeline,
finance dashboard, mentoring scheduling, community. See the build plan for the phase each
belongs to.

Surfaces: `/` public · `/academy` student · `/studio` trainer · `/admin` admin OS.

Placeholders that need real values before launch: the WhatsApp number in
`components/site/SiteFooter.tsx` and `app/(site)/mentoring`, founder credentials on the about
page, and the business/GST fields in `.env.example`.
