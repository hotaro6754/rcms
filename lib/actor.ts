import { cache } from "react";
import { headers } from "next/headers";
import type { AccountStatus, Role } from "@prisma/client";
import { prisma } from "./db";
import { auth } from "./auth";
import { AuthorisationError } from "./errors";
import { effectiveRoles, permissionsFor, type Permission, type StaffRoleName } from "./permissions";
import { audit } from "./audit";

/**
 * The actor: who is doing something, and with what authority.
 *
 * Built from the database on every request (never from a cached session claim), so a role
 * removed a second ago is already gone. Services take an Actor explicitly and check it
 * themselves; that is the data-access-layer half of authorisation. Server actions and pages
 * get their Actor from `requireActor` / `requirePermission`, the request half.
 */

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  staffRoles: StaffRoleName[];
  permissions: ReadonlySet<Permission>;
  vendorIds: string[];
  /** Organisations this person manages. */
  managedOrgIds: string[];
}

/** Statuses that cannot use the platform at all. */
export const BLOCKED_STATUSES: AccountStatus[] = ["SUSPENDED", "DEACTIVATED", "ARCHIVED"];

export async function loadActor(userId: string): Promise<Actor | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      twoFactorEnabled: true,
      staffRoles: { select: { role: true } },
      vendorMembers: { select: { vendorId: true } },
      orgMembers: { where: { isManager: true }, select: { orgId: true } },
    },
  });
  if (!user) return null;
  const granted = user.staffRoles.map((r) => r.role);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    staffRoles: effectiveRoles(user.role, granted),
    permissions: permissionsFor(user.role, granted),
    vendorIds: user.vendorMembers.map((v) => v.vendorId),
    managedOrgIds: user.orgMembers.map((o) => o.orgId),
  };
}

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** The signed-in actor, or null. Cached for the length of one request. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session?.user) return null;
  return loadActor(session.user.id);
});

export function isStaff(actor: Pick<Actor, "staffRoles">) {
  return actor.staffRoles.length > 0;
}

export function can(actor: Pick<Actor, "permissions"> | null | undefined, permission: Permission) {
  return !!actor && actor.permissions.has(permission);
}

export function canAny(actor: Pick<Actor, "permissions"> | null | undefined, permissions: Permission[]) {
  return !!actor && permissions.some((p) => actor.permissions.has(p));
}

/**
 * The service-layer check. Throws, and records the refusal: access-control violations are
 * one of the events the blueprint and OWASP both ask to be logged.
 */
export async function assertCan(actor: Actor, permission: Permission, target?: { entity: string; id?: string | null }) {
  if (actor.permissions.has(permission)) return;
  await audit({
    actorId: actor.id,
    actorRoles: actor.staffRoles,
    action: "deny",
    entity: target?.entity ?? "Permission",
    entityId: target?.id ?? null,
    outcome: "denied",
    after: { permission },
  });
  throw new AuthorisationError("You do not have permission to do that.", 403);
}

function assertUsable(actor: Actor) {
  if (!actor.emailVerified) throw new AuthorisationError("Verify your email address to continue.", 403);
  if (BLOCKED_STATUSES.includes(actor.status)) {
    throw new AuthorisationError("This account is not active. Contact support if you think that is wrong.", 403);
  }
}

/** Any signed-in, verified, active person. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AuthorisationError("Sign in to continue.", 401);
  assertUsable(actor);
  return actor;
}

export async function requirePermission(permission: Permission, target?: { entity: string; id?: string | null }) {
  const actor = await requireActor();
  await assertCan(actor, permission, target);
  return actor;
}

export async function requireAnyPermission(permissions: Permission[]) {
  const actor = await requireActor();
  if (!canAny(actor, permissions)) {
    await assertCan(actor, permissions[0]);
  }
  return actor;
}

/** Staff areas additionally require MFA when ADMIN_MFA_REQUIRED is on (the default in production). */
export function mfaRequired() {
  const flag = process.env.ADMIN_MFA_REQUIRED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "production";
}
