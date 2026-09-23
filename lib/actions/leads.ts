"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/rbac";
import type { LeadStage } from "@prisma/client";

/**
 * Every enquiry becomes a scored lead. The scoring rules live here rather than in the CRM
 * UI so that a lead created from the contact form, from a brochure download or from a
 * mentoring booking is scored the same way.
 *
 * Phase 5 adds the pipeline and behavioural tracking. Phase 2 only needs capture, ownership
 * and a first score, so nothing is lost when the CRM lands.
 */

export const LEAD_POINTS = {
  brochure_download: 10,
  pricing_view: 8,
  mentoring_booked: 30,
  whatsapp_reply: 20,
  purchase: 100,
  contact_form: 15,
} as const;

export type LeadSignal = keyof typeof LEAD_POINTS;

const ContactInput = z.object({
  name: z.string().trim().min(2, "Tell me your name.").max(120),
  email: z.string().trim().email("That email address does not look right."),
  role: z.string().trim().max(120).optional(),
  interest: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, "A sentence or two about what you are trying to move.").max(4000),
});

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string; field?: string };

/**
 * Public. Rate-limited by the platform edge rather than here; this only guards content.
 *
 * Deliberately never reveals whether an address is already known — the response is the same
 * for a new lead and a returning one.
 */
export async function submitContact(formData: FormData): Promise<ContactResult> {
  const parsed = ContactInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role") || undefined,
    interest: formData.get("interest") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: String(first.path[0] ?? "") };
  }

  const input = parsed.data;

  // Never let an operational document or a patient identifier through a public form.
  if (/\b\d{9,}\b/.test(input.message)) {
    return {
      ok: false,
      field: "message",
      error:
        "That looks like it contains an account or member number. Remove any identifiers before sending.",
    };
  }

  try {
    const head = await headers();

    // Email is not unique on Lead — the same person may legitimately enquire more than
    // once, and a second enquiry is a stronger signal, not a duplicate to be discarded.
    // So: update the existing record and add to its score, or create a new one.
    const existing = await prisma.lead.findFirst({
      where: { email: input.email },
      orderBy: { createdAt: "desc" },
    });

    const lead = existing
      ? await prisma.lead.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            currentRole: input.role,
            interestedIn: input.interest,
            notes: input.message,
            score: { increment: LEAD_POINTS.contact_form },
            lastContactAt: new Date(),
          },
        })
      : await prisma.lead.create({
          data: {
            name: input.name,
            email: input.email,
            currentRole: input.role,
            interestedIn: input.interest,
            notes: input.message,
            source: "website",
            score: LEAD_POINTS.contact_form,
            lastContactAt: new Date(),
          },
        });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        kind: "contact_form",
        detail: input.interest ?? null,
        points: LEAD_POINTS.contact_form,
      },
    });

    await prisma.event.create({
      data: {
        name: "contact_form_submitted",
        props: { interest: input.interest ?? null },
        path: "/contact",
      },
    });

    await audit({
      action: "create",
      entity: "Lead",
      entityId: lead.id,
      after: { email: lead.email, source: lead.source, score: lead.score },
      ip: head.get("x-forwarded-for"),
      userAgent: head.get("user-agent"),
    });

    revalidatePath("/admin/leads");
    return { ok: true };
  } catch (error) {
    console.error("[submitContact] failed", error);
    return {
      ok: false,
      error: "That did not send. Try again, or reach us on WhatsApp.",
    };
  }
}

/** Admin only. Moves a lead along the pipeline and records who moved it. */
export async function setLeadStage(leadId: string, stage: LeadStage) {
  const admin = await requireAdmin();

  const before = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!before) throw new Error("That lead no longer exists.");

  const after = await prisma.lead.update({
    where: { id: leadId },
    data: { stage, lastContactAt: new Date() },
  });

  await audit({
    actorId: admin.id,
    action: "update",
    entity: "Lead",
    entityId: leadId,
    before: { stage: before.stage },
    after: { stage: after.stage },
  });

  revalidatePath("/admin/leads");
}

/** Admin only. Claims a lead. */
export async function assignLead(leadId: string, ownerId: string | null) {
  const admin = await requireAdmin();

  await prisma.lead.update({ where: { id: leadId }, data: { ownerId } });

  await audit({
    actorId: admin.id,
    action: "assign",
    entity: "Lead",
    entityId: leadId,
    after: { ownerId },
  });

  revalidatePath("/admin/leads");
}
