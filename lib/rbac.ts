/**
 * Request-side authorisation helpers, kept for the pages and actions written before the
 * permission model. New code should use lib/actor.ts directly: `requirePermission` in an
 * action or page, `assertCan` inside a service.
 *
 * Hiding a link is presentation, not security. These throw rather than return null so a
 * forgotten check fails loudly instead of leaking.
 */
export { AuthorisationError } from "./errors";
export { getSession, requireActor as requireUser, requirePermission, requireActor } from "./actor";
