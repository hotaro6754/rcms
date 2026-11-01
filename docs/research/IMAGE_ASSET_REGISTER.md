# Image asset register

Every image added by the 2026-11 redesign. Licences were checked on each photo's own Unsplash page ("Free to use under the Unsplash License"; none were Unsplash+). Files were downloaded from Unsplash's CDN at 1800px, resized to 1600px and saved as WebP (quality 76). No watermarks, no embedded text, no logos.

**Unsplash License** (https://unsplash.com/license): irrevocable, non-exclusive, worldwide permission to download, copy, modify and use the photos for free, including commercially, without asking permission or giving attribution (attribution appreciated). Not allowed: selling unaltered copies, or compiling photos to build a similar or competing service. Note: the licence covers the photograph; it does not grant model or property releases, so the photos are used only as illustrative workplace imagery and never to imply the people shown are RCMExcel staff, learners or clients.

## Photography

| File | Source page | Photographer | Licence | Placement | Attribution required |
|---|---|---|---|---|---|
| `public/images/photos/revenue-cycle-analyst.webp` (1600×1067, 47 KB) | https://unsplash.com/photos/NFvdKIhxYlU | National Cancer Institute (@nci) | Unsplash License | Homepage 01 The problem | No |
| `public/images/photos/professional-learning-session.webp` (1600×900, 54 KB) | https://unsplash.com/photos/TCZ12fCpFVw | Vitaly Gariev | Unsplash License | Homepage 03 The path | No |
| `public/images/photos/operating-review-meeting.webp` (1600×900, 56 KB) | https://unsplash.com/photos/Qzw2nMdXMMQ | Vitaly Gariev | Unsplash License | Homepage 05 The review | No |
| `public/images/photos/one-to-one-mentoring.webp` (1600×1067, 46 KB) | https://unsplash.com/photos/7okkFhxrxNw | KOBU Agency | Unsplash License | Homepage 07 The advice | No |

Considered and rejected: hospital reception (nMyM7fxpokE — embedded Spanish signage), glass-reflection portrait (rRWiVQzLm7k — dark, unclear subject), two further meeting shots (5txln04Cx7I used briefly then removed as redundant; H5yZPwHtNgk duplicate).

## Figma assets

Figma file: **RCMExcel — Website visual assets** — https://www.figma.com/design/QjWMSjUnFS5argVlPS1fyQ (owner: the user's Figma team "GANGARAJU HARSHITH CSE-B's team"). Editable originals stay there.

| File | How it was made | Content source | Placement |
|---|---|---|---|
| `public/images/figma/learning-levels-progression.webp` (2400×880) | Built as a Figma frame (node `1:2`) with Inter, exported at 2× | Level names from `home.ts`; stage-to-level mapping from `lib/data/system.ts`; Leadership items from the review section. The Trainee caption was corrected from "Front-end stages of the claim" to "Where the claim begins" (Authorization is front end but taught at Professional) | Homepage 02, "Where each stage is taught" (full text alternative in `alt`) |
| `public/images/figma/denial-root-cause-analysis.webp` (2400×888) | Built as a Figma frame (node `1:63`), exported at 2× | CO-50 / 312 claims, the five why-questions, root cause and control from `lib/data/governance.ts` (`RCA`, `RISKS`) | Homepage 04, "The whole investigation at a glance" (full text alternative in `alt`) |
| `public/images/figma/claim-remittance-report.webp` (1400×371) | Figma image generation (gpt-image-2.5-flare, node `2:2`), cropped to the three document cards | Abstract; no text, numbers or people | Homepage "At a glance" (decorative, `alt=""`) |
| `public/images/figma/career-progression-guidance.webp` (1400×933) | Figma image generation (gpt-image-2.5-flare, node `2:3`) | Abstract six-step climb; matches the six-level ladder; no text or people | Homepage 06 The people (decorative, `alt=""`) |

The generated hero illustration originally included a row of ten nodes grouped 3 / 4 / 3. The real phases are 3 / 3 / 4 (front end / middle / back end), so that row was cropped out rather than published as an inaccurate diagram.

Figma image generation uses Figma AI credits on the user's plan (two generations were made).
