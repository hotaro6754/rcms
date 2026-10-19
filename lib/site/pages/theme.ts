import { choice, color, definePage, group } from "../fields";

/**
 * The public site's colours, fonts and corners. Defaults are the theme in app/globals.css;
 * only values that differ are written into the page, so an untouched theme changes nothing.
 * Publishing checks text contrast (lib/site/checks.ts).
 */
export const themePage = definePage({
  key: "theme",
  path: "/",
  label: "Theme: colours and fonts",
  group: "Site-wide",
  description: "Colours, fonts and corner style for the public website. Text must stay readable: publishing is refused if a text colour has less than 4.5:1 contrast with its background.",
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
