# RCMExcel — QA report (this audit pass)

## Run

| Check | Result |
| ----- | ------ |
| `tsc --noEmit` (whole project) | Pass, 0 errors |
| Homepage links (25 internal + 2 anchors) | All 200; anchors exist |
| Public routes `/learning-paths`, `/catalog`, `/pricing`, `/about`, `/resources`, `/blog`, `/contact`, `/resources/tests`, `/legal/*`, catalogue detail pages | 200 (`/courses` 308 → `/catalog`) |
| Rendered copy | "Career consultation" no longer on the homepage; level names render as Beginner / Professional / Leader |
| Mobile 375px homepage | No horizontal page scroll (scrollWidth 375); hero tiles stack under the art |
| Preloader | Plays once per session, hero intro waits for it (checked visually earlier in the redesign) |

## Not run

`next build` (would clash with the running dev servers' `.next`), ESLint, Lighthouse/Core Web Vitals, automated accessibility scan, cross-browser checks, portal and admin routes, every public page at 375px.

## Known issues

- Dev environment: a stray `next dev` on port 3000 (started without `SITE_MODE=live`) shares `.next` with the port-3001 server; this causes intermittent dev-only 404s and chunk errors. Stop it before building.
- Illustration direction does not match the owner's Cosmos board (F015).
- Inner public pages still use the older layout system (F018).

## Honest scorecard (out of 100)

| Category | Weight | Score | Note |
| -------- | ------ | ----- | ---- |
| Brand identity and originality | 10 | 6 | Ring and palette distinctive; hero art generic-ish |
| Creative and art direction | 10 | 6 | Art set diverges from the owner's board |
| Visual hierarchy and typography | 8 | 6 | Solid type system |
| Layout and composition | 8 | 5 | Repeated "heading + plate" rhythm |
| Industry relevance | 10 | 8 | Ten stages, CO-50, operating review are specific |
| UX and information architecture | 10 | 7 | Four-level structure now consistent |
| Interaction and motion | 8 | 6 | Purposeful; reduced motion handled |
| Mobile and responsive | 8 | 5 | Homepage checked; other pages not |
| Accessibility | 7 | 4 | Not audited with tools |
| Performance | 8 | 4 | Not measured |
| Technical architecture | 6 | 4 | Three skins coexist; dead components |
| SEO, content accuracy and trust | 7 | 6 | Mentoring contradiction fixed; drafts pending legal review |
| **Total** | **100** | **67** | |

To move this past 85: information-design art in the ring palette (F015/F017), inner pages on one system (F018), measured performance and accessibility, and a mobile pass of every public route.

## 3D hero pass (22 Nov)

| Check | Result |
| ----- | ------ |
| Desktop 1440×900: intro, copy leaves on first scroll, camera visits each platform, caption matches camera | Pass (visual) |
| Phone 375×812: intro copy and level chips readable; journey framing closer; no horizontal page scroll (scrollWidth 375) | Pass (visual) |
| World waits on character images | Fixed: each person loads independently |
| Rendering when off screen | Stops (IntersectionObserver sets the canvas frameloop to "never") |
| Phone rendering | DPR capped at 1.5, 1024px shadow map, 512px contact shadows |
| Reduced motion | No pin; world renders once; stages listed as text (code path, not visually re-checked) |
| Production build / bundle size | Not run: a build would overwrite the `.next` folder the two running dev servers use |
