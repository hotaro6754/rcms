# Animation ownership

Two animation systems run in this app. They never touch the same property on the same element.

## The rule

> Any element inside `[data-gsap-scope]` is **GSAP-owned** and must never receive Motion
> animation props (`animate`, `initial`, `whileHover`, `whileTap`, `layout`, `exit`).
> Motion components never receive GSAP tweens.

Never let both systems animate `transform`, `opacity`, `x`, `y`, `scale`, `width`, `height`
or `layout` on one element.

## Who owns what

| Concern | Owner |
|---|---|
| Hero headline reveal (lines rise, accent words fill) | GSAP (SplitText) |
| Scroll choreography, KPI chart draw-in | GSAP (ScrollTrigger) |
| Tabs, accordion, agenda indicator | Motion |
| Command palette, modal, sheet, dropdown, tooltip | Motion |
| Table row expansion, status transitions, presence/exit | Motion |
| Button press, nav state | Motion |
| Hover colour, focus ring, static transitions | CSS |
| Preloader sequence (wordmark, rule, terms, curtain) | GSAP |
| Nav ink swap, leadership ledger hover (row inverts, metric line draws) | CSS |
| Leadership: statement's second sentence inks in word by word (scrubbed); ledger rule, rows, resting trend lines and NOW values enter once | GSAP (SplitText, ScrollTrigger, DrawSVG) |
| Page-wide `[data-reveal]` entrances (play once, never reverse) | GSAP (ScrollTrigger) |
| Opening statement: pin, progress rule, headline line reveal | GSAP (ScrollTrigger, SplitText) |
| Opening statement: the line swap (lead-in, noun, fact) | Motion (`ProblemLine`, its own file) |
| Revenue-cycle section: pin (no snap) and the route's fill, scrubbed | GSAP (ScrollTrigger); markers and the spread crossfade are CSS |
| Learning path: index line (scrubbed), active level, spread entrances | GSAP (ScrollTrigger); index colours are CSS. No pin |
| Review page on the homepage (`ReviewPack`) | no animation library: React state picks the line, CSS owns the transitions |
| Operations Lab verdicts and five whys | Motion |
| Hero claim document (`ClaimDocument`): fields typing, stamps, margin notes, stage readout | GSAP timeline, plays once, replayable |
| Remittance slip (`RemittanceSlip`) | static; page-wide reveal only |
| Advisory calendar (`AdvisoryWeek`) | `useStepper` (timer, on-screen only); CSS owns transitions |
| Footer wordmark: letters rise with the scroll | GSAP (SplitText, scrubbed) |
| Reporting Lottie beside the review heading | lottie-web (plays on screen only; still frame under reduced motion) |

Pins used on the homepage: the opening statement and the revenue-cycle section. Neither
snaps. Both are desktop-only and off under reduced motion; below `lg` the opening statement
stacks its six lines and the cycle falls back to previous and next controls. The review is not pinned: the homepage shows one page of it, in normal flow.

## Scope markers

- `data-gsap-scope` — the root of a GSAP-controlled subtree. Currently: `HeroSequence`,
  `Preloader`, `OpeningStatement` (headline and progress rule only), `ClaimDocument`,
  `KpiReview`'s chart grid, `Leadership`, `FooterWordmark`.

## ScrollSmoother

Not used. Native scroll stays intact for accessibility, touch behaviour and
`prefers-reduced-motion`. ScrollTrigger is used without hijacking the scroll container.

## Audit

Run before shipping:

```bash
npm run audit:ownership
```

It fails if any element carrying a Motion animation prop sits inside a `[data-gsap-scope]`
subtree, or if a `motion.*` component appears in a file that also imports from `lib/gsap`.

Last result: **0 conflicts.**
