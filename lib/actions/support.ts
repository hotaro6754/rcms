"use server";

import { revalidatePath } from "next/cache";
import type { SupportStatus } from "@prisma/client";
import { requireActor } from "@/lib/actor";
import { attempt, ServiceError } from "@/lib/errors";
import * as support from "@/lib/services/support/tickets";
import * as routing from "@/lib/services/support/routing";
import { bool, opt, str } from "./_form";

const file = (fd: FormData, name: string) => {
  const f = fd.get(name);
  return f instanceof File && f.size > 0 ? f : null;
};

const refresh = (id?: string) => {
  revalidatePath("/support", "layout");
  revalidatePath("/admin/support", "layout");
  if (id) {
    revalidatePath(`/support/${id}`);
    revalidatePath(`/admin/support/${id}`);
  }
};

const SOURCES = new Set(["WEB_FORM", "CHAT", "COURSE_PAGE", "ACCOUNT"]);

export async function openTicketAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const channel = str(fd, "channel") || "TICKET";
    const source = SOURCES.has(str(fd, "source")) ? str(fd, "source") : channel === "CHAT" ? "CHAT" : "WEB_FORM";
    const { ticket, masked } = await support.openTicket(actor, {
      subject: str(fd, "subject"),
      category: str(fd, "category"),
      body: str(fd, "body"),
      channel,
      source,
      programId: str(fd, "programId"),
      relatedRef: str(fd, "relatedRef"),
      pageContext: str(fd, "pageContext"),
      impact: str(fd, "impact"),
      urgency: str(fd, "urgency"),
    });
    const f = file(fd, "attachment");
    let attachmentError = "";
    if (f) {
      try {
        await support.addAttachment(actor, ticket.id, f);
      } catch (e) {
        attachmentError = `&file=${encodeURIComponent((e as Error).message)}`;
      }
    }
    refresh();
    return { id: ticket.id, href: `/support/${ticket.id}?new=1${masked ? "&masked=1" : ""}${attachmentError}` };
  });
}

export async function attachFileAction(fd: FormData) {
  return attempt(async () => {
    const id = str(fd, "ticketId");
    const f = file(fd, "attachment");
    if (!f) throw new ServiceError("Choose a file to upload.");
    await support.addAttachment(await requireActor(), id, f);
    refresh(id);
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
      tags: fd.has("tags") ? str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      resolutionSummary: opt(fd, "resolutionSummary") ?? undefined,
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

export async function setTeamAction(fd: FormData) {
  return attempt(async () => {
    await support.setTeam(await requireActor(), str(fd, "ticketId"), str(fd, "teamId"));
    refresh(str(fd, "ticketId"));
  });
}

// ---------------------------------------------------------------------------
// Configuration (support leads)
// ---------------------------------------------------------------------------

const refreshSettings = () => revalidatePath("/admin/support/settings");

export async function saveTeamAction(fd: FormData) {
  return attempt(async () => {
    await routing.saveTeam(await requireActor(), opt(fd, "id"), { key: str(fd, "key"), name: str(fd, "name"), description: opt(fd, "description"), active: bool(fd, "active"), autoAssign: bool(fd, "autoAssign") });
    refreshSettings();
  });
}

export async function setTeamMemberAction(fd: FormData) {
  return attempt(async () => {
    await routing.setTeamMember(await requireActor(), str(fd, "teamId"), str(fd, "userId"), { isLead: bool(fd, "isLead"), available: bool(fd, "available"), maxOpen: str(fd, "maxOpen") || 15 });
    refreshSettings();
  });
}

export async function removeTeamMemberAction(fd: FormData) {
  return attempt(async () => {
    await routing.removeTeamMember(await requireActor(), str(fd, "memberId"));
    refreshSettings();
  });
}

export async function setAvailabilityAction(fd: FormData) {
  return attempt(async () => {
    await routing.setMyAvailability(await requireActor(), bool(fd, "available"));
    revalidatePath("/admin/support", "layout");
  });
}

export async function saveCategorySettingAction(fd: FormData) {
  return attempt(async () => {
    await routing.saveCategorySetting(await requireActor(), str(fd, "category") as never, { label: opt(fd, "label"), description: opt(fd, "description"), active: bool(fd, "active"), teamId: opt(fd, "teamId"), defaultPriority: str(fd, "defaultPriority") });
    refreshSettings();
  });
}

export async function saveSlaAction(fd: FormData) {
  return attempt(async () => {
    const hours = (n: string) => Math.round(Number(str(fd, n)) * 60);
    await routing.saveSlaPolicy(await requireActor(), str(fd, "priority") as never, { firstResponseMinutes: hours("firstResponseHours"), resolutionMinutes: hours("resolutionHours"), businessHours: bool(fd, "businessHours") });
    refreshSettings();
  });
}

export async function saveCalendarAction(fd: FormData) {
  return attempt(async () => {
    await routing.saveCalendar(await requireActor(), { utcOffsetMinutes: str(fd, "utcOffsetMinutes"), workDays: fd.getAll("workDays").map(String), start: str(fd, "start"), end: str(fd, "end") });
    refreshSettings();
  });
}
