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
| Hero master timeline | GSAP |
| Hero SVG: blueprint, lifecycle path, queue field, metric line | GSAP (DrawSVG, MotionPath) |
| Headline reveals | GSAP (SplitText) |
| Hero → dashboard product reveal | GSAP (Flip) |
| Scroll choreography, KPI chart draw-in | GSAP (ScrollTrigger) |
| Cinematic counters (hero, KPI section) | GSAP |
| Tabs, accordion, agenda indicator | Motion |
| Command palette, modal, sheet, dropdown, tooltip | Motion |
| Table row expansion, status transitions, presence/exit | Motion |
| Button press, nav state | Motion |
| Hover colour, focus ring, static transitions | CSS |

## Scope markers

- `data-gsap-scope` — the root of a GSAP-controlled subtree. Currently: `HeroSequence`,
  `KpiReview`'s chart grid.
- `data-flip-id` — participates in the hero → dashboard Flip. Only `MetricCard` and the hero
  KPI object carry these, and the ids come from `MetricId` so the pairing cannot drift.

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
