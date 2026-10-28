"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { attempt, ServiceError } from "@/lib/errors";
import { enrolFree, completeLesson, reopenLesson } from "@/lib/services/learning/progress";
import { startAttempt, saveAnswers, submitAttempt, uploadAnswerFile, gradeManually } from "@/lib/services/learning/attempts";
import { claimCertificate, issueCertificate, reissueCertificate, revokeCertificate } from "@/lib/services/learning/certificates";
import { verifyPath } from "@/lib/certificates";
import { json, opt, str } from "./_form";

/** Learner-side actions, and the staff actions that act on learner records. */

export async function enrolFreeAction(fd: FormData) {
  return attempt(async () => {
    const e = await enrolFree(await requireActor(), str(fd, "courseId"));
    revalidatePath("/academy", "layout");
    return { id: e.id, href: opt(fd, "next") ?? "/academy" };
  });
}

export async function completeLessonAction(lessonId: string) {
  return attempt(async () => {
    await completeLesson(await requireActor(), lessonId);
    revalidatePath("/academy", "layout");
  });
}

export async function reopenLessonAction(lessonId: string) {
  return attempt(async () => {
    await reopenLesson(await requireActor(), lessonId);
    revalidatePath("/academy", "layout");
  });
}

export async function startAttemptAction(fd: FormData) {
  return attempt(async () => {
    const id = await startAttempt(await requireActor(), str(fd, "quizId"));
    return { id, href: `/academy/attempts/${id}` };
  });
}

export async function saveAnswersAction(attemptId: string, answers: unknown) {
  return attempt(async () => {
    await saveAnswers(await requireActor(), attemptId, answers);
  });
}

export async function submitAttemptAction(attemptId: string, answers: unknown) {
  return attempt(async () => {
    const result = await submitAttempt(await requireActor(), attemptId, answers);
    revalidatePath("/academy", "layout");
    return { status: result.status };
  });
}

export async function uploadAnswerAction(fd: FormData) {
  return attempt(async () => {
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new ServiceError("Choose a file to upload.");
    return uploadAnswerFile(await requireActor(), str(fd, "attemptId"), str(fd, "questionId"), file);
  });
}

export async function claimCertificateAction(programId: string) {
  return attempt(async () => {
    const res = await claimCertificate(await requireActor(), programId);
    revalidatePath("/academy", "layout");
    revalidatePath("/certificates");
    return { serial: res.serial, href: verifyPath(res.serial) };
  });
}

export async function gradeAttemptAction(fd: FormData) {
  return attempt(async () => {
    const awards = json<Record<string, number>>(fd, "awards") ?? {};
    for (const [k, v] of fd.entries()) if (k.startsWith("award:")) awards[k.slice(6)] = Number(v);
    const res = await gradeManually(await requireActor(), str(fd, "attemptId"), awards, opt(fd, "feedback") ?? undefined);
    revalidatePath("/admin/grading", "layout");
    return { ...res, href: "/admin/grading" };
  });
}

export async function issueCertificateAction(fd: FormData) {
  return attempt(async () => {
    const res = await issueCertificate(await requireActor(), str(fd, "userId"), str(fd, "programId"));
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/subscribers", "layout");
    return { serial: res.serial };
  });
}

export async function revokeCertificateAction(fd: FormData) {
  return attempt(async () => {
    const before = await revokeCertificate(await requireActor(), str(fd, "certificateId"), str(fd, "reason"));
    revalidatePath("/admin/certificates");
    revalidatePath(verifyPath(before.serial));
  });
}

export async function reissueCertificateAction(fd: FormData) {
  return attempt(async () => {
    const res = await reissueCertificate(await requireActor(), str(fd, "certificateId"));
    revalidatePath("/admin/certificates");
    return { serial: res.serial };
  });
}

export async function toggleBookmarkAction(lessonId: string) {
  return attempt(async () => {
    const { toggleBookmark } = await import("@/lib/services/learning/bookmarks");
    const saved = await toggleBookmark(await requireActor(), lessonId);
    revalidatePath("/academy");
    return saved;
  });
}
