"use server";

import { revalidatePath } from "next/cache";
import type { AccountStatus, EnrolmentState } from "@prisma/client";
import { requireActor } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import * as subs from "@/lib/services/people/subscribers";
import { requestApproval } from "@/lib/services/approvals";
import { bool, opt, str } from "./_form";

const refresh = (userId?: string) => {
  revalidatePath("/admin/subscribers", "layout");
  if (userId) revalidatePath(`/admin/subscribers/${userId}`);
};

export async function grantEnrolmentAction(fd: FormData) {
  return attempt(async () => {
    const until = opt(fd, "expiresAt");
    await subs.grantEnrolment(await requireActor(), str(fd, "userId"), str(fd, "programId"), { complimentary: bool(fd, "complimentary"), expiresAt: until ? new Date(until) : null });
    refresh(str(fd, "userId"));
  });
}

export async function setStatusAction(fd: FormData) {
  return attempt(async () => {
    await subs.setStatus(await requireActor(), str(fd, "userId"), str(fd, "status") as AccountStatus, str(fd, "reason"));
    refresh(str(fd, "userId"));
  });
}

export async function editProfileAction(fd: FormData) {
  return attempt(async () => {
    await subs.editProfile(await requireActor(), str(fd, "userId"), { name: str(fd, "name"), country: opt(fd, "country"), timezone: opt(fd, "timezone"), currentRole: opt(fd, "currentRole"), phone: opt(fd, "phone") });
    refresh(str(fd, "userId"));
  });
}

export async function enrolmentStateAction(fd: FormData) {
  return attempt(async () => {
    await subs.setEnrolmentState(await requireActor(), str(fd, "enrolmentId"), str(fd, "state") as EnrolmentState, str(fd, "reason"));
    refresh(opt(fd, "userId") ?? undefined);
  });
}

export async function extendAccessAction(fd: FormData) {
  return attempt(async () => {
    const until = opt(fd, "until");
    await subs.extendAccess(await requireActor(), str(fd, "enrolmentId"), until ? new Date(until) : null, str(fd, "reason"));
    refresh(opt(fd, "userId") ?? undefined);
  });
}

export async function addNoteAction(fd: FormData) {
  return attempt(async () => {
    await subs.addNote(await requireActor(), str(fd, "userId"), str(fd, "body"));
    refresh(str(fd, "userId"));
  });
}

export async function resetAuthAction(fd: FormData) {
  return attempt(async () => {
    await subs.resetAuthentication(await requireActor(), str(fd, "userId"), str(fd, "reason"));
    refresh(str(fd, "userId"));
  });
}

export async function resendVerificationAction(fd: FormData) {
  return attempt(async () => {
    await subs.resendVerification(await requireActor(), str(fd, "userId"));
  });
}

export async function inviteAction(fd: FormData) {
  return attempt(async () => {
    const n = await subs.invite(await requireActor(), str(fd, "emails").split(/[\s,;]+/), opt(fd, "orgId"));
    refresh();
    if (opt(fd, "orgId")) revalidatePath(`/admin/organisations/${opt(fd, "orgId")}`);
    return { invited: n };
  });
}

export async function requestProgressResetAction(fd: FormData) {
  return attempt(async () => {
    await requestApproval(await requireActor(), "PROGRESS_RESET", { userId: str(fd, "userId"), programId: str(fd, "programId") }, str(fd, "reason"));
    refresh(str(fd, "userId"));
  });
}

export async function requestExportApprovalAction(fd: FormData) {
  return attempt(async () => {
    await requestApproval(await requireActor(), "DATA_EXPORT", { report: "subscribers", filters: {}, rowCount: Number(str(fd, "rowCount") || 0) }, str(fd, "reason"));
  });
}

export async function resolvePrivacyAction(fd: FormData) {
  return attempt(async () => {
    await subs.resolvePrivacyRequest(await requireActor(), str(fd, "id"), str(fd, "outcome") as "COMPLETED" | "REJECTED" | "IN_REVIEW", str(fd, "resolution"));
    revalidatePath("/admin/privacy");
  });
}

export async function openPrivacyRequestAction(fd: FormData) {
  return attempt(async () => {
    await subs.openPrivacyRequest(await requireActor(), str(fd, "kind") as "ACCESS" | "DELETION" | "CORRECTION", str(fd, "detail"));
    revalidatePath("/account");
  });
}

export async function acceptInvitationAction(fd: FormData) {
  return attempt(async () => {
    await subs.acceptInvitation(await requireActor(), str(fd, "token"));
    revalidatePath("/academy", "layout");
    return { href: "/academy" };
  });
}
