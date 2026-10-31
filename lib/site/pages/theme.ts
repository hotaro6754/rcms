import { choice, color, definePage, group } from "../fields";

// Kept here (not imported from ../style, which reads this page's defaults).
const TEXT_SIZES = [
  { value: "90", label: "Small (90%)" },
  { value: "100", label: "Standard (current)" },
  { value: "110", label: "Large (110%)" },
  { value: "120", label: "Extra large (120%)" },
] as const;
const HEADING_SIZES = [
  { value: "85", label: "Smaller (85%)" },
  { value: "100", label: "Standard (current)" },
  { value: "115", label: "Larger (115%)" },
  { value: "130", label: "Largest (130%)" },
] as const;

/**
 * The public site's colours, fonts and corners. Defaults are the theme in app/globals.css;
 * only values that differ are written into the page, so an untouched theme changes nothing.
 * Publishing checks text contrast (lib/site/checks.ts).
 */
export const themePage = definePage({
  key: "theme",
  path: "/",
  label: "Theme: colours, fonts and sizes",
  group: "Site-wide",
  description: "Colours, fonts, text sizes and corner style for the whole public website. Each page can also have its own style (at the bottom of its editor). Text must stay readable: publishing is refused if a text colour has less than 4.5:1 contrast with its background.",
  fields: {
    colours: group("Colours", {
      background: color("Page background", "#f3f2ee"),
      foreground: color("Main text", "#161513"),
      card: color("Cards and panels", "#ffffff"),
      muted: color("Secondary text", "#57534c"),
      primary: color("Buttons", "#161513"),
      primaryText: color("Button text", "#f7f3ec"),
      brand: color("Accent (links, highlights)", "#3f6e5e"),
      border: color("Lines and borders", "#dddbd4"),
    }),
    type: group("Fonts", {
      headings: choice(
        "Headings",
        [
          { value: "display", label: "Cabinet Grotesk (current)" },
          { value: "sans", label: "Satoshi" },
          { value: "serif", label: "Georgia (serif)" },
        ] as const,
        "display",
      ),
      body: choice(
        "Body text",
        [
          { value: "sans", label: "Satoshi (current)" },
          { value: "serif", label: "Georgia (serif)" },
          { value: "system", label: "System font" },
        ] as const,
        "sans",
      ),
    }),
    sizes: group("Text sizes", {
      text: choice("Text size", TEXT_SIZES, "100", { help: "Scales the content of every page: text, and the spacing around it." }),
      headings: choice("Heading size", HEADING_SIZES, "100", { help: "Page titles and section headings, relative to the text size." }),
    }),
    shape: group("Shape", {
      corners: choice(
        "Corners",
        [
          { value: "square", label: "Nearly square (current)" },
          { value: "soft", label: "Soft" },
          { value: "round", label: "Round" },
        ] as const,
        "square",
      ),
    }),
  },
});
