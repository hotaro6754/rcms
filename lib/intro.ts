/**
 * The handoff between the preloader and the hero.
 *
 * The hero's master timeline must not start while the preloader still covers it, and it
 * must never wait forever either. `introDone()` resolves when the preloader says so, at
 * once when the intro is not playing (repeat visit, reduced motion, no preloader on the
 * page), and after a hard ceiling whatever else happens.
 */

export const INTRO_KEY = "rcms-intro";
const CEILING_MS = 2600;

let resolve: (() => void) | null = null;
let promise: Promise<void> | null = null;
let handedOver = false;

function introPlaying() {
  return typeof document !== "undefined" && document.documentElement.dataset.intro === "play";
}

export function introDone(): Promise<void> {
  if (handedOver || !introPlaying()) return Promise.resolve();
  if (!promise) {
    promise = new Promise<void>((r) => {
      resolve = r;
      window.setTimeout(r, CEILING_MS);
    });
  }
  return promise;
}

/** The hero may start. The curtain can still be on its way out. */
export function markIntroDone() {
  handedOver = true;
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Storage blocked: the intro simply plays again next time.
  }
  resolve?.();
  resolve = null;
}

/** The curtain is gone: CSS hides it and gives the page its scroll back. */
export function finishIntro() {
  markIntroDone();
  if (typeof document !== "undefined") document.documentElement.dataset.intro = "seen";
}

/**
 * Runs in <head> before first paint. The homepage no longer opens behind a preloader (content
 * should never wait for an animation), so every load is marked "seen": the curtain is never
 * shown, the page keeps its scroll and introDone() resolves at once.
 */
export const INTRO_BOOT_SCRIPT = `document.documentElement.dataset.intro="seen";`;
