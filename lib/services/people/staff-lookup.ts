import { prisma } from "@/lib/db";
import { LEGACY_IMPLIED, ROLE_PERMISSIONS, STAFF_ROLES, type Permission, type StaffRoleName } from "@/lib/permissions";

/** Everyone who currently holds a permission, by explicit grant or by legacy role. */
export async function usersWithPermission(permission: Permission) {
  const roles = STAFF_ROLES.filter((r) => ROLE_PERMISSIONS[r].has(permission)) as StaffRoleName[];
  const legacy = Object.entries(LEGACY_IMPLIED)
    .filter(([, implied]) => implied.some((r) => roles.includes(r)))
    .map(([legacyRole]) => legacyRole);
  return prisma.user.findMany({
    where: {
      status: { notIn: ["SUSPENDED", "DEACTIVATED", "ARCHIVED"] },
      OR: [{ staffRoles: { some: { role: { in: roles } } } }, { role: { in: legacy as never } }],
    },
    select: { id: true, name: true, email: true },
  });
}

export async function notifyUsers(userIds: string[], n: { kind: string; title: string; body?: string; href?: string }) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return;
  // Some records name a non-user author (seeded content says "seed"); skip ids with no account.
  const existing = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (!existing.length) return;
  await prisma.notification.createMany({ data: existing.map(({ id: userId }) => ({ userId, ...n })) });
}

export async function notifyPermission(permission: Permission, n: { kind: string; title: string; body?: string; href?: string }, exceptUserId?: string) {
  const users = await usersWithPermission(permission);
  await notifyUsers(users.map((u) => u.id).filter((id) => id !== exceptUserId), n);
}
