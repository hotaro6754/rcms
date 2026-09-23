import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Authorisation, enforced on the server.
 *
 * Hiding a link is presentation, not security. Every protected route calls one of these
 * before it reads or writes anything, and they throw rather than return null so a forgotten
 * check fails loudly instead of leaking.
 */

export type Role = "STUDENT" | "TRAINER" | "ADMIN" | "OWNER";

/** Higher number outranks lower. OWNER can do anything an ADMIN can, and so on. */
const RANK: Record<Role, number> = {
  STUDENT: 1,
  TRAINER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export class AuthorisationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorisationError";
  }
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Any signed-in, email-verified user. */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    throw new AuthorisationError("Sign in to continue.", 401);
  }
  if (!session.user.emailVerified) {
    throw new AuthorisationError("Verify your email address to continue.", 403);
  }
  return session.user;
}

/** A user holding at least this role. */
export async function requireRole(minimum: Role) {
  const user = await requireUser();
  const role = (user as { role?: Role }).role ?? "STUDENT";
  if (RANK[role] < RANK[minimum]) {
    throw new AuthorisationError("You do not have access to this.", 403);
  }
  return { ...user, role };
}

export const requireTrainer = () => requireRole("TRAINER");
export const requireAdmin = () => requireRole("ADMIN");
export const requireOwner = () => requireRole("OWNER");

/**
 * Ownership check for student-scoped records. An admin may read anyone's; a student may
 * only read their own. Used wherever a route takes a userId from the URL.
 */
export async function requireSelfOrAdmin(userId: string) {
  const user = await requireUser();
  const role = (user as { role?: Role }).role ?? "STUDENT";
  if (user.id !== userId && RANK[role] < RANK.ADMIN) {
    throw new AuthorisationError("You do not have access to this.", 403);
  }
  return { ...user, role };
}
