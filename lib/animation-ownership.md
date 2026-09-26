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
| Aurora sky (`AuroraField` canvas) | its own rAF loop; reads `aurora` in `lib/environment.ts` |
| Aurora inputs (`intensity`, `scroll`) | GSAP tweens / ScrollTrigger write the plain object, never the canvas |
| Aurora `level` | React state in `LevelStrip` writes the plain object |
| Level strip highlight, section mesh tint (`data-level`), nav ink swap | CSS |
| Page-wide `[data-reveal]` entrances (play once, never reverse) | GSAP (ScrollTrigger) |
| Opening statement: lines lit by scroll | GSAP (scrubbed opacity) |
| Revenue-cycle section: pin, horizontal card track, dot-to-dot line fill | GSAP (ScrollTrigger); node and card states are CSS |
| Learning path: pin, rail fill; level card swap | GSAP for pin and fill; CSS for the card swap |
| Governance Room on the homepage | no GSAP: normal flow, sticky agenda (CSS), scroll-spy (IntersectionObserver), agenda indicator (Motion) |
| Operations Lab verdicts and five whys | Motion |
| Hero claim document (`ClaimDocument`): fields typing, stamps, margin notes, stage readout | GSAP timeline, plays once, replayable |
| Remittance slip (`RemittanceSlip`) | static; page-wide reveal only |
| Advisory calendar (`AdvisoryWeek`) | `useStepper` (timer, on-screen only); CSS owns transitions |
| Reporting Lottie (`LottieView`) | lottie-web light build, lazy-loaded, plays only on screen; registry in `lib/data/lottie-assets.ts` |

Pins used on the homepage: the revenue-cycle section and the learning path. Both are
desktop-only and off under reduced motion; below `lg` they fall back to a swipe row and to
tap-to-select. The Governance Room is deliberately not pinned: its stages are too tall to
fit a fixed frame without an inner scroll, which read as the page being stuck.

## Scope markers

- `data-gsap-scope` — the root of a GSAP-controlled subtree. Currently: `HeroSequence`,
  `Preloader`, `OpeningStatement`, `ClaimDocument`, `KpiReview`'s chart grid.

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
