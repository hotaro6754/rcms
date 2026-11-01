# 04 — Redesign specification

Direction: **professional healthcare-business presentation + structured information architecture + modern visual design + purposeful GSAP**. Scope: the public site (everything inside `.site-scope`). Admin, portal and the practice console keep their existing token contract.

## Brand presentation

The site now uses the logo's own colours. The logo is navy (`#0b1a4f`) and teal (`#0a9a94`); the old site palette (warm ink + eucalyptus) matched neither. Name, logo, domain and positioning are unchanged.

## Colour tokens (`app/globals.css`, `.site-scope`)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--background` / `--card` | `#ffffff` | Page, cards | — |
| `--surface-tint` (`.env-tint`) | `#f5f7fa` | Alternate sections, page headers | — |
| `--foreground` | `#0e1a33` | Text | 17.3:1 |
| `--muted-foreground` | `#475467` | Secondary text | 7.7:1 |
| `--subtle` | `#5d6b82` | Labels, captions | 5.4:1 (5.0:1 on tint) |
| `--primary` | `#13235b` | Buttons, selected states | white on it 14.8:1 |
| `--brand` | `#0b7470` | Links, eyebrows, emphasis | 5.6:1 (5.2:1 on tint) |
| `--signal` | `#10a39b` | Marks only | — |
| `--border` / `--input` | `#e2e7ef` / `#c6cfdc` | Hairlines, field borders | — |
| Level colours | teal `#2f7d74`, blue `#2f5d9a`, navy `#1f2f4f` | Level cards | AA as text |
| Navy band (`.env-ink`) | bg `#0e1a33`, text `#f3f6fb`, muted `#bcc6d8` (10.0:1), subtle `#97a3ba` (6.8:1), accent `#6fd3c9` (9.8:1) | Footer | |

`lib/site/pages/theme.ts` defaults equal these values, so the Theme editor writes nothing unless someone changes a colour. `ThemeStyle` now targets `:root, .site-scope` so editor values still win.

## Typography

- One family: **Satoshi** (already self-hosted) for headings and body. Headings 700, tracking −0.028em, balanced wrap; no italic emphasis — emphasised words take the teal accent.
- Scale: H1 `clamp(2.4rem, 5vw, 4rem)`; section H2 `clamp(1.9rem, 3.2vw, 2.75rem)`; card titles 18–30px; body 15–17px; labels 12px.
- `.eyebrow`: 12px, 700, uppercase, 0.08em, teal — replaces the mono 10.5px labels on the homepage. IBM Plex Mono is kept only where it was used for data in untouched components.
- Newsreader is no longer used on the public site (still loaded for certificates and admin).

## Layout system

- Container 1280px, gutters 16px (phone) / 24px.
- Sections: `Chapter` — top hairline, 80–96px vertical padding, numbered eyebrow ("02 — The cycle"), surface white / tint / navy.
- Section heading row: heading left, introduction right (`SectionIntro`) on ≥1024px; stacked below.
- Radius 0.6rem (editor "Soft"); cards `calc(radius × 1.4)`.

## Navigation architecture

Derived from real routes and sections only (`site.ts → nav.menus`, editable):

| Menu | Intro + main link | Items (column → item → description) |
|---|---|---|
| Learning | Compare the levels → `/learning-paths` | Learning levels: Trainee — Foundation, Professional — Execution, Leadership — Governance (`/catalog?level=…`) · Programs: Course catalogue, Learning paths, Practice tests |
| Practice | How the claim is taught → `/#system` | On this site: Claim #20481 walkthrough, The ten revenue-cycle stages, Denial investigation, Monthly operating review, Career progression · Operations console: Operations console, Governance Room, Denial inventory, KPI library, Capacity and roster |
| Mentoring | All mentoring sessions → `/mentoring` | Career consultation, Professional guidance, Leadership mentoring, Executive career roadmap (`/mentoring#id`) |
| Resources | All resources → `/resources` | Resources library, Practice tests, Writing, Floor Notes (`/#floor-notes`), Community |
| About | About the author → `/about` | About the author, Contact, Content governance, Disclaimer |
| Pricing | plain link → `/pricing` | — |

Desktop: full-width panel under the bar (Guidewire layout), intro column + labelled columns of title + one-line description (Relias pattern). Opens on click, on hover after 120ms, and with ↓ from the button (focus moves into the panel); Escape or outside click closes and returns focus. Active menu gets a teal underline. Phones/tablets: full-height sheet, each menu an accordion section, account + CTA pinned at the bottom, body scroll locked, Escape closes. The bar never hides on scroll.

## Page hierarchy (homepage)

Hero → At a glance → 01 Problem → 02 Cycle → 03 Path → 04 Investigation → 05 Review → 06 People → 07 Mentoring → 08 Author → Footer (closing CTA, Floor Notes, index, colophon). The order follows the existing case narrative (claim → system → levels → denial → review → people → advice → author) — research supported keeping the narrative and adding orientation (At a glance + Practice menu) rather than reordering.

## Card system

`.site-card`: white, 1px border, soft navy shadow (`--shadow-card`). With `data-interactive`: hover/focus-within lifts 4px, shadow deepens, border tints 40% toward teal; 200ms `--ease-exec`; disabled under `hover: none`. Used for: problem facts, stage panel, level cards, lab figures/findings, review page, ledger, mentoring sessions, author profile, at-a-glance counts. Not everything is a card: tables (all stages, review ledger, career ladder), editorial text, photos and figures are used where they fit better.

## Interaction and motion principles

| Element | Motion | Engine |
|---|---|---|
| Hero | 12px rise, 0.55s, staggered; copy never hidden | GSAP |
| Section headings / leads | 14px fade-up once at 90% | GSAP ScrollTrigger (`PageReveals`) |
| Card groups | 16px fade-up, 60ms stagger, once, `clearProps` so CSS hover keeps working | GSAP ScrollTrigger (`[data-reveal-group]`) |
| Menu panel | 6px drop, items 4px stagger; panel never transparent | GSAP |
| Stage explorer | progress line `scaleX`, panel 8px crossfade | GSAP |
| Claim #20481 | existing 13-stage timeline | GSAP (unchanged) |
| Career ladder | rows rise, trend lines draw, values count up from the real value | GSAP (scrub removed) |
| Lab finding / five whys | existing reveal | Motion |
| Cards | hover lift | CSS |

Rules: no pinning, no scrubbing, no scroll-jacking; every animation is once and under 0.6s; all GSAP lives in `useGSAP` + `matchMedia` with a reduced-motion branch and is reverted on unmount; nothing essential exists only in an animated state.

## Visual assets

- Photography (Unsplash License, verified): analyst at laptop (problem), training session (path), review meeting (review), one-to-one at laptop (mentoring). See `IMAGE_ASSET_REGISTER.md`.
- Figma: two diagrams built in Figma from the source data (learning levels ↔ stages; denial → five whys → root cause → control) and two Figma-generated illustrations (claim / remittance / report documents; six-step career climb).
- Mix on the homepage: mostly typography, tables and components; four photos; four Figma assets.

## Responsive behaviour

Tested at 1440×900, 768 (via breakpoints), 390×844 and 375×812. Grids collapse to one column below 640/1024px; the stage selector becomes phase-grouped chips; wide figures and tables scroll horizontally inside their box (no page overflow, measured 0px).
