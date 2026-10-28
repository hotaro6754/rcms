import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";

/**
 * Plans and pricing (blueprint §8.1). Products are created inactive with an initial price;
 * putting one on sale needs price-approval authority. A price change on an existing product
 * always goes through an approval request with an effective date (lib/services/approvals.ts).
 */

const ProductInput = z.object({
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  kind: z.enum(["PROGRAM", "TRACK", "SUBSCRIPTION", "MENTORING", "CORPORATE"]),
  programId: z.string().trim().optional().nullable(),
  levelId: z.string().trim().optional().nullable(),
  includes: z.array(z.string()).default([]),
  interval: z.enum(["MONTH", "YEAR"]).optional().nullable(),
  trialDays: z.coerce.number().int().min(0).max(90).default(0),
  graceDays: z.coerce.number().int().min(0).max(60).default(0),
  taxPercent: z.coerce.number().int().min(0).max(28).default(0),
});

export async function createProduct(actor: Actor, input: unknown, amountRupees: number) {
  await assertCan(actor, "product.manage");
  const data = ProductInput.parse(input);
  if (!Number.isFinite(amountRupees) || amountRupees < 0) throw new ServiceError("Enter a price in rupees.");
  if (data.kind === "SUBSCRIPTION" && !data.interval) throw new ServiceError("A subscription needs a billing interval.");
  if (data.kind === "PROGRAM" && !data.programId) throw new ServiceError("Choose the course this product sells.");
  const sku = `${data.kind.toLowerCase()}-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`;
  const product = await prisma.product.create({ data: { ...data, sku, amount: Math.round(amountRupees * 100), active: false } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "Product", entityId: product.id, after: { name: product.name, amount: product.amount, kind: product.kind } });
  return product;
}

export async function updateProductDetails(actor: Actor, id: string, input: { name: string; description?: string | null; trialDays?: number; graceDays?: number; taxPercent?: number }) {
  await assertCan(actor, "product.manage");
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) throw new ServiceError("That product no longer exists.");
  const data = ProductInput.pick({ name: true, description: true, trialDays: true, graceDays: true, taxPercent: true }).parse(input);
  await prisma.product.update({ where: { id }, data });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "Product", entityId: id, before: { name: before.name, taxPercent: before.taxPercent }, after: data });
}

export async function setProductActive(actor: Actor, id: string, active: boolean) {
  await assertCan(actor, active ? "price.approve" : "product.manage", { entity: "Product", id });
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) throw new ServiceError("That product no longer exists.");
  await prisma.product.update({ where: { id }, data: { active } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: active ? "publish" : "unpublish", entity: "Product", entityId: id, after: { active, amount: before.amount } });
}

const CouponInput = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,24}$/, "Use 4–24 letters, digits or dashes."),
  percentOff: z.coerce.number().int().min(1).max(100).optional().nullable(),
  amountOff: z.coerce.number().min(1).optional().nullable(),
  maxRedemptions: z.coerce.number().int().min(1).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export async function createCoupon(actor: Actor, input: unknown) {
  await assertCan(actor, "coupon.manage");
  const d = CouponInput.parse(input);
  if (!d.percentOff === !d.amountOff) throw new ServiceError("Give either a percentage or a fixed amount off, not both.");
  const coupon = await prisma.coupon.create({ data: { code: d.code, percentOff: d.percentOff ?? null, amountOff: d.amountOff ? Math.round(d.amountOff * 100) : null, maxRedemptions: d.maxRedemptions ?? null, expiresAt: d.expiresAt ?? null } }).catch(() => {
    throw new ServiceError("That code is already in use.");
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "Coupon", entityId: coupon.id, after: { code: coupon.code, percentOff: coupon.percentOff, amountOff: coupon.amountOff } });
  return coupon;
}

export async function setCouponActive(actor: Actor, id: string, active: boolean) {
  await assertCan(actor, "coupon.manage");
  await prisma.coupon.update({ where: { id }, data: { active } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "Coupon", entityId: id, after: { active } });
}
