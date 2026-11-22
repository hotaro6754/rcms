# RCMExcel — Implementation log (this audit pass)

Nothing was committed or pushed. All changes are in the working tree on `redesign/product-skin`.

| Change | Why | Files |
| ------ | --- | ----- |
| Public copy says four levels with the published names | F010: "three levels" and "Trainee/Leadership" contradicted the four published levels | `lib/site/pages/site.ts`, `learning-paths.ts`, `catalog.ts`, `home.ts`, `lib/data/catalog.ts`, `app/admin/content/page.tsx` |
| Stage-to-level mapping: blueprint 1→Beginner, 2–3→Professional, 4+→Leader | F010: Operational Excellence was labelled Leader on the homepage | `components/atlas/HomeView.tsx` |
| Certify tab: certificate per course, badge per level | F011: copy said a certificate per level; code issues per course | `components/atlas/Learn.tsx` |
| Mentoring hidden by default on home and pricing; FAQ, tagline, About and Pricing copy corrected | F025: published "No Mentoring Disclaimer" contradicted priced sessions | `lib/site/pages/home.ts`, `pricing.ts`, `about.ts`, `lib/data/catalog.ts`, `lib/brand.ts` |
| Menu anchors repointed (`#system`→`#cycle`, `#governance`→`#practice`, `#people`→`#career`, `#floor-notes`→`#notes`); `id="notes"` on the closing band | F022: anchors pointed at sections that no longer exist | `lib/site/pages/site.ts`, `components/atlas/HomeView.tsx` |
| Ring palette applied to hero tiles, marquee, preloader, sign-in | Owner chose the cycle ring's palette | `components/atlas/lively.module.css`, `preloader.module.css`, `Preloader.tsx`, `app/(auth)/auth.module.css`, `app/(auth)/layout.tsx` |
| Audit documents | Brief deliverables | `docs/RCMEXCEL_*.md` |

Earlier in the same redesign (before this pass): Atlas homepage, illustrated hero with data tiles and stage marquee, `/v2` compact hero, section illustrations, course-step art in "How a course works", first-visit preloader with logo animation, light-only theme, sign-in redesign, footer column fix, hero CTA contrast fix.

## Interactive 3D scenes (after the audit pass)

| Change | Why | Files |
| ------ | --- | ----- |
| `InfoScene`: 3D isometric picture + numbered hotspots (Motion pulse, term cards), GSAP claim token along a route, scroll-triggered auto-tour that stops when the visitor interacts, pointer tilt; keyboard, Escape and reduced-motion paths; content visible without animation | Owner: illustrations must be 3D, corporate, infographic and interactive (GSAP + Motion). Pattern taken from verified Awwwards SOTDs (eHealth interactive infographic: explore the process; Atlas by Vaonis: sequence reveals) | `components/atlas/InfoScene.tsx`, `scene.module.css` |
| Hero (`/`): five-room revenue-cycle scene with travelling claim; data tiles moved into a row below | Same | `components/atlas/LivelyHero.tsx`, `HomeView.tsx`, `lively.module.css` |
| Cycle, paths, practice and teams sections: phase stack, level ladder (published levels), five whys on CO-50 (RCA data), corporate training room | Same | `components/atlas/HomeView.tsx` |
| Lenis smooth scroll driven by GSAP's ticker (off on touch and under reduced motion) | Owner request | `components/atlas/SmoothScroll.tsx`, `package.json` (`lenis@1.3.4`) |
| Real insurer removed from teaching data | F012 | `lib/data/governance.ts`, `lib/data/lab.ts` |
| Headings beside scenes top-aligned and sticky on desktop | Layout gap found in QA | `components/atlas/atlas.module.css` |

Three.js / Theatre.js / WebGL: evaluated, not added. The scenes are explorable with HTML, SVG, GSAP and Motion; a WebGL layer would add weight without teaching anything more. Revisit for a single signature moment if wanted.

## Real-time 3D hero (replaces the hotspot scenes)

| Change | Why | Files |
| ------ | --- | ----- |
| Homepage hero is a pinned, scroll-scrubbed WebGL world (three.js via React Three Fiber + drei): five platforms built from geometry, a teal tube path, a printed claim form (canvas texture, "illustrative teaching data") travelling it, studio lighting from local Lightformers, contact and directional shadows | Owner: real 3D, scroll-driven, immersive; pattern from Awwwards winners with pinned scroll sequences | `components/atlas/three/CycleWorld.tsx`, `ClaimJourney3D.tsx`, `journey.module.css` |
| People are eight distinct generated 3D renders, cut out offline (green key, despill, trim) and shown as camera-facing figures drawn in front of their desks | Owner: realistic people, sitting and standing, no repeats | `public/images/people/*.png` |
| Hero copy: "From RCM beginner to operations leader." (the existing positioning, F001) with a plain statement of what RCMExcel is and the four-level path; it vanishes on the first scroll | Owner: positioning was missing and the old line felt forceful | `ClaimJourney3D.tsx`, `HomeView.tsx` |
| Stage caption reduced to number, phase, name and one sentence | Immersion | `ClaimJourney3D.tsx` |
| Hotspot numbers and the paper token removed; section art shown as clean 3D plates | Owner rejected them | `HomeView.tsx` |
| "How a course works" tabs use new 3D art | Owner request | `components/atlas/Learn.tsx`, `public/images/art3d/learn-*.png` |
| Dependencies: `three@0.170`, `@react-three/fiber@9.1`, `@react-three/drei@10.0`, `lenis@1.3.4` | Real-time 3D and smooth scroll | `package.json` |

The 3D chunk is loaded on demand (`next/dynamic`, no SSR). Under reduced motion the world renders once and the ten stages are listed as text.
| Scene direction pass: tube replaced by a flowing dashed flight path the claim arcs along; platforms glow when the claim arrives; caption and camera share one scroll mapping (`three/journeyMath.ts`); front desk with waiting chairs and the receptionist behind the counter facing his screen; payer shown as the institution alone; operations floor with two analysts and two leads in conversation | Owner review of the 3D hero | `components/atlas/three/CycleWorld.tsx`, `three/journeyMath.ts`, `ClaimJourney3D.tsx` |

## Site-wide theme pass (portal, auth, admin, inner pages)

| Change | Why | Files |
| ------ | --- | ----- |
| `rcx` skin tokens remapped to the ring palette (navy, sage, sky, sand, teal accent on #F6F8FA) and to the site fonts (Newsreader display, Geist text, Plex Mono labels) | One theme everywhere: sign-in, student portal (academy, courses, lessons, assessments, certificates, library, account, support, team, checkout) and admin all read these tokens | `app/rcx.css` |
| Preloader rebuilt in the logo's own colours with an SVG mark drawn to match `public/brand/rcmexcel-mark.png` (four navy bars, teal-to-green arrow); wordmark "RCMEXCEL · Learner to Leader" | Owner: preloader colours and logo did not match the brand | `components/atlas/BrandMark.tsx`, `Preloader.tsx`, `preloader.module.css` |
| Sign-in uses the official mark image and the 3D learner art | Same | `app/(auth)/layout.tsx`, `auth.module.css` |
| Shared inner-page header takes an optional 3D illustration (soft float); added to learning paths, catalogue, pricing, about, contact, resources, practice tests, blog | Inner pages were plain text headers | `components/site/PageHeader.tsx`, `app/globals.css`, the eight pages |
| Portal headers: academy greeting uses the 3D learner instead of the cartoon mascot; certificates and library show matching 3D art | Portal visual consistency | `app/(portal)/academy/page.tsx`, `certificates/page.tsx`, `library/page.tsx`, their CSS, `app/rcx.css` |

Not reviewed in the browser: course, lesson and assessment screens (the test student has no enrolment). They inherit the new tokens. The results page still uses the mascot.

## Rexi, the 3D guide, and frameless art

| Change | Why | Files |
| ------ | --- | ----- |
| Rexi rebuilt as a real-time three.js character from the logo (navy chart-bar body, teal-to-green arrow sash, eyes that follow the pointer, blinking, breathing; moods wave / read / certificate / think / celebrate / present; hops when clicked). Renders only while on screen; a still render of the same pose shows while it loads and under reduced motion | Owner: portal art felt forced; asked for 3D or a mascot, built in WebGL, that makes learners want to come back | `components/mascot3d/RexiWorld.tsx`, `Rexi3D.tsx`, `public/images/mascot/*.png` (six generated poses, green-keyed) |
| Portal headers use Rexi instead of boxed pictures: academy (wave), certificates (certificate), library (read); assessment results (celebrate or think) | Same | `app/(portal)/academy/page.tsx`, `certificates/page.tsx`, `library/page.tsx`, `academy/attempts/[id]/page.tsx`, `app/rcx.css` |
| Public page-header art fades into the page through a radial mask, so the image's own background never shows as a box | Visible grey boxes | `app/globals.css` |

Tried and dropped: cutting the 3D scenes out of their backgrounds by colour. White desktops are nearly the same colour as the background and were cut away with it, so the radial mask is used instead.

## Creative-direction call: no mascot

| Change | Why | Files |
| ------ | --- | ----- |
| Rexi (procedural three.js, then rendered) removed from every page; `components/mascot3d` deleted. The six generated poses remain in `public/images/mascot/` (unused) | Owner and creative review: a mascot in every header felt forced and undercut the corporate tone | `app/(portal)/academy/page.tsx`, `certificates/page.tsx`, `library/page.tsx`, `academy/attempts/[id]/page.tsx`, `app/rcx.css` |
| Portal headers back to title, one line and the learner's counters (two-column grid) | Calm, professional headers | `certificates.module.css`, `library-page.module.css` |
| 3D scenes moved to empty states, faded into the card with a radial mask: My courses (lesson), Earned certificates (certificate), Library (reading) | Illustration only where it explains what will appear | same pages, `.x-empty-art` in `app/rcx.css` |
