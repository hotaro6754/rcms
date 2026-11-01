# 03 — Content preservation map

The per-section inventory is in `RCMEXCEL_CONTENT_INVENTORY.md`. This file records **every wording change** and **every place where content moved**, so nothing is lost silently.

## Wording changes (defaults in code)

Published edits in the website editor still win over these defaults. If the live site has published copy for these fields, the published text stays until it is edited.

| Where | Before | After | Why |
|---|---|---|---|
| Homepage → 02 The cycle → Introduction | "Scroll through them in order: what each stage does…" | "Go through them in order: what each stage does…" | The stages are no longer driven by scrolling; the rest of the sentence is unchanged |
| Footer → Colophon → Line | "© 2026. Set in Newsreader and Satoshi." | "© 2026. Set in Satoshi." | Newsreader is no longer used on the public site; the line would be false |
| Theme → Fonts / Corners (editor labels) | "Cabinet Grotesk (current)", "Nearly square (current)" | "Satoshi (current)", "Soft (current)" | Labels describe the new defaults |

## New copy (navigational only, no new claims)

| Where | Text | Source |
|---|---|---|
| Hero label | "US healthcare revenue cycle · Training and mentoring" | Condensed from the hero lead ("Training and mentoring in US healthcare revenue cycle operations") |
| At a glance | "revenue-cycle stages, front end to back end", "learning levels, each built on the one before", "levels of career progression", "one-to-one mentoring sessions"; caption "One case, followed from the claim to the remittance to the month-end report." | Counts are computed from the content; phrases reuse existing section copy |
| Cycle figure | "Where each stage is taught" (the image itself carries "Each level is built on the one before.") | "Where you learn it" label and the path section's count line |
| Menus | Menu intros and one-line item descriptions (e.g. "Every released course and its price", "30 minutes, one-to-one") | Existing section leads, session lengths, page purposes. Every item links to an existing page or homepage section |
| Lab | "The whole investigation at a glance"; "Evidence:" prefix | UI labels |
| Cycle | "All 10 stages in one table", "Previous", "Next stage" | UI labels |

All new copy is editable in the website editor (`home.ts` → "At a glance", hero label, figure texts; `site.ts` → "Menus").

## Content that moved or changed form

| Content | Before | After | Still fully available? |
|---|---|---|---|
| Six "RCM isn't one process" lines | One at a time in a pinned sequence (desktop) | All six visible as cards | Yes, more so |
| Ten stages' details | One at a time, by scroll position | One at a time by choice **and** all at once in the table | Yes, more so |
| Level core topics | All shown on desktop; first 4 on phones | First 5 shown, rest in "and N more topics" disclosure on every screen | Yes (one click) |
| Denial investigation summary | Only through the interaction | Interaction + diagram in a disclosure | Yes |
| Hero scroll prompt "FOLLOW THE CLAIM" | Bottom-left link to #problem | Not displayed (editor field kept, unchanged) | The next section is directly below; Practice menu links the walkthrough |
| Preloader words | Curtain on first visit | Removed | Decorative only |
| Monthly review illustration | Lottie "reporting" animation | Photograph of a review meeting | Decorative only; `LottieView` and `public/lottie/reporting.json` left in the repo |
| Footer wordmark | Giant scroll-scrubbed letters | Logo lockup in the colophon | Same editor toggle |
| Claim stamps "DENIED · CO-50 · RARC N706" and "PAID · $986.40 · 835" | Rubber-stamp graphics over the claim | Status badges with the same text in the claim's footer | Yes — same words |
| Remittance stamp "UNDER REVIEW · OPS LAB · RCA OPEN" | Rubber-stamp graphic | Badge "Under review · RCA open" in the remittance footer | Yes ("Ops Lab" label dropped; the section heading already names it) |
| Course page "← Catalogue" link | Text link above the title | Breadcrumb "Home › Catalogue › course" (same editor text and link) | Yes |

## Explicitly unchanged

Course names, level names and titles, curriculum topics, prices (all from the database), mentoring session names/lengths/prices, author name, years, focus, paragraphs and experience, the Claim #20481 data, the CO-50 investigation, five whys and conclusion, the review measures and decisions, the career ladder, the disclaimer, legal pages, policies, CTAs and their destinations. No services, partnerships, accreditations, testimonials, metrics or case studies were added.
