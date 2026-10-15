"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { attempt, ServiceError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { cancelApproval, decideApproval, requestApproval } from "@/lib/services/approvals";
import * as corp from "@/lib/services/people/corporate";
import { bool, opt, str } from "./_form";

export async function decideApprovalAction(fd: FormData) {
  return attempt(async () => {
    await decideApproval(await requireActor(), str(fd, "id"), str(fd, "decision") === "approve", opt(fd, "note") ?? undefined);
    revalidatePath("/admin", "layout");
  });
}

export async function cancelApprovalAction(fd: FormData) {
  return attempt(async () => {
    await cancelApproval(await requireActor(), str(fd, "id"));
    revalidatePath("/admin/approvals");
  });
}

export async function requestRoleChangeAction(fd: FormData) {
  return attempt(async () => {
    let userId = opt(fd, "userId");
    if (!userId) {
      const user = await prisma.user.findUnique({ where: { email: str(fd, "email").trim().toLowerCase() }, select: { id: true } });
      if (!user) throw new ServiceError("No account with that email. The person must register first.");
      userId = user.id;
    }
    await requestApproval(await requireActor(), "ROLE_CHANGE", { userId, role: str(fd, "role"), action: str(fd, "action") }, str(fd, "reason"));
    revalidatePath("/admin/users");
  });
}

export async function requestSettingChangeAction(fd: FormData) {
  return attempt(async () => {
    await requestApproval(await requireActor(), "SECURITY_SETTING", { key: str(fd, "key"), value: str(fd, "value") }, str(fd, "reason"));
    revalidatePath("/admin/settings");
  });
}

const orgInput = (fd: FormData) => ({ name: str(fd, "name"), seats: str(fd, "seats") || 0, billingEmail: opt(fd, "billingEmail"), gstin: opt(fd, "gstin"), contractStart: opt(fd, "contractStart"), contractEnd: opt(fd, "contractEnd") });
const refreshOrg = (id?: string | null) => {
  revalidatePath("/admin/organisations");
  if (id) revalidatePath(`/admin/organisations/${id}`);
};

export async function createOrganisationAction(fd: FormData) {
  return attempt(async () => {
    const org = await corp.createOrganisation(await requireActor(), orgInput(fd));
    refreshOrg();
    return { id: org.id, href: `/admin/organisations/${org.id}` };
  });
}

export async function updateOrganisationAction(fd: FormData) {
  return attempt(async () => {
    await corp.updateOrganisation(await requireActor(), str(fd, "id"), orgInput(fd));
    refreshOrg(str(fd, "id"));
  });
}

export async function organisationActiveAction(fd: FormData) {
  return attempt(async () => {
    await corp.setOrganisationActive(await requireActor(), str(fd, "id"), bool(fd, "active"));
    refreshOrg(str(fd, "id"));
  });
}

export async function addMemberAction(fd: FormData) {
  return attempt(async () => {
    await corp.addMember(await requireActor(), str(fd, "orgId"), str(fd, "email"), bool(fd, "isManager"));
    refreshOrg(str(fd, "orgId"));
  });
}

export async function removeMemberAction(fd: FormData) {
  return attempt(async () => {
    await corp.removeMember(await requireActor(), str(fd, "id"));
    refreshOrg(opt(fd, "orgId"));
  });
}

export async function createGroupAction(fd: FormData) {
  return attempt(async () => {
    await corp.createGroup(await requireActor(), str(fd, "orgId"), str(fd, "name"));
    refreshOrg(str(fd, "orgId"));
  });
}

export async function deleteGroupAction(fd: FormData) {
  return attempt(async () => {
    await corp.deleteGroup(await requireActor(), str(fd, "id"));
    refreshOrg(opt(fd, "orgId"));
  });
}

export async function groupMembersAction(fd: FormData) {
  return attempt(async () => {
    const n = await corp.setGroupMembers(await requireActor(), str(fd, "id"), fd.getAll("memberId").map(String).filter(Boolean));
    refreshOrg(opt(fd, "orgId"));
    return { granted: n };
  });
}

export async function assignGroupCourseAction(fd: FormData) {
  return attempt(async () => {
    const n = await corp.assignGroupCourse(await requireActor(), str(fd, "id"), str(fd, "programId"));
    refreshOrg(opt(fd, "orgId"));
    return { granted: n };
  });
}

export async function unassignGroupCourseAction(fd: FormData) {
  return attempt(async () => {
    await corp.unassignGroupCourse(await requireActor(), str(fd, "id"), str(fd, "programId"));
    refreshOrg(opt(fd, "orgId"));
  });
}
