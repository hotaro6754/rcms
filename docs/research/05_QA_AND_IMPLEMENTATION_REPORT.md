# 05 — QA and implementation report

Branch `redesign/professional-presentation` (from `origin/main` @ `f91d55c`). **Not committed, not pushed, not deployed.**

## What was built

| Area | Files |
|---|---|
| Visual system (public site only) | `app/globals.css` (`.site-scope` tokens, navy band, `.eyebrow`, `.site-card`), `lib/site/pages/theme.ts` (matching defaults), `components/site/ThemeStyle.tsx` (`:root, .site-scope`) |
| Navigation | `components/site/SiteNavClient.tsx` (mega menu + phone sheet), `lib/site/pages/site.ts` (`nav.menus`, editable; old link list kept as fallback) |
| Homepage | `app/page.tsx`, `components/hero/HeroSequence.tsx`, `components/home/{Chapter, AtAGlance, OpeningStatement, SystemFlow, LearningPath, OperationsLab, ReviewPack, Leadership, Mentoring, Founder}.tsx`, `lib/site/pages/home.ts` (hero label, At a glance, figure title) |
| Footer | `components/site/SiteFooter.tsx`, `footer/FooterNotes.tsx` (`#floor-notes`), `footer/FooterLive.tsx` |
| Shared | `components/site/PageReveals.tsx` (adds `[data-reveal-group]`), `components/site/PageHeader.tsx` (tinted header, brand label), `components/illustration/{ClaimDocument, RemittanceSlip}.tsx` (cool paper, no tilt/grain) |
| Fixes | `components/site/BookingPanel.tsx`: session anchors `#career/#professional/#leadership/#roadmap` and pre-selection from the URL (homepage links to these anchors were already broken before) |
| Removed | `components/site/Preloader.tsx`, `components/site/footer/FooterWordmark.tsx`, `components/home/ProblemLine.tsx`; preloader boot script now marks every load "seen" (`lib/intro.ts`) |
| Assets | `public/images/photos/*` (4), `public/images/figma/*` (4) — see `IMAGE_ASSET_REGISTER.md` |
| Docs | `docs/research/01…05`, `RCMEXCEL_CONTENT_INVENTORY.md`, `IMAGE_ASSET_REGISTER.md`, `screenshots/before|after` |

No database schema, backend or dependency changes.

## Checks run

| Check | Result |
|---|---|
| `tsc --noEmit` | Pass |
| `eslint app components lib` | Pass, no warnings |
| `vitest run` (against a throwaway local MariaDB) | 21 files pass; 2 fail — `tests/integration/design.test.ts` (6 PDF tests) and `tests/unit/grant-staff-role.test.ts` (load error). Both fail identically on `main` (Windows pdfjs path), unrelated to this work |
| `next build` | Pass. `/` = 16.5 kB route, 269 kB first-load JS |
| Route check | 21 public routes in the menus/footer return 200 (`/courses` → 308 to `/catalog`, as before). Every menu href maps to an existing route; every homepage anchor (`#top #problem #system #tracks #lab #governance #people #mentoring #author #floor-notes`) exists |
| Mentoring deep link | `/mentoring#leadership` scrolls to and pre-selects "Leadership mentoring" |
| Console | No errors on fresh loads of `/` and `/mentoring` (earlier 500s were dev hot-reload requests from a stale server, not page errors) |
| Phone layout | 375 and 390px: 0px horizontal overflow; wide figures/tables scroll inside their own box |
| Keyboard | Menu: Tab to a menu, ↓ opens and focuses the first link ("Compare the levels"), Escape closes and returns focus to the button. Stage explorer: arrow keys / Home / End move between stages (roving tabindex, `role=tab/tabpanel`). Phone sheet: close button focused on open, Escape closes |
| Semantics | One `h1`; h2 per section, h3 inside; no duplicate ids; no image without `alt`; no unnamed links/buttons (scripted check) |
| Contrast | All text tokens measured ≥ 4.9:1 (see 04 spec table) |
| Reduced motion | Every GSAP block sits in `matchMedia("(prefers-reduced-motion: no-preference)")`; hero and menu entrances never hide content even when frames are throttled |

## Defects found during QA and fixed

1. Hover opened a menu and the follow-up click closed it again → a click within 500ms of a hover-open keeps it open.
2. Phone menu sheet was clipped to 64px because the header's `backdrop-filter` became the containing block for `position: fixed` → header is now solid white.
3. Hero copy and menu panel could stay invisible in a throttled tab (entrance started at opacity 0) → entrances now move content only.
4. Cycle intro said "Scroll through them" although stages are now chosen → "Go through them" (logged in 03).
5. Figma levels diagram labelled Trainee as "front-end stages", but Authorization (front end) is taught at Professional → caption corrected in Figma and re-exported.
6. Generated hero illustration grouped ten nodes 3/4/3 while the real phases are 3/3/4 → node row cropped out.
7. Duplicate caption under the levels figure → removed.

## Screenshots

`screenshots/before/` (live site) and `screenshots/after/` (local build with seeded data): home, learning-paths, mentoring, about (+ pricing, catalog after) at 1440 desktop and 390 phone; menu states `menu-learning|practice|mentoring-desktop.jpg`, `menu-sheet-mobile.jpg`. Captured with reduced motion so every element is in its final state. Tall phone pages were captured in segments (Chrome caps full-page captures at 16,384px), so a sticky header can appear at segment joins.

## Not verified / known limits

- **Live data**: QA used the seed data in a throwaway local database, not production. Production levels, courses and prices render through the same components.
- **Published editor content overrides new defaults.** If the live Theme page was ever published, its old colours (`#f3f2ee`, `#161513`, `#3f6e5e`…) and "Cabinet Grotesk"/"Nearly square" choices will still be applied. Fix after deploy: website editor → *Theme: colours, fonts and sizes* → reset to defaults and publish. The same applies to any published homepage/footer copy (e.g. the cycle intro and colophon line).
- **Tablet (768–1023px)** was checked through the breakpoint rules and the phone/desktop captures, not with a dedicated capture.
- **Screen readers**: semantics were checked by script, not with NVDA/VoiceOver.
- `LottieView` and `public/lottie/reporting.json` are no longer used on the homepage; left in place.
- Practice-console pages (`/overview`, `/governance`…) keep their own product styling; only their links moved into the Practice menu.

## Round 2 (follow-up requests)

**Stamps and hero grid removed.**
- The hero's background grid is gone.
- The rubber-stamp graphics are gone from the claim (DENIED, PAID) and the remittance (UNDER REVIEW). The facts they carried stay, as plain status badges: the claim's footer shows "Denied · CO-50 · RARC N706" during the walkthrough and ends on "Paid · $986.40 · 835"; the remittance footer reads "Under review · RCA open".
- The claim no longer jolts or shakes when it is submitted or denied.
- The margin notes are now upright sans-serif text instead of italic serif.

**Every inner page reworked to the same system** (`/learning-paths`, `/catalog`, `/catalog/[slug]`, `/pricing`, `/mentoring`, `/about`, `/contact`, `/resources`, `/resources/[section]`, `/resources/[section]/[slug]`, `/resources/tests`, `/blog`, `/community`, `/legal/*`, `/p/[slug]`):
- Shared page header with a brand label and a larger title. Breadcrumbs appear on deeper pages: resources sections, entries and tests, course pages and legal pages.
- 31 panels converted to the shared card style; the cards that link somewhere lift on hover. Buttons and fields are boxed, with matching corners.
- The old monospace labels now use the sans label style, and no text on the public site is smaller than 11.5px.
- Resources hub: an icon for each section, entry counts and an arrow on each card, and a larger search box. Empty sections now show a clear placeholder box.
- Glossary letters are buttons, and tags show as chips.
- Catalogue: the search sits as a card overlapping the header; each course card shows modules, lessons, hours and assessments as chips, with a prominent price and a "Details →" link.
- Course page: breadcrumbs replace the "← Catalogue" link, and learning outcomes are a grid of ticked items.

**Defects found and fixed in this round**
- `/pricing` scrolled 178px sideways on phones. A screen-reader-only label inside the price table escaped its scroll box once the card style lost `position: relative`. Restored safely by moving the card rule into Tailwind's components layer.
- `/contact` overflowed on phones because the grid columns had no minimum width.
- `.eyebrow` and `.site-card` were defined outside Tailwind's layers, so they overrode utility classes (for example, a requested grey label rendered teal). Both now sit in `@layer components`.

**Automated pass over 15 public pages** at 375px and 1440px:
- 0px horizontal overflow on every page.
- Exactly one `h1` per page.
- No images without `alt`, no duplicate ids, and no unnamed links or buttons.
- No text under 11.5px.
- No console errors.
