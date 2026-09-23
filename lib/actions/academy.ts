"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/rbac";

/**
 * Enrolment and progress.
 *
 * Enrolment is granted by an admin here rather than by a payment webhook. That is not a
 * placeholder for Phase 1 — manual enrolment is a permanent requirement for corporate
 * cohorts, comped seats and support recovery. Phase 1 adds a second path into the same
 * function; it does not replace this one.
 */

export async function grantEnrolment(userId: string, programId: string) {
  const admin = await requireAdmin();

  const existing = await prisma.enrolment.findUnique({
    where: { userId_programId: { userId, programId } },
  });
  if (existing) {
    return { ok: false as const, error: "That person is already enrolled on this program." };
  }

  const enrolment = await prisma.enrolment.create({
    data: { userId, programId },
    include: { program: { select: { name: true } } },
  });

  await audit({
    actorId: admin.id,
    action: "enrol",
    entity: "Enrolment",
    entityId: enrolment.id,
    after: { userId, programId, program: enrolment.program.name, grantedBy: "admin" },
  });

  await prisma.notification.create({
    data: {
      userId,
      kind: "enrolment",
      title: `You have access to ${enrolment.program.name}`,
      body: "It is in your academy now. Start whenever you are ready.",
      href: "/academy",
    },
  });

  revalidatePath("/admin/students");
  revalidatePath("/academy");
  return { ok: true as const };
}

export async function revokeEnrolment(enrolmentId: string, reason: string) {
  const admin = await requireAdmin();

  const before = await prisma.enrolment.findUnique({ where: { id: enrolmentId } });
  if (!before) return { ok: false as const, error: "That enrolment no longer exists." };

  await prisma.enrolment.update({
    where: { id: enrolmentId },
    data: { state: "REFUNDED" },
  });

  await audit({
    actorId: admin.id,
    action: "update",
    entity: "Enrolment",
    entityId: enrolmentId,
    before: { state: before.state },
    after: { state: "REFUNDED", reason },
  });

  revalidatePath("/admin/students");
  revalidatePath("/academy");
  return { ok: true as const };
}

/**
 * Marks a lesson complete for the signed-in user. Idempotent: calling it twice does not
 * move the completion timestamp, so a double-click cannot rewrite history.
 */
export async function completeLesson(lessonId: string) {
  const user = await requireUser();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, module: { select: { programId: true } } },
  });
  if (!lesson) return { ok: false as const, error: "That lesson no longer exists." };

  // Access check: you can only progress through something you are enrolled on.
  const enrolment = await prisma.enrolment.findUnique({
    where: { userId_programId: { userId: user.id, programId: lesson.module.programId } },
  });
  if (!enrolment || enrolment.state !== "ACTIVE") {
    return { ok: false as const, error: "You are not enrolled on this program." };
  }

  const existing = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  if (existing?.completedAt) {
    return { ok: true as const, alreadyDone: true };
  }

  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { completedAt: new Date() },
    create: { userId: user.id, lessonId, completedAt: new Date() },
  });

  await audit({
    actorId: user.id,
    action: "update",
    entity: "Progress",
    entityId: lessonId,
    after: { completed: true },
  });

  revalidatePath("/academy");
  return { ok: true as const, alreadyDone: false };
}

export async function reopenLesson(lessonId: string) {
  const user = await requireUser();

  await prisma.progress.updateMany({
    where: { userId: user.id, lessonId },
    data: { completedAt: null },
  });

  await audit({
    actorId: user.id,
    action: "update",
    entity: "Progress",
    entityId: lessonId,
    after: { completed: false },
  });

  revalidatePath("/academy");
  return { ok: true as const };
}
