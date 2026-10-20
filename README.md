# RCMExcel

Public site, learner portal, Admin Control Center and vendor portal on one data layer.
Next.js 15 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Prisma 7 · PostgreSQL · Better Auth · GSAP · Motion.

Documentation: `docs/IMPLEMENTATION_AUDIT.md` (starting point) · `docs/FEATURE_MATRIX.md` (what
exists) · `docs/ARCHITECTURE.md` · `docs/SECURITY_REVIEW.md` · `docs/TEST_PLAN.md` ·
`docs/IMPLEMENTATION_PLAN.md` · `docs/OPERATIONS.md` · `docs/DEPLOYMENT.md` (putting it online).

Training data only: the platform must never hold real patient, provider, payer or card data.

---

## Running it

**Quickest, on your own computer** (needs only Node.js 22; no database install, no setup):

```bash
npm install
npm run local
```

It creates `.env`, starts a local database, adds the starter content and the synthetic test
accounts (password `Rcms-dev-password-1`; sign in as `super@rcms.test`), and opens the site at
http://localhost:3000. Ctrl-C stops everything; your data is kept in `.pgdata/`.

The same steps by hand, if you want to run each part yourself:

```bash
npm install
cp .env.example .env      # DATABASE_URL and BETTER_AUTH_SECRET at minimum

# No database of your own yet:
npm run db:dev            # PGlite serves real Postgres on 127.0.0.1:55432, leave running
# then set DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/postgres"
# and DATABASE_POOL_MAX="1"

npm run db:deploy         # applies prisma/migrations
npm run db:seed           # levels, courses, sample assessment, plans, reference data (idempotent)
npm run dev:accounts      # LOCAL ONLY: one synthetic account per role, see below
npm run dev
```

`npm run dev:accounts` creates `student@`, `super@`, `director@`, `content@`, `academic@`,
`compliance@`, `subscribers@`, `agent@`, `supportmgr@`, `finance@`, `vendormgr@`, `analyst@`,
`auditor@` and `vendor@rcms.test`, all with the password printed by the script. Never run it
against a shared or production database.

First administrator in a real deployment: the person signs up and verifies their email, then
`npm run admin:bootstrap -- their@email` (refuses once a Super Administrator exists). There is
no web route that creates an administrator.

### Scripts

| Script | Does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Unit and integration tests (needs a test PostgreSQL, see `docs/TEST_PLAN.md`) |
| `npm run test:e2e` | Playwright journeys against a running, seeded dev server |
| `npm run db:dev` / `db:dev:fresh` | Local Postgres via PGlite |
| `npm run db:migrate` / `db:deploy` | Apply migrations (development / production) |
| `npm run db:seed` | Idempotent seed |
| `npm run db:backfill` | Create first releases for courses that have none |
| `npm run admin:bootstrap -- <email>` | First Super Administrator |
| `npm run dev:accounts` | Synthetic role accounts, local only |
| `npm run db:reset` | Drop, re-migrate, re-seed. Destructive |
| `npm run audit:ownership` | Fails if GSAP and Motion touch the same element |

### Surfaces

| Path | Who |
|---|---|
| `/`, `/catalog`, `/certificates/<serial>` | Public |
| `/academy`, `/library`, `/certificates`, `/support`, `/account`, `/team` | Learners (and corporate managers) |
| `/admin` | Staff; navigation and every action follow their roles |
| `/vendor` | Vendor contacts; their own records only |

---

## Architecture decisions

**Money is stored in paise.** Every monetary column is an integer in minor units. Rupees exist
only at the presentation layer.

**Authorisation lives in the services.** Every function in `lib/services/**` that changes data
takes an `Actor` and calls `assertCan(actor, permission)`; pages use `requirePagePermission`.
Twelve staff roles and 64 permissions are defined in `lib/permissions.ts`. Sensitive changes
(roles, prices, payout details, large exports, settings, progress resets, permanent deletion)
go through maker-checker approval. Hiding a link is presentation, not security.

**Learners only see released content.** Staff edit drafts; publishing stores an immutable
snapshot (`CourseVersion`) after academic and compliance review by different people. Attempts,
progress and certificates record the version.

**Audit is append-only.** `audit()` writes one row per sensitive action and per refusal, with
secrets redacted; a database trigger refuses updates and deletes. A failed audit write never
rolls back a business operation.

**A browser redirect never marks an order paid.** One `fulfil()` path runs after a verified
checkout signature plus a server-side fetch, or a verified webhook.

**Prisma 7 connects through a driver adapter.** The URL lives in `prisma.config.ts` for Migrate
and reaches the runtime client via `PrismaPg` in `lib/db.ts`.

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
  (site)/            marketing site and public catalogue
  (auth)/            sign-in, sign-up, verification, reset, two-step verification, invitations
  (portal)/          learner portal: academy, library, certificates, labs, support, account, team
  admin/             Admin Control Center
  vendor/            vendor portal
  api/               auth, files, exports, payment webhook, cron
components/          site, hero, admin kit, cms editor, portal, support, ui primitives
lib/
  services/          business rules: cms, learning, commerce, support, vendors, people, reports
  actions/           server actions (thin wrappers over services)
  assessment/ cms/ payments/
  actor.ts permissions.ts auth.ts audit.ts storage.ts settings.ts
prisma/              schema (79 tables), migrations, seed
tests/               unit, integration, e2e
docs/                audit, matrix, architecture, security, tests, plan, operations
```

---

## Known state

See `docs/FEATURE_MATRIX.md` for the full picture and `docs/IMPLEMENTATION_PLAN.md` for what
remains. In short: the learner loop, CMS with review and releases, assessments, certificates,
subscriber and corporate administration, support, vendors, dashboards and audit are built and
tested. Payments and email are implemented but **have not been run against Razorpay or Resend**;
do that in test mode before going live (`docs/TEST_PLAN.md` §5).

Placeholders that need real values before launch: the WhatsApp number in
`components/site/SiteFooter.tsx` and `app/(site)/mentoring`, founder credentials on the about
page, the business/GST fields in `.env.example`, and the marketing site's five-step ladder,
which predates the three learning levels.
