# 01 — Existing site audit (before the redesign)

Audited 2026-11-01 on branch `redesign/professional-presentation`, cut from `origin/main` at `f91d55c` (PR #8 merged). Working tree was clean before changes. Live site inspected at https://rcmexcel.com/ in a 1440×900 desktop and 390×844 phone viewport; before screenshots are in `screenshots/before/`.

## Architecture

| Area | What exists |
|---|---|
| Framework | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn token contract |
| Package manager | npm (`package-lock.json`) |
| Data | Prisma 7 + MariaDB. Levels, courses and prices come from the database; homepage copy comes from the website editor (CMS) |
| CMS | `lib/site/fields.ts` + `lib/site/pages/*.ts`. Every public page's copy is a typed schema with defaults; stored edits are merged over the defaults (`resolvePage`), so new fields get their defaults on existing sites |
| Public routes | `/` (app/page.tsx) and `app/(site)/*`: about, blog, catalog, catalog/[slug], community, contact, courses, learning-paths, legal/*, mentoring, p/[slug], pricing, resources, resources/[section], resources/[section]/[slug], resources/tests |
| Practice console (public footer links) | `app/(product)`: overview, governance, queues, metrics, roster, activity, policy-updates. Worked example on a fictional practice |
| Layouts | `app/layout.tsx` (fonts, intro boot script), `app/(site)/layout.tsx` (SiteScope → SiteNav, main.editorial, SiteFooter, ThemeStyle, PageStyles) |
| Fonts | Satoshi + Cabinet Grotesk self-hosted (`public/fonts`, ITF Free Font License); Newsreader (serif headlines on the public site), IBM Plex Mono and Geist via `next/font` |
| Icons | lucide-react |
| Images | `next/image`; brand PNGs in `public/brand`; one Lottie file (`public/lottie/reporting.json`); no photography on the homepage |
| Breakpoints | Tailwind defaults (sm 640, md 768, lg 1024, xl 1280); container 1320px |

## Visual system (before)

- Warm "desk" off-white `#f3f2ee`, warm ink `#161513` for type **and** buttons, eucalyptus `#3f6e5e` accent, level colours teal / blue / navy.
- Headlines in Newsreader serif at book weight with italic emphasis; labels in IBM Plex Mono uppercase with wide tracking; corners ~3px.
- Surfaces changed per "chapter": white sheet, charcoal desk (Lab, Mentoring), ink band (Opening statement, footer), paper documents with film-grain overlays and slight rotations.
- The brand logo is navy `#0b1a4f` and teal `#0a9a94`, but neither colour was used in the site palette — the site and its logo did not match.

## Motion (before)

All GSAP plugins are registered once in `lib/gsap/register.ts` (ScrollTrigger, SplitText, DrawSVG, Flip, CustomEase, MotionPath, Observer); custom eases `exec` / `signal` in `lib/gsap/eases.ts`. Every consumer uses `useGSAP` + `gsap.matchMedia()` with a `prefers-reduced-motion` branch and reverts on unmount — the lifecycle hygiene is good.

| Component | Motion | Assessment |
|---|---|---|
| `Preloader` | Full-screen curtain on first homepage visit, ~1.4s, locks scroll | Content waits for an animation — removed |
| `HeroSequence` | SplitText masked line rise, gradient text fill, waits for preloader | Kept as a short rise, no waiting, never hides copy |
| `ClaimDocument` | 13-stage timeline filling the claim, replay control | Kept unchanged (signature walkthrough) |
| `OpeningStatement` | **Pinned** for (N+1)×55vh, scroll-driven line swap + scrubbed progress bar | Scroll-jacking; content only visible by scrolling — replaced with a static grid |
| `SystemFlow` | **Pinned** + scrubbed rail; stages change with scroll position | Scroll-jacking — replaced with a click/keyboard explorer, GSAP kept for the progress line and panel crossfade |
| `LearningPath` | Scrubbed index line, sticky index, per-spread entrance | Replaced by three cards with a stagger entrance |
| `Leadership` | Scrubbed word-by-word opacity, row stagger, DrawSVG trend lines, count-up | Scrub removed; stagger/draw/count-up kept |
| `FooterWordmark` | Giant scroll-scrubbed letters | Agency-style decoration — removed |
| `SiteNavClient` | Hide on scroll down (Motion), colour swap over ink bands | Replaced: always-visible bar with mega menus |
| `PageReveals` | `[data-reveal]` fade-up once | Kept, shortened, plus a `[data-reveal-group]` stagger |

## Functional audit

Working: all nav and footer links resolve to existing routes; CTAs (`/learning-paths`, `/mentoring`, `/pricing`, `/catalog?level=…`, `/mentoring#<id>`); Floor Notes sign-up (`subscribeNotes` server action); Lab interaction; review ledger; mentoring list with live prices; reduced-motion fallbacks.

Issues found:
- **Navigation**: five flat links (`Catalogue, Learning paths, Why RCMExcel, Resources, About`) — mentoring, pricing (except the button), practice tests, the practice console and the homepage's own sections were not reachable from the top bar.
- **Scroll-jacking**: two pinned sections (≈7 screens of scrolling) on desktop; the ten stages could only be read by scrolling through the pin.
- **Readability**: very large display type (up to 6.2rem), mono 10.5–11px labels, low information density per screen.
- **Hidden behind JS**: hero copy was set to `autoAlpha: 0` until fonts + preloader resolved.
- **Copy describing old interactions**: "Scroll through them in order" (cycle), "© 2026. Set in Newsreader and Satoshi." (colophon).
- Section anchors for "Career progression" and "Floor Notes" did not exist.

## Strengths kept

Accurate, specific teaching content; a single coherent case (Claim #20481 → CO-50 denial → monthly review) running through the page; disciplined GSAP lifecycle; CMS-driven copy with typed defaults; live DB-backed prices; good accessibility basics (focus rings, aria-live, reduced motion).

## Risks

- Theme values published in the website editor override the CSS defaults. If the live site's Theme page was ever published with the old colours, those old values will keep overriding the new palette until the Theme is reset in the editor (see 05 report).
- Same for any published homepage/footer copy: published text wins over the new defaults.
