# RCMExcel — Art direction: "The Ledger"

**Status:** working direction, chosen 2026-11-20 from the owner's picks (OCI, Lumena, Function Health, Implement) and the Awwwards research in `RCMEXCEL_VISUAL_REFERENCE_LIBRARY.md`. Not final: the owner asked to keep pushing past the references.

## 1. The idea

RCM is paperwork that turns into money: claim forms, remittances, aging buckets and month-end packs. "The Ledger" designs the academy the way those documents are designed, but at the level of an award-winning institution. That means:

- one saturated ink on warm paper;
- numbered boxes and hairline rules, as on a CMS-1500;
- mono codes for anything that is data;
- a confident grotesk for anything a person would say out loud.

It borrows the **system** from OCI and Lumena (ink on paper, mono labels, hairline columns, halftone photography). It borrows the **calm data** from Function Health and the **institutional proof** from Institute of Health and Tresmares. Then it adds what none of them can have: motifs that only exist in revenue cycle work.

### Going beyond the references (the RCM-native motifs)

| Motif | Borrowed pattern | RCMExcel twist |
|---|---|---|
| **Section box codes** | OCI's `[OCI.2]` | Section codes are claim-form box numbers: `[BOX 01] The problem`, `[BOX 24J] The cycle`. |
| **Aging staircase** | OCI's stepped blue blocks | The steps are the A/R aging buckets: 0–30, 31–60, 61–90, 90+. They are reused as the career ladder L1–L6, rising instead of falling. |
| **Claim slips** | OCI's tilted process cards | The ten stages are torn claim slips on a vertical rule. Each has a box number, a stage, how it breaks and the KPI. |
| **Code field** | Lumena's ">>>" glyph field | A field of CARC/RARC codes (CO-50, CO-97, PR-1, N706…) forms the hero texture. Codes nearest the cursor brighten. |
| **Remit ticker** | Ramp's live counters | A mono strip of teaching metrics: `DENIAL RATE 10.4% ▲ BREACH · A/R>90 14.2% · CLEAN CLAIM 93.1% AT RISK`. |
| **Stat staircase** | Tresmares' red numerals in hairline boxes | 21 years · 10 stages · 3 levels · 6 rungs, boxes stepping down. |
| **Halftone photography** | OCI and R1 duotone dots | Our own four photos dithered into ink-on-paper duotones at build time, so the photography stays real but owned. |

## 2. Principles

1. **Paper first.** The page is a document; colour is ink, used for meaning.
2. **Data is set in mono, speech in grotesk.** Never mix inside a line.
3. **Hairlines, not boxes.** Rules and columns structure the page; cards are rare and flat.
4. **Every number is real or labelled illustrative.** Teaching data carries the label `ILLUSTRATIVE` in mono.
5. **Motion explains state.** Scramble-decoding labels, masked line reveals, staircase fills. Nothing floats, nothing loops forever except the ticker.
6. **Readable at 60 years old.** 17px body minimum on desktop, AA contrast everywhere, keyboard reachable.

## 3. Tokens

### Colour

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#E9E7E1` | Page canvas (warm ledger grey). |
| `--paper-2` | `#F3F1EC` | Raised paper: slips, cards, form fields. |
| `--paper-3` | `#DDDAD2` | Sunken: table stripes, disabled. |
| `--ink` | `#1A2A8C` | **The** saturated colour: headlines on paper, rules, buttons, duotone. Derived from the logo navy and pushed toward OCI's ultramarine. |
| `--ink-deep` | `#101B5E` | Hover and pressed; text on paper-3. |
| `--text` | `#0E1430` | Body text. |
| `--text-2` | `#4A4F66` | Secondary text. |
| `--rule` | `rgb(26 42 140 / 0.28)` | Hairlines. |
| `--paid` | `#0F9F7A` | Paid / on target. From the logo's green; small doses only. |
| `--denied` | `#D2232A` | Denials and breaches; the CMS-1500 dropout red. One red block per page at most. |
| `--amber` | `#C98A2B` | At risk. |

Dark sections invert: `--ink` becomes the background, paper becomes the text.

### Type

- **Display and body: Satoshi** (already self-hosted; the live site is "set in Satoshi"). Display 500 weight, tracking −0.035em, line-height 0.95. Body 400/17px/1.55.
- **Data and labels: IBM Plex Mono**, 500 weight, uppercase, tracking +0.06em, 11–13px.
- No serif and no italic display.
- Scale (desktop / phone): display 9.6rem / 3.4rem · h2 4.4rem / 2.4rem · h3 2rem / 1.5rem · lead 1.35rem · body 1.0625rem · label 0.75rem.

### Space, grid, shape

- 12-column grid, 24px gutters, 16px phone side margin, max width 1440px.
- Section rhythm: 160px desktop, 96px phone.
- Radius: 0 for structure, 2px for inputs and buttons, 999px only for status dots.
- Shadows: none, except a 1px offset shadow on paper slips.

### Motion

- Easing `cubic-bezier(0.2, 0.7, 0, 1)`; 600–900ms reveals.
- Scramble-decode on mono labels and nav (about 400ms).
- Masked line-by-line headline reveals.
- Staircase blocks fill bottom-to-top on scroll.
- Everything collapses to instant under `prefers-reduced-motion`.

## 4. Components

- **Nav:** a paper bar with mono uppercase links in two hairline columns, the logo lockup left, and a solid ink "Explore programs" block right. Scramble-decodes on hover. On phones, a full-screen ink sheet with big grotesk links.
- **Buttons:** solid ink block with a mono uppercase label and ↳; a ghost variant is an ink hairline. A square bullet `■` precedes text-link CTAs.
- **Section head:** `[BOX nn]` code left, name in mono, hairline across, an index right.
- **Accordion rows:** full-width grotesk row, "+" right, hairline between rows; opens a mono detail.
- **Claim slip:** paper-2 card, slight rotation (±1.5°), box number, title, mono body, a rule at the foot.
- **Ledger table:** mono numerals, right-aligned, hairline rows, status as a dot plus a word.
- **Stat staircase:** hairline boxes stepping down; the numeral in ink, the label in mono.
- **Duotone figure:** dithered photo, ink on paper, with a mono caption `FIG. 02 — …`.

## 5. Homepage composition (content from the live site, unchanged)

| Box | Section | Composition |
|---|---|---|
| — | Hero | Giant "From RCM beginner. / To operations leader." left, lead and CTAs lower right (Lumena split), CARC code field texture, IOH-style stat stack. The claim #20481 form on a paper slip below the fold line. |
| — | Ticker | Remit ticker strip. |
| 01 | The problem | Hark-style statement paragraph, then the six facts as OCI accordion rows beside a halftone photo. |
| 24J | The cycle | Ten claim slips on a vertical rule grouped Front end / Middle / Back end; the selected slip expands. |
| 03 | The path | Three levels as columns with hairline lefts (OCI projects): audience, outcomes, courses with ₹ prices, effort. |
| 04 | The investigation | The CO-50 case: 835 excerpt as a ledger table, "Where do you look first?" as a live quiz, then denial → five whys → root cause → control. |
| 05 | The review | Monthly operating review as a report page: target vs actual with status, the breach row in red, decisions with owners and dates. |
| 06 | The people | The aging staircase reused as the career ladder L1–L6. |
| 07 | The advice | Four mentoring sessions as accordion rows with the price right. |
| 08 | The author | Tresmares stat staircase for 21 years, then the four career areas. |
| — | Close | Full-bleed ink band, giant line, CTAs; newsletter; footer with a giant wordmark and every live link. |

## 6. Avoid

Glass, gradients, aurora glows, floating UI cards, 3D, particle networks, neon icons, stock clinicians, italic serif display, lime/orange accents, rounded "bento" cards, fake testimonials or logos, decorative charts with meaningless numbers.

## 7. Open decisions for the owner

1. **Mentoring.** The live site sells four sessions (₹999–₹4,500). Earlier in this branch mentoring was treated as a future feature, and the `/mentoring` route was removed. The homepage shows the sessions as on the live site, with the request going to `/contact` until a decision is made.
2. **Practice routes** (`/overview`, `/governance`, `/queues`, `/metrics`, `/roster`) exist on the live site but not on this branch. The homepage shows the investigation and review in full and does not link to the missing consoles.
3. **"13 stages" versus "10 stages".** On the live site, the claim card counts 13 steps in one claim's journey (including denial and rework), while the curriculum defines 10 revenue-cycle stages. The redesign labels the card's count "13 steps in this claim's journey" so it is not confused with the 10 stages.
