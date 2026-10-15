"use server";

import { revalidatePath } from "next/cache";
import type { VendorStatus } from "@prisma/client";
import { requireActor, requireFreshSignIn } from "@/lib/actor";
import { attempt, ServiceError } from "@/lib/errors";
import * as vendors from "@/lib/services/vendors/vendors";
import { requestApproval } from "@/lib/services/approvals";
import { bool, opt, str } from "./_form";

const VENDOR_FIELDS = ["legalName", "tradingName", "type", "country", "contactName", "contactEmail", "services", "commercialModel", "riskRating", "complianceClass", "dataAccessClass", "contractStart", "contractEnd", "accessExpiresAt"];
const read = (fd: FormData) => Object.fromEntries(VENDOR_FIELDS.map((k) => [k, opt(fd, k)]));
const refresh = (id?: string) => {
  revalidatePath("/admin/vendors", "layout");
  if (id) revalidatePath(`/admin/vendors/${id}`);
  revalidatePath("/vendor", "layout");
  revalidatePath("/admin/finance/settlements");
};

export async function createVendorAction(fd: FormData) {
  return attempt(async () => {
    const v = await vendors.createVendor(await requireActor(), read(fd));
    refresh();
    return { id: v.id, href: `/admin/vendors/${v.id}` };
  });
}

export async function updateVendorAction(fd: FormData) {
  return attempt(async () => {
    await vendors.updateVendor(await requireActor(), str(fd, "id"), read(fd));
    refresh(str(fd, "id"));
  });
}

export async function checklistAction(fd: FormData) {
  return attempt(async () => {
    await vendors.setChecklist(await requireActor(), str(fd, "id"), Object.fromEntries(vendors.ONBOARDING.map(([k]) => [k, bool(fd, k)])));
    refresh(str(fd, "id"));
  });
}

export async function vendorStatusAction(fd: FormData) {
  return attempt(async () => {
    await vendors.setVendorStatus(await requireActor(), str(fd, "id"), str(fd, "status") as VendorStatus, str(fd, "reason"));
    refresh(str(fd, "id"));
  });
}

export async function linkVendorUserAction(fd: FormData) {
  return attempt(async () => {
    await vendors.linkVendorUser(await requireActor(), str(fd, "id"), str(fd, "email"));
    refresh(str(fd, "id"));
  });
}

export async function assignDeliverableAction(fd: FormData) {
  return attempt(async () => {
    await vendors.assignDeliverable(await requireActor(), str(fd, "vendorId"), { title: str(fd, "title"), description: opt(fd, "description"), dueDate: opt(fd, "dueDate"), fee: Number(str(fd, "fee") || 0), programId: opt(fd, "programId") });
    refresh(str(fd, "vendorId"));
  });
}

export async function reviewDeliverableAction(fd: FormData) {
  return attempt(async () => {
    const q = opt(fd, "qualityScore");
    await vendors.reviewDeliverable(await requireActor(), str(fd, "id"), str(fd, "decision") as "ACCEPTED" | "CHANGES_REQUESTED" | "REJECTED", str(fd, "comment"), q ? Number(q) : null);
    refresh(opt(fd, "vendorId") ?? undefined);
  });
}

export async function commentDeliverableAction(fd: FormData) {
  return attempt(async () => {
    await vendors.commentDeliverable(await requireActor(), str(fd, "id"), str(fd, "body"));
    refresh(opt(fd, "vendorId") ?? undefined);
    revalidatePath(`/vendor/deliverables/${str(fd, "id")}`);
  });
}

export async function submitDeliverableAction(fd: FormData) {
  return attempt(async () => {
    const file = fd.get("file");
    await vendors.submitDeliverable(await requireActor(), str(fd, "id"), { note: str(fd, "note"), link: str(fd, "link") }, file instanceof File ? file : null);
    refresh();
    revalidatePath(`/vendor/deliverables/${str(fd, "id")}`);
  });
}

export async function submitInvoiceAction(fd: FormData) {
  return attempt(async () => {
    const amount = Number(str(fd, "amount"));
    if (!Number.isFinite(amount) || amount <= 0) throw new ServiceError("Enter the invoice amount in rupees.");
    await vendors.submitInvoice(await requireActor(), { number: str(fd, "number"), amount, deliverableId: opt(fd, "deliverableId"), note: opt(fd, "note") });
    refresh();
  });
}

export async function portalProfileAction(fd: FormData) {
  return attempt(async () => {
    await vendors.updatePortalProfile(await requireActor(), { contactName: str(fd, "contactName"), contactEmail: str(fd, "contactEmail"), services: str(fd, "services") });
    refresh();
  });
}

export async function vendorPayoutRequestAction(fd: FormData) {
  return attempt(async () => {
    await requireFreshSignIn();
    const actor = await requireActor();
    const payload = { payoutReference: str(fd, "payoutReference"), payoutLast4: str(fd, "payoutLast4"), taxIdLast4: opt(fd, "taxIdLast4") };
    if (opt(fd, "vendorId")) await requestApproval(actor, "VENDOR_PAYOUT_CHANGE", { vendorId: str(fd, "vendorId"), ...payload }, str(fd, "reason"));
    else await vendors.requestPayoutChangeAsVendor(actor, { ...payload, reason: str(fd, "reason") });
    refresh(opt(fd, "vendorId") ?? undefined);
  });
}

export async function uploadVendorDocAction(fd: FormData) {
  return attempt(async () => {
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new ServiceError("Choose a file.");
    await vendors.uploadVendorDocument(await requireActor(), str(fd, "vendorId"), { title: str(fd, "title"), kind: str(fd, "kind"), expiresAt: opt(fd, "expiresAt"), visibleToVendor: fd.has("visibleToVendor") ? bool(fd, "visibleToVendor") : true }, file);
    refresh(str(fd, "vendorId"));
  });
}

export async function settlementAction(fd: FormData) {
  return attempt(async () => {
    if (["approve", "pay"].includes(str(fd, "op"))) await requireFreshSignIn();
    const actor = await requireActor();
    const id = str(fd, "id");
    switch (str(fd, "op")) {
      case "validate":
        await vendors.validateInvoice(actor, id, true);
        break;
      case "reject":
        await vendors.validateInvoice(actor, id, false, str(fd, "reason"));
        break;
      case "approve":
        await vendors.approveSettlement(actor, id);
        break;
      case "pay":
        await vendors.recordSettlementPayment(actor, id, str(fd, "paymentRef"));
        break;
      case "reconcile":
        await vendors.reconcileSettlement(actor, id);
        break;
      default:
        throw new ServiceError("Unknown step.");
    }
    refresh();
  });
}
