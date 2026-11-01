# RCMExcel content inventory

Source of truth: the website editor schemas (`lib/site/pages/home.ts`, `site.ts`) with their defaults, the teaching data in `lib/data/*`, and the levels / courses / prices in the database. Order is the order on the page. "Status": **Retained** (same content), **Reorganised** (same content, new layout/position), **Refined** (wording changed — see the change log in `03_CONTENT_PRESERVATION_MAP.md`), **Added** (new navigational copy, no new claims).

## Homepage

| # | Section (before → after) | Content | Purpose / importance | Presentation problem before | New representation | Status | Where the full content lives |
|---|---|---|---|---|---|---|---|
| 0 | Preloader → removed | Wordmark + "Revenue cycle · Operations · Leadership" | Decorative intro | Made content wait ~1.4s | — | Removed (decorative only; same three words remain in the nav/sections) | — |
| 1 | Hero | Headline "From RCM / beginner. / To operations / leader.", lead, two CTAs, case facts (CASE 20481, SPECIALTY Cardiology, STAGES 13, one denial), scroll prompt; Claim #20481 document | Positioning + the signature walkthrough | Copy hidden until animation; serif display type | Label + two-line headline, lead, primary + outline buttons, facts as a 3-cell table; claim card on a quiet grid | Retained (+ Added label "US healthcare revenue cycle · Training and mentoring", from the lead). Scroll prompt not shown (editor field kept) | Hero; claim also reachable from Practice → "Claim #20481 walkthrough" |
| 1b | At a glance (new) | Counts from the content: 10 stages, N levels, 6 career levels, N mentoring sessions, each linking to its section; claim/remittance/report illustration | Orientation for scanners | Did not exist | Four link cards | Added | Each links to its section |
| 2 | 01 The problem | "RCM isn't one process." + six lines (chain, system, decisions, people, rules, financial outcomes) with facts; resolution "We teach the whole picture." + text | Explains RCM as connected processes | Pinned scroll sequence; lines visible one at a time | Heading + resolution + photo; six cards in a grid, all visible | Reorganised | Homepage #problem |
| 3 | 02 The cycle | Ten stages (Registration … Denials and recovery) with phase (front/middle/back), what it does, how it breaks, the number, where you learn it | Core educational map | Pinned + scrubbed; stage visible only at a scroll position | Phase-grouped stage selector (click/keys), detail panel, prev/next, **full table of all ten stages**, figure "Where each stage is taught" | Reorganised; intro wording Refined | Homepage #system (table holds every field) |
| 4 | 03 The path | Heading, count line, lead, levels from DB (name, display title, short description, audience, core topics, released courses + live prices, effort), compare link, "Not sure it's your level?", "See the courses" | Learning progression Trainee → Professional → Leadership | Long spreads; topics hidden on phones beyond 4 | Three cards with level colour, first 5 topics + disclosure for the rest, courses with prices, CTA; training photo | Reorganised | Homepage #tracks, /learning-paths, /catalog |
| 5 | 04 The investigation | Situation label, statement, CODE CO-50 / CLAIMS 312 / AT STAKE / REASON, remittance slip, "Where do you look first?", six lines of inquiry with verdicts and findings, five whys with evidence, conclusion, CTA | Denial investigation & root cause analysis | Charcoal surface; low-contrast mono labels | Four figure cards; remittance beside inquiry list; finding card with verdict colour; five whys as numbered list; Figma RCA diagram in a disclosure | Reorganised (+ "Evidence:" prefix on each evidence line) | Homepage #lab |
| 6 | 05 The review | Heading, lead, board-pack page (client, summary, 9 measures with target/actual/trend/status, why it moved, decisions needed), caption, CTA to /governance | Monthly operating review | Paper + grain styling; Lottie illustration | Heading + photo; the same board-pack page as a clean card | Retained (Lottie replaced by photo) | Homepage #governance, /governance |
| 7 | 06 The people | Statement (two sentences); six-level role ladder (L1 Associate … L6 Director / AVP) with what each owns, metric, trend, current value | Career progression | Scrubbed word fade; black hover | Statement + Figma six-step illustration; ledger as a table card, navy hover | Retained | Homepage #people (anchor added) |
| 8 | 07 The advice | Heading, lead, sessions from `MENTORING` with live prices (30/45/60/90 min, who, you leave with, request link), typical-week calendar + note | Mentoring & consultation | Charcoal surface; tilted paper | Four session cards with duration chip and price; photo; calendar card | Reorganised | Homepage #mentoring, /mentoring |
| 9 | 08 The author | Portrait (optional), 21 years caption, heading, name, focus, paragraph, experience list (Operations delivery, People leadership, Governance, Process improvement…), CTA | Author credibility | Giant numeral, colophon styling | Profile card + text + experience cards | Retained | Homepage #author, /about |

## Site-wide (navigation and footer)

| Area | Content | Status | Notes |
|---|---|---|---|
| Top bar | Wordmark, 5 flat links, Sign in / My academy, "Enroll now" | Reorganised | Now six menus (Learning, Practice, Mentoring, Resources, About, Pricing) built only from existing routes and sections; the old link list stays in the editor as a fallback |
| Footer closing | Status line CLAIM #20481 · PAID · RECONCILED · CLOSED; "The revenue cycle is complicated. Learning it doesn't have to be."; three links | Retained | Navy band |
| Floor Notes | Label, text, email field, button, success message | Retained | Anchor `#floor-notes` added; boxed field |
| Live facts | Time in India (IST), Courses, Sessions | Retained | |
| Site index | Learn, Practice, Academy, Contact (+ WhatsApp), Legal rows | Reorganised | Rows → columns |
| Colophon | Name, line, disclaimer (illustrative teaching data, HFMA MAP Keys no affiliation, not a substitute for payer/CMS/HIPAA/legal guidance), back to top | Retained; line Refined | Disclaimer unchanged |
| Large wordmark | "RCMExcel" set across the page, scroll-scrubbed | Reorganised | Shown as the logo lockup in the colophon (same editor toggle) |

## Other pages

`/about`, `/learning-paths`, `/catalog`, `/catalog/[slug]`, `/pricing`, `/mentoring`, `/resources*`, `/blog`, `/community`, `/contact`, `/legal/*`, `/p/[slug]`: **content untouched**. They inherit the new tokens, typography, header (tinted page header with brand label), navigation and footer. Prices, policies and legal text are unchanged.
