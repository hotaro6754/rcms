/**
 * Runs once when the server starts (not during `next build`). In production a missing or
 * unsafe setting stops the server, so the problem shows in the deploy log straight away.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  (await import("./lib/env")).enforceEnv();
}
