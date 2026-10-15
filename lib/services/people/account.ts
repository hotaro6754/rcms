import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { Actor } from "@/lib/actor";

/** Changes a person makes to their own account. Role and status are never editable here. */

const OwnProfile = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  country: z.string().trim().max(80).optional().nullable(),
  timezone: z.string().trim().max(60).optional().nullable(),
  currentRole: z.string().trim().max(120).optional().nullable(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces and + only.")
    .optional()
    .nullable(),
});

export async function updateOwnProfile(actor: Actor, input: unknown) {
  const data = OwnProfile.parse(input);
  await prisma.user.update({ where: { id: actor.id }, data });
  await audit({ actorId: actor.id, action: "update", entity: "User", entityId: actor.id, after: { fields: Object.keys(data), via: "self" } });
}

export async function setMarketingConsent(actor: Actor, granted: boolean) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: actor.id }, data: { marketingOptIn: granted } }),
    prisma.consentRecord.create({ data: { userId: actor.id, kind: "marketing", granted, version: process.env.TERMS_VERSION ?? "2026-10" } }),
  ]);
  await audit({ actorId: actor.id, action: "update", entity: "ConsentRecord", entityId: actor.id, after: { marketing: granted } });
}
