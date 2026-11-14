import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { asAdministrator } from "@/lib/account-creation";

/**
 * Two kinds of account: administrators and students. Administrators create either kind here
 * (web sign-up is closed before launch) and switch a person between the two. Every change is
 * audited; there is no second approver.
 */

const NewAccount = z.object({
  name: z.string().trim().min(2, "Enter the person's name.").max(120),
  email: z.string().trim().toLowerCase().email("That email address does not look right."),
  password: z.string().min(10, "Use at least 10 characters for the password.").max(128),
  kind: z.enum(["ADMIN", "STUDENT"]),
});

export async function createAccount(actor: Actor, input: unknown) {
  await assertCan(actor, "roles.approve");
  const p = NewAccount.parse(input);
  if (await prisma.user.findUnique({ where: { email: p.email }, select: { id: true } })) throw new ServiceError("An account with that email already exists.");
  await asAdministrator(() => auth.api.signUpEmail({ body: { email: p.email, password: p.password, name: p.name, acceptTerms: true } as { email: string; password: string; name: string } }));
  const user = await prisma.user.update({ where: { email: p.email }, data: { emailVerified: true, status: "ACTIVE" } });
  if (p.kind === "ADMIN") await prisma.staffRoleAssignment.create({ data: { userId: user.id, role: "SUPER_ADMIN", grantedById: actor.id, approvedById: actor.id } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "User", entityId: user.id, after: { email: p.email, kind: p.kind, via: "admin" } });
  return user;
}

export async function setAccountKind(actor: Actor, userId: string, kind: "ADMIN" | "STUDENT") {
  await assertCan(actor, "roles.approve");
  if (userId === actor.id) throw new ServiceError("You cannot change your own account type.");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true } });
  if (!user) throw new ServiceError("That account no longer exists.");
  if (kind === "ADMIN") {
    await prisma.staffRoleAssignment.upsert({ where: { userId_role: { userId, role: "SUPER_ADMIN" } }, create: { userId, role: "SUPER_ADMIN", grantedById: actor.id, approvedById: actor.id }, update: {} });
  } else {
    const otherAdmins = await prisma.user.count({ where: { id: { not: userId }, OR: [{ role: "OWNER" }, { staffRoles: { some: {} } }] } });
    if (!otherAdmins) throw new ServiceError("This would leave the platform without an administrator.");
    await prisma.$transaction([
      prisma.staffRoleAssignment.deleteMany({ where: { userId } }),
      prisma.user.update({ where: { id: userId }, data: { role: user.role === "OWNER" || user.role === "ADMIN" || user.role === "TRAINER" ? "STUDENT" : user.role } }),
      // End their sessions so the change applies at once.
      prisma.session.deleteMany({ where: { userId } }),
    ]);
  }
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "assign", entity: "User", entityId: userId, after: { kind, email: user.email } });
}
