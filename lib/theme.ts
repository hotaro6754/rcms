/**
 * Light, dark or follow the device. The choice lives in this browser only (localStorage) and is
 * applied before first paint by THEME_BOOT_SCRIPT, so a dark page never flashes white.
 *
 * html[data-theme] carries an explicit choice; without it the CSS follows prefers-color-scheme.
 * The "dark" class is kept in step so Tailwind's dark: variant matches what is on screen.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "rcms.theme";

export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=document.documentElement;if(t==="light"||t==="dark"){d.dataset.theme=t}var dark=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);d.classList.toggle("dark",dark)}catch(e){}})();`;

export function applyTheme(choice: ThemeChoice) {
  const d = document.documentElement;
  if (choice === "system") delete d.dataset.theme;
  else d.dataset.theme = choice;
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  d.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
}

export function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}
