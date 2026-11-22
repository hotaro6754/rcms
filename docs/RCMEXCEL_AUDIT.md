# RCMExcel — Codebase and experience audit

Scope: local working tree on `redesign/product-skin` (uncommitted), local dev server in live mode.
Findings are tracked by ID in `RCMEXCEL_FINDINGS_REGISTER.md`.

## 1. Architecture

| Area | What exists |
| ---- | ----------- |
| Framework | Next.js 15.5 App Router, React 19.1, TypeScript |
| Styling | Tailwind 4 + CSS modules. Three skins coexist: Atlas (`components/atlas/*.module.css`) for the homepage and public chrome, `rcx` for auth, portal and admin, and the older `site-scope` tokens in `app/globals.css` for inner public pages |
| Fonts | `next/font`: Newsreader (display), Geist (body), IBM Plex Mono (labels), Instrument Serif; Satoshi and Cabinet Grotesk self-hosted |
| Motion | GSAP 3.15 (SplitText, ScrollTrigger, DrawSVG, MotionPath), Motion 13; no WebGL |
| Data | Prisma 7 + MariaDB (driver adapter), Better Auth; site copy is editable through `getPageContent(...)` with defaults in `lib/site/pages/*` |
| Theme | Light only (`lib/theme.ts` pins light; dark tokens kept in CSS for later) |
| Launch gate | `lib/launch.ts` + middleware rewrite to `/coming-soon` unless `SITE_MODE=live` |

## 2. Route inventory (public and auth)

| Route | Purpose | State |
| ----- | ------- | ----- |
| `/` | Homepage (Atlas: hero, cycle ring, paths, how a course works, practice, career, author, teams, FAQ, notes) | Rebuilt this redesign |
| `/v2` | Compact one-screen hero variant, `noindex` | New, design comparison only |
| `/learning-paths`, `/catalog`, `/catalog/[slug]`, `/courses` (308 → catalog) | Levels and courses from the published catalogue | Atlas chrome, older inner layout |
| `/pricing` | Plans, courses, tracks, corporate | Atlas chrome, older inner layout; mentoring block hidden by default |
| `/about`, `/contact`, `/resources/*`, `/blog`, `/p/[slug]` | Content pages | Atlas chrome, older inner layout |
| `/legal/[policy]` | Policies from `lib/legal/policies.ts` | Works; drafts flagged "pending legal review" |
| `/certificates/[serial]` | Public certificate verification | Not reviewed this pass |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/two-factor`, `/verify`, `/invite/[token]` | Auth, shared layout | Layout rebuilt: learner illustration, course-step chips, brand mark |
| `/coming-soon` | What the public sees until launch | Untouched |
| Portal (`/academy`, `/account`, `/library`, `/support`, `/team`, `/checkout/[sku]`, ...) and `/admin/*` (~40) | Learner and staff areas | Not redesigned this pass |

## 3. Content model findings

- **Stages (F009).** The canonical model is ten stages (`lib/data/system.ts`) in three phases: front end (registration, eligibility, authorization), middle (charge capture, coding, claim submission) and back end (remittance, payment posting, A/R follow-up, denials and recovery). The thirteen-step `ClaimDocument` is the event history of one denied claim moving through those ten stages (it adds service, denial, root cause, correction, resubmission, payment and reconciliation). The two models are consistent at different granularity; only the ten-stage model is rendered today.
- **Levels (F010).** The published catalogue has four levels: Beginner (RCM Foundation), Professional (Process Excellence), Leader (Operational Management) and Executive Leadership. `lib/data/catalog.ts` still carries a five-step blueprint (`LEVELS`) used by seeds and by `SYSTEM.level`. Public copy now consistently says four; reconciling the blueprint with the catalogue is an owner decision.
- **Mentoring (F025).** A published policy states there is no one-to-one mentoring; several surfaces sold or promised it. They are now hidden or corrected.
- **Certificates (F011).** Issued per course (with a serial and a public verification page), plus a level badge when every course in a level is complete. Policy text correctly says they are not accredited.

## 4. Strengths to keep

The ten-stage ring with "how it breaks / the number to watch / taught in"; the CO-50 case and five whys; the month-end review with icon-plus-word status; careful legal and disclaimer copy; editable site content; reduced-motion handling throughout.

## 5. Weaknesses (prioritised)

- P0: mentoring contradiction (fixed, pending owner confirmation).
- P1: illustration direction diverges from the owner's Cosmos board (people scenes vs information design) — F015.
- P1: inner public pages still use the older layout system, so the site reads as two designs below the homepage — F018.
- P1: several homepage sections share the same "heading + picture plate" composition — F017.
- P2: no shared "sample data" marker component; labels are written per section — F012.
- P2: dead components remain (`components/hero/HeroSequence.tsx`, `components/illustration/ClaimDocument.tsx`, `components/site/SiteNav*.tsx`, `components/site/SiteFooter.tsx`). Left in place; delete only with the owner's agreement.
- Environment: two dev servers share `.next` (ports 3000 and 3001), causing intermittent dev-only errors.
