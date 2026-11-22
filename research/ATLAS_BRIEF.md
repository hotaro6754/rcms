# RCMExcel — "The Revenue Cycle Atlas" (locked design brief)

Date: 2026-11-21. This replaces the dark-aurora, "Ledger" and "Signal" directions, which the owner rejected as misrepresenting the business. Method: ZeroSlop (COLD-READ → SCOUT → DESIGN-SCOUT → UI-AGENT → DESIGN-GATE). Earlier research lives in `RCMEXCEL_VISUAL_REFERENCE_LIBRARY.md`.

## 0. Cold read (verified)

- **Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma + MariaDB, Better Auth. CSS modules plus Tailwind. `gsap` 3.15 (SplitText, ScrollTrigger, MotionPath, DrawSVG included) and `motion` 13 are already installed, so no new dependencies are needed.
- **Theme:** `lib/theme.ts` sets `html.dark` / `data-theme` before paint (no flash). This homepage uses those.
- **Business (from rcmexcel.com and the repo):** RCMExcel is an education academy for US healthcare revenue cycle and operations management. It is written by V K Chakradhar Gangaraju (21 years in US RCM operations). Courses are self-paced video lessons with slide decks, readings and an assessment after every module, plus a final assessment and certificate per level. Courses are priced in INR (₹2,999–₹19,999), with all-access subscriptions and tracks. Live mentoring runs one to one (₹999–₹4,500). Corporate and cohort training is for teams of ten or more. All claims, consoles and review figures are illustrative teaching data.
- **Not true, so never claimed:** placements, accreditation, partner logos, student counts, testimonials or ratings.
- **Needs owner confirmation:** whether mentoring is live now (the live site sells it; this branch had treated it as a future feature). The level count: the live site says 3 and the database has 4. The homepage reads the count from the database.

## 1. Competitor matrix

| Competitor | Positioning | Audience | Strengths | Weaknesses | Opportunity for RCMExcel |
|---|---|---|---|---|---|
| AAPC | Credentialing body: coding, billing and auditing certifications | Coders, billers, students | Recognised credentials, huge catalogue | Promo banners, stock students, cluttered | Not a credential vendor. RCMExcel teaches how the operation runs, beyond the exam |
| HFMA | Professional association for healthcare finance | Finance leaders | Authority, events, guidance | A news portal, dense, no learning journey | Show a clear path from first claim to governance |
| NAHAM | Patient-access association | Front-end staff | Patient-access specialism | Dated circles and stock photos | Cover the whole cycle, not one stage |
| Generic billing and RCM training sites | "Learn medical billing fast" | Job seekers | Low price | Placement claims, stock photos, no depth | Operator credibility and practice cases with real-shaped data |

## 2. References and what each one teaches

- **Silna Health and Thalamus GME (healthcare):** warm serif display with a clean sans on light surfaces reads as calm and trustworthy.
- **Meter:** calm product illustration on a soft grey canvas, with no gradients needed.
- **Miter and Chronicle:** a mono eyebrow with a live number, and product UI framed as evidence.
- **DeepJudge and making.today:** serif display at a large size and low contrast, with editorial restraint.
- **Cosmos 295220900:** flat medical infographic cards with simple shape-built figures, used as the illustration grammar.
- **Cosmos 1186262363 and 1224180952:** clean chart widgets, used for the operating review.
- **Cosmos 551842242 and 389701869:** data art (ring, ridge, radial), used for the cycle diagram.
- **Cosmos 958199828:** a geometric glyph set, used as the stage icon family.
- **Cosmos 789179594:** blue geometric brand shapes. Taken: restraint and geometry. Not taken: saturated blue fields.
- **Cosmos 215210542:** split sign-in, saved for the sign-in rebuild.
- **Dropped:** 1581858632 (3D glossy blobs, which the brief bans), 1338396187 (painterly Nike art, wrong register), 569096751 (GSAP flair gradients; its geometry is kept, its neon gradients dropped), and 2017768639 (a dark dashboard; light-first wins, its chart types are kept).

## 3. Hero options (scored 1–5)

| Option | Trust | Originality | Clarity | Differentiation | A11y | Desktop | Mobile | Perf | Total |
|---|---|---|---|---|---|---|---|---|---|
| A. Full-width interactive journey (the hero is the diagram) | 4 | 5 | 3 | 5 | 3 | 5 | 2 | 3 | 30 |
| **B. Editorial split: serif headline + illustrated Atlas map** | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 4 | **37** |
| C. Full-width layered illustration under the headline | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 31 |

**Chosen: B.** The headline is readable on first paint. On the right sits an illustrated map of the actors (patient, front desk, clinician, coder, clearinghouse, payer, billing office) along the ten stages, numbered and annotated. It draws in once, then claim #20481 travels the route.

## 4. Locked tokens

| Token | Light | Dark |
|---|---|---|
| `--bg` | #F6F8FA | #0E1621 |
| `--surface` | #FFFFFF | #152131 |
| `--surface-2` | #EEF2F5 | #1B2A3D |
| `--line` | #DCE3EA | #26374B |
| `--ink` (headings) | #142338 | #EEF3F8 |
| `--text` | #20364B | #CBD6E2 |
| `--muted` | #64758A | #8FA0B4 |
| `--teal` (accent, links, focus) | #3E827C | #6FB5AC |
| `--warm` (illustration accent) | #C58D62 | #D9A27A |
| illustration fills | sage #D7E8E1 · sky #DCE8F5 · sand #F1E4D3 · blush #F4DDD3 | darker equivalents |
| status | ok #2F7D5B · risk #A86A12 · breach #B4433C (with icon and word) | lifted equivalents |

The primary button is solid ink with white text, and teal on hover. The secondary button is an outline.

## 5. Type

- **Display:** Newsreader, upright, 400–500 weight, already loaded through `next/font`, used for headlines.
- **Body:** Geist.
- **Annotations:** IBM Plex Mono, uppercase, 11–12px.
- No Inter and no italic display.
- **Scale:** hero clamp(2.8rem, 5.4vw, 5.6rem)/1.02 · h2 clamp(2.1rem, 3.8vw, 3.6rem) · h3 1.5–2rem · body 17px/1.6 · caption 14px · label 11.5px mono.

## 6. Illustration system ("Atlas")

- Flat front-view geometry with a single 1.5px ink stroke and soft fills (sage, sky, sand, blush), plus one warm accent.
- People are built from shapes, without faces.
- Buildings are simple elevations.
- Documents are recognisable: CMS-1500, 835 and EOB.
- Routes are dashed lines with arrowheads.
- Annotations are mono labels with leader lines.
- Everything is original SVG in `components/atlas/` with no external assets, and dark mode swaps tokens.
- **Signature element:** the Atlas route. The ten numbered stages on one path recur in the hero, the cycle section (scroll-driven) and the level map.

## 7. Motion profile

- **GSAP:**
  - Hero: SplitText line rise (0.9s, expo.out).
  - The route draws with DrawSVG (1.4s).
  - Stage nodes activate in sequence.
  - Claim #20481 travels the route with MotionPath, looping gently.
  - The cycle section uses ScrollTrigger to make the stage matching the reader's scroll active, without hijacking: the page scrolls normally and only a sticky diagram updates.
  - Chart bars and lines draw on enter.
- **Motion:** tabs, accordions, segmented controls and card hovers.
- Reduced motion shows final states with no movement.

## 8. Page architecture

- **Home:** hero, cycle, learning paths, how a course works, practice, career, author and mentoring, teams, FAQ, close.
- **Internal pages** take the same nav, footer and tokens: learning paths, catalog, pricing, about, contact, resources, blog and legal.
