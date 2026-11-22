/**
 * Light, dark or follow the device. The choice lives in this browser only (localStorage) and is
 * applied before first paint by THEME_BOOT_SCRIPT, so a dark page never flashes white.
 *
 * html[data-theme] carries an explicit choice; without it the CSS follows prefers-color-scheme.
 * The "dark" class is kept in step so Tailwind's dark: variant matches what is on screen.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "rcms.theme";

/* The site is light-only for now: the boot script pins light (clearing any stored dark choice)
   and applyTheme ignores requests for dark. Dark tokens stay in the CSS for later. */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;d.dataset.theme="light";d.classList.remove("dark");localStorage.removeItem("${THEME_KEY}")}catch(e){}})();`;

export function applyTheme(_choice: ThemeChoice) {
  const d = document.documentElement;
  d.dataset.theme = "light";
  d.classList.remove("dark");
}

export function readTheme(): ThemeChoice {
  return "light";
}
