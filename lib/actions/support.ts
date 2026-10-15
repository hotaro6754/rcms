"use server";

import { revalidatePath } from "next/cache";
import type { SupportStatus } from "@prisma/client";
import { requireActor } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import * as support from "@/lib/services/support/tickets";
import { bool, opt, str } from "./_form";

const refresh = (id?: string) => {
  revalidatePath("/support", "layout");
  revalidatePath("/admin/support", "layout");
  if (id) {
    revalidatePath(`/support/${id}`);
    revalidatePath(`/admin/support/${id}`);
  }
};

export async function openTicketAction(fd: FormData) {
  return attempt(async () => {
    const { ticket, masked } = await support.openTicket(await requireActor(), { subject: str(fd, "subject"), category: str(fd, "category"), body: str(fd, "body"), channel: str(fd, "channel") || "TICKET" });
    refresh();
    return { id: ticket.id, href: `/support/${ticket.id}${masked ? "?masked=1" : ""}` };
  });
}

export async function replyAction(fd: FormData) {
  return attempt(async () => {
    const id = str(fd, "ticketId");
    const res = await support.addMessage(await requireActor(), id, str(fd, "body"), { internal: bool(fd, "internal"), status: (opt(fd, "status") as SupportStatus | null) ?? undefined });
    refresh(id);
    return { ...res, message: res.masked ? "Sent. Something that looked like a card number or identifier was removed before it was stored." : undefined };
  });
}

export async function assignAction(fd: FormData) {
  return attempt(async () => {
    await support.assign(await requireActor(), str(fd, "ticketId"), opt(fd, "assigneeId"));
    refresh(str(fd, "ticketId"));
  });
}

export async function declineAction(fd: FormData) {
  return attempt(async () => {
    await support.decline(await requireActor(), str(fd, "ticketId"), str(fd, "reason"));
    refresh(str(fd, "ticketId"));
  });
}

export async function triageAction(fd: FormData) {
  return attempt(async () => {
    await support.triage(await requireActor(), str(fd, "ticketId"), {
      category: opt(fd, "category") ?? undefined,
      priority: opt(fd, "priority") ?? undefined,
      status: opt(fd, "status") ?? undefined,
      followUpAt: opt(fd, "followUpAt"),
      isComplaint: fd.has("isComplaint") ? bool(fd, "isComplaint") : undefined,
    });
    refresh(str(fd, "ticketId"));
  });
}

export async function escalateAction(fd: FormData) {
  return attempt(async () => {
    await support.escalate(await requireActor(), str(fd, "ticketId"), str(fd, "to") as keyof typeof support.ESCALATION, str(fd, "note"));
    refresh(str(fd, "ticketId"));
  });
}

export async function rateAction(fd: FormData) {
  return attempt(async () => {
    await support.rate(await requireActor(), str(fd, "ticketId"), Number(str(fd, "rating")), opt(fd, "feedback") ?? undefined);
    refresh(str(fd, "ticketId"));
  });
}

export async function endChatAction(fd: FormData) {
  return attempt(async () => {
    await support.endChat(await requireActor(), str(fd, "ticketId"));
    refresh(str(fd, "ticketId"));
  });
}

export async function saveTemplateAction(fd: FormData) {
  return attempt(async () => {
    await support.saveTemplate(await requireActor(), opt(fd, "id"), { title: str(fd, "title"), body: str(fd, "body"), category: opt(fd, "category") });
    revalidatePath("/admin/support/templates");
  });
}

export async function approveTemplateAction(fd: FormData) {
  return attempt(async () => {
    await support.approveTemplate(await requireActor(), str(fd, "id"), bool(fd, "approve"));
    revalidatePath("/admin/support/templates");
  });
}
