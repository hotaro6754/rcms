/**
 * Runs once when the server starts (not during `next build`). In production a missing or
 * unsafe setting stops the server, so the problem shows in the deploy log straight away.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnv } = await import("./lib/env");
  const { errors, warnings } = checkEnv();
  for (const w of warnings) console.warn(`[config] ${w}`);
  if (errors.length === 0) return;
  for (const e of errors) console.error(`[config] ${e}`);
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Refusing to start: ${errors.length} configuration problem(s). See the [config] lines above.`);
  }
}
