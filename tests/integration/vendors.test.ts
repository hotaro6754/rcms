import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { loadActor, type Actor } from "@/lib/actor";
import { AuthorisationError } from "@/lib/errors";
import { decideApproval, requestApproval } from "@/lib/services/approvals";
import * as vendors from "@/lib/services/vendors/vendors";
import { makeUser, resetDb, staff } from "../helpers";

beforeEach(resetDb);

const ALL_CHECKS = Object.fromEntries(vendors.ONBOARDING.map(([k]) => [k, true]));

/** An active vendor with one portal contact. */
async function activeVendor(manager: Actor, name: string) {
  const v = await vendors.createVendor(manager, { legalName: name, type: "CONTENT_AUTHOR", accessExpiresAt: "2030-01-01" });
  await prisma.vendor.update({ where: { id: v.id }, data: { accessExpiresAt: new Date("2030-01-01") } });
  await vendors.setChecklist(manager, v.id, ALL_CHECKS);
  for (const s of ["APPROVED", "CONTRACTED", "ACTIVE"] as const) await vendors.setVendorStatus(manager, v.id, s, "Onboarding complete");
  const contact = await makeUser({ name: `${name} contact` });
  await vendors.linkVendorUser(manager, v.id, contact.email);
  return { vendor: v, contact: (await loadActor(contact.id))! };
}

describe("vendor isolation", () => {
  it("lets a vendor see and act on only their own records", async () => {
    const manager = await staff("VENDOR_MANAGER");
    const a = await activeVendor(manager, "Alpha Authors");
    const b = await activeVendor(manager, "Beta Studio");
    const delA = await vendors.assignDeliverable(manager, a.vendor.id, { title: "Module 2 draft", fee: 5000 });
    const delB = await vendors.assignDeliverable(manager, b.vendor.id, { title: "Video edit", fee: 8000 });

    const overview = await vendors.portalOverview(a.contact);
    expect(overview.deliverables.map((d) => d.id)).toEqual([delA.id]);
    // Payout references never reach the portal; only the last four digits do.
    expect(overview.vendor).not.toHaveProperty("payoutReference");

    await expect(vendors.portalDeliverable(a.contact, delB.id)).rejects.toBeInstanceOf(AuthorisationError);
    await expect(vendors.submitDeliverable(a.contact, delB.id, { note: "mine now" })).rejects.toBeInstanceOf(AuthorisationError);
    await expect(vendors.commentDeliverable(a.contact, delB.id, "hello")).rejects.toBeInstanceOf(AuthorisationError);
    await expect(vendors.submitInvoice(a.contact, { number: "A-1", amount: 80, deliverableId: delB.id })).rejects.toBeInstanceOf(AuthorisationError);
    expect(await prisma.auditLog.count({ where: { entity: "Deliverable", outcome: "denied", actorId: a.contact.id } })).toBeGreaterThan(0);

    // A vendor contact holds no admin permission at all.
    expect(a.contact.permissions.size).toBe(0);
    await expect(vendors.createVendor(a.contact, { legalName: "Gamma", type: "TECHNOLOGY" })).rejects.toBeInstanceOf(AuthorisationError);
    await expect(vendors.validateInvoice(a.contact, "x", true)).rejects.toBeInstanceOf(AuthorisationError);
  });

  it("refuses staff accounts as vendor contacts and ends access on offboarding", async () => {
    const manager = await staff("VENDOR_MANAGER");
    const { vendor, contact } = await activeVendor(manager, "Alpha Authors");
    const agent = await staff("SUPPORT_AGENT");
    await expect(vendors.linkVendorUser(manager, vendor.id, agent.email)).rejects.toThrow(/Staff accounts/);

    await prisma.session.create({ data: { userId: contact.id, token: "t-vendor", expiresAt: new Date(Date.now() + 86400_000) } });
    await vendors.setVendorStatus(manager, vendor.id, "OFFBOARDING", "Contract ended");
    await vendors.setVendorStatus(manager, vendor.id, "OFFBOARDED", "Contract ended");
    expect(await prisma.session.count({ where: { userId: contact.id } })).toBe(0);
    await expect(vendors.portalOverview(contact)).rejects.toThrow(/access has ended/);
  });

  it("will not approve a vendor with incomplete onboarding", async () => {
    const manager = await staff("VENDOR_MANAGER");
    const v = await vendors.createVendor(manager, { legalName: "Hasty Ltd", type: "INSTRUCTOR" });
    await expect(vendors.setVendorStatus(manager, v.id, "APPROVED", "Looks fine")).rejects.toThrow(/Onboarding is incomplete/);
    await expect(vendors.setVendorStatus(await staff("CONTENT_ADMIN"), v.id, "DUE_DILIGENCE", "x")).rejects.toBeInstanceOf(AuthorisationError);
  });
});

describe("vendor payments", () => {
  async function invoiceReadyForApproval() {
    const manager = await staff("VENDOR_MANAGER");
    const { vendor, contact } = await activeVendor(manager, "Alpha Authors");
    const del = await vendors.assignDeliverable(manager, vendor.id, { title: "Module 2 draft", fee: 5000 });
    await vendors.submitDeliverable(contact, del.id, { note: "Draft attached as link", link: "https://example.test/draft" });
    await vendors.reviewDeliverable(manager, del.id, "ACCEPTED", "Good work", 4);
    const inv = await vendors.submitInvoice(contact, { number: "AA-001", amount: 5000, deliverableId: del.id });
    return { manager, vendor, contact, inv };
  }

  it("never lets the person who changed payout details approve the payment", async () => {
    const { manager, vendor, contact, inv } = await invoiceReadyForApproval();
    const finance = await staff("FINANCE_ADMIN");
    const finance2 = await staff("FINANCE_ADMIN");
    const director = await staff("ACADEMY_DIRECTOR");

    // Payout change: requested by the vendor manager, approved by finance.
    await expect(requestApproval(contact, "VENDOR_PAYOUT_CHANGE", { vendorId: vendor.id, payoutReference: "fa_TEST01", payoutLast4: "1234" }, "New bank account")).rejects.toBeInstanceOf(AuthorisationError);
    const req = await requestApproval(manager, "VENDOR_PAYOUT_CHANGE", { vendorId: vendor.id, payoutReference: "fa_TEST01", payoutLast4: "1234" }, "Vendor changed bank; verified by phone");
    await expect(decideApproval(manager, req.id, true)).rejects.toThrow();
    await decideApproval(finance, req.id, true);
    expect((await prisma.vendor.findUniqueOrThrow({ where: { id: vendor.id } })).payoutLast4).toBe("1234");

    await vendors.validateInvoice(finance2, inv.id, true);
    // The payout-change approver holds no settlement.approve, and a super admin who requested the change is blocked too.
    await expect(vendors.approveSettlement(finance, inv.id)).rejects.toBeInstanceOf(AuthorisationError);
    const owner = await makeUser({ role: "OWNER" });
    await prisma.vendor.update({ where: { id: vendor.id }, data: { payoutChangedById: owner.id } });
    await expect(vendors.approveSettlement(owner, inv.id)).rejects.toThrow(/payout details/);

    await vendors.approveSettlement(director, inv.id);
    await expect(vendors.recordSettlementPayment(director, inv.id, "UTR-0001")).rejects.toBeInstanceOf(AuthorisationError);
    await vendors.recordSettlementPayment(finance2, inv.id, "UTR-0001");
    await vendors.reconcileSettlement(finance, inv.id);
    expect((await prisma.vendorInvoice.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("RECONCILED");
  });

  it("requires a different person to validate and approve, and caps the invoice at the agreed fee", async () => {
    const { vendor, contact } = await invoiceReadyForApproval();
    await prisma.vendor.update({ where: { id: vendor.id }, data: { payoutReference: "fa_X", payoutLast4: "9999" } });
    const owner = await makeUser({ role: "OWNER" });
    const inv = await prisma.vendorInvoice.findFirstOrThrow({ where: { vendorId: vendor.id } });
    await vendors.validateInvoice(owner, inv.id, true);
    await expect(vendors.approveSettlement(owner, inv.id)).rejects.toThrow(/different person/);

    const manager = await staff("VENDOR_MANAGER");
    const del2 = await vendors.assignDeliverable(manager, vendor.id, { title: "Quiz bank", fee: 1000 });
    await vendors.submitDeliverable(contact, del2.id, { note: "done" });
    await vendors.reviewDeliverable(manager, del2.id, "ACCEPTED", "ok");
    const big = await vendors.submitInvoice(contact, { number: "AA-002", amount: 5000, deliverableId: del2.id });
    await expect(vendors.validateInvoice(owner, big.id, true)).rejects.toThrow(/exceeds the agreed fee/);
  });
});
