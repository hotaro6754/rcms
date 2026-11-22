/**
 * Launch state. RCMExcel is live: the pre-launch "coming soon" lockdown is retired and its page
 * removed (old links to /coming-soon redirect home in middleware.ts). `comingSoon()` stays as the
 * single switch the rest of the code reads, so pre-launch behaviour (staff-only sign-in, no
 * sign-ups, no indexing) is not scattered through the codebase if it is ever needed again.
 */
export const comingSoon = () => false;

/**
 * Paths that stay reachable during lockdown. Everything else is rewritten to /coming-soon.
 * Each of these still authorises on the server: the admin layout requires a staff account
 * with MFA, and sign-in refuses non-staff sessions while the site is closed.
 */
const OPEN_EXACT = new Set([
  "/coming-soon",
  "/sign-in",
  "/two-factor",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  "/favicon.ico",
  "/opengraph-image",
  "/twitter-image",
]);

const OPEN_PREFIXES = [
  "/admin",
  // Staff set up two-step verification here before the admin opens to them.
  "/account/security",
  // Static assets.
  "/brand/",
  "/fonts/",
  "/images/",
  "/lottie/",
];

/**
 * Learner accounts allowed in before launch (LOCKDOWN_PREVIEW_EMAILS, comma separated), for
 * testing the learner side end to end. Empty by default: nobody but staff.
 */
export function previewLearners(): string[] {
  return (process.env.LOCKDOWN_PREVIEW_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
export const isPreviewLearner = (email: string | null | undefined) => !!email && previewLearners().includes(email.toLowerCase());

/** The learner area, reachable during lockdown only when preview learners are configured. */
const LEARNER_EXACT = new Set(["/library", "/certificates"]);
const LEARNER_PREFIXES = ["/academy", "/support", "/account", "/team"];

export function openDuringLockdown(path: string) {
  if (OPEN_EXACT.has(path)) return true;
  if (OPEN_PREFIXES.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`))) return true;
  // The pages themselves still require a signed-in account, and the portal layout sends
  // anyone who is not staff or a preview learner to the coming-soon page.
  if (previewLearners().length && (LEARNER_EXACT.has(path) || LEARNER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)))) return true;
  return false;
}

/**
 * Account creation from a server-side script (scripts/create-admin.ts) during lockdown. The
 * flag lives in this process's memory only; no request can set it.
 */
const CLI = Symbol.for("rcms.cliAccountCreation");
export function allowCliAccountCreation() {
  (globalThis as Record<symbol, unknown>)[CLI] = true;
}
export function cliAccountCreationAllowed() {
  return (globalThis as Record<symbol, unknown>)[CLI] === true;
}
