import { ZodError } from "zod";

/**
 * The two kinds of failure a service can report to its caller.
 *
 *  - AuthorisationError: the actor may not do this (401 not signed in, 403 not allowed).
 *  - ServiceError: the request was understood and refused on its merits (validation, state,
 *    business rule). Its message is written for the person who caused it.
 *
 * Anything else is a bug and propagates as one.
 */

export class AuthorisationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorisationError";
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true; data?: undefined } : { ok: true; data: T })
  | { ok: false; error: string; field?: string };

/**
 * Runs a server-action body and turns expected failures into a result the form can show.
 * Unexpected errors are logged and reported generically, so internals never reach a page.
 */
export async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string; field?: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message, field: error.field };
    if (error instanceof AuthorisationError) return { ok: false, error: error.message };
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return { ok: false, error: issue?.message ?? "Check the form and try again.", field: issue ? String(issue.path[0] ?? "") : undefined };
    }
    // Next's redirect()/notFound() work by throwing; let them through.
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[action] unexpected failure", error);
    return { ok: false, error: "That did not go through. Try again, and tell support if it keeps happening." };
  }
}
