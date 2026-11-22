# RCMExcel — Design system (public site, light theme)

## Colour (the ring palette, chosen by the owner)

| Token | Value | Use |
| ----- | ----- | --- |
| ink / navy | `#142338` | Headings, primary buttons, dark tiles, logo bars |
| text | `#20364B` | Body |
| muted | `#64758A` | Secondary text, labels |
| bg | `#F6F8FA` | Page |
| surface | `#FFFFFF` | Cards, ring centre |
| line | `#DCE3EA` | Rules, borders |
| sage | `#D7E8E1` | Front-end phase, light tiles |
| sky | `#DCE8F5` | Middle phase, light tiles |
| sand | `#F1E4D3` | Back-end phase, highlighter, picture-frame background |
| teal | `#3E827C` | Accent (headline italics, hover), "Excel" in the wordmark |
| warm | `#C58D62` | Third logo bar, sparing accent |
| ok / risk / breach | `#2F7D5B` / `#A86A12` / `#B4433C` | Status only, always with icon and word |

Text on sage, sky and sand is navy (AA). Text on navy is white.

## Type

Newsreader 400 for display and section headings (italic for the accent phrase); Geist for body and UI; IBM Plex Mono for labels, stage numbers, claim IDs and annotations. Display sizes use `clamp()`; body 17px, line-height 1.6.

## Shape and depth

Radii: 999px pills (chips, marquee), 20–28px plates and tiles, 12px controls. Shadows: one soft long shadow on plates and tiles; no glassmorphism.

## Motion

GSAP for sequences (preloader, hero intro, plate reveals, parallax ±2.5%); Motion for tab and accordion state. Ease `expo.out` for entrances, `power2.inOut` for draws. Every animation has a reduced-motion path that shows the finished state. The hero waits for the first-visit preloader (`rcx:loaded`).

## Illustration

Current: a generated riso-style set in `public/images/art/` (operations floor, claim journey, learning path, denial investigation, team training, learner desk, five course-step scenes, mentoring — unused). Recommended direction from the owner's board: information-design visuals (rings, flows, layers, steps) in the palette above.
