"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireTrainer, requireUser } from "@/lib/rbac";
import { RUBRIC } from "@/lib/data/scenarios";

/**
 * Governance Labs.
 *
 * A lab attempt is the assessed artefact: the capacity decision the learner settled on, the
 * root cause they reached, the actions they assigned and the executive summary they would
 * send. A trainer grades it against a fixed rubric.
 *
 * Two rules shape everything here:
 *
 *   1. A submitted attempt is immutable. Editing after submission would make grading
 *      meaningless, so every write path checks state first.
 *   2. A capacity run stores its computed result, not just its inputs. If the teaching
 *      model is later retuned, a graded attempt keeps the numbers it was graded against.
 */

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

type OpenAttempt =
  | { ok: false; error: string }
  | { ok: true; attempt: NonNullable<Awaited<ReturnType<typeof prisma.labAttempt.findUnique>>> };

async function openAttempt(userId: string, attemptId: string): Promise<OpenAttempt> {
  const attempt = await prisma.labAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) return { ok: false, error: "That attempt no longer exists." };
  if (attempt.userId !== userId) return { ok: false, error: "That is not your attempt." };
  if (attempt.state !== "IN_PROGRESS") {
    return { ok: false, error: "This attempt is submitted. It cannot be changed." };
  }
  return { ok: true, attempt };
}

export async function startAttempt(scenarioId: string) {
  const user = await requireUser();

  const existing = await prisma.labAttempt.findUnique({
    where: { userId_scenarioId: { userId: user.id, scenarioId } },
  });
  if (existing) return { ok: true as const, data: { id: existing.id } };

  const attempt = await prisma.labAttempt.create({
    data: { userId: user.id, scenarioId },
  });

  await audit({
    actorId: user.id,
    action: "create",
    entity: "LabAttempt",
    entityId: attempt.id,
    after: { scenarioId },
  });

  revalidatePath("/labs");
  return { ok: true as const, data: { id: attempt.id } };
}

const CapacityInput = z.object({
  analysts: z.coerce.number().int().min(1).max(200),
  qaBar: z.coerce.number().int().min(80).max(100),
  automation: z.coerce.number().int().min(0).max(80),
});

export async function saveCapacityRun(attemptId: string, formData: FormData) {
  const user = await requireUser();
  const found = await openAttempt(user.id, attemptId);
  if (!found.ok) return fail(found.error);

  const parsed = CapacityInput.safeParse({
    analysts: formData.get("analysts"),
    qaBar: formData.get("qaBar"),
    automation: formData.get("automation"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const scenario = await prisma.scenario.findUnique({
    where: { id: found.attempt.scenarioId },
    select: { telemetry: true },
  });
  const t = scenario?.telemetry as { capacity?: Record<string, number> } | null;
  const cap = t?.capacity ?? { openClaims: 10_400, dailyInflow: 610, costPerAnalyst: 1_050 };
  const collections =
    (t as { monthlyCollections?: number } | null)?.monthlyCollections ?? 1_940_000;

  const { analysts, qaBar, automation } = parsed.data;
  const perAnalyst = 46 - (qaBar - 86) * 0.54;
  const bot = cap.dailyInflow * (automation / 100) * 1.35;
  const capacity = Math.round(analysts * perAnalyst + bot);
  const net = capacity - cap.dailyInflow;
  const daysToClear = net > 0 ? Math.ceil(cap.openClaims / net) : null;
  const firstPass = Math.min(97.5, 78 + (qaBar - 86) * 0.95 + automation * 0.075);
  const arOver90 = net > 0 ? Math.min(34, 6.5 + Math.min(27.5, daysToClear! * 0.09)) : 34;
  const monthlyCost = analysts * cap.costPerAnalyst + automation * 260;
  const costToCollect = (monthlyCost / collections) * 100;

  const result = {
    capacity,
    net,
    daysToClear,
    firstPass: +firstPass.toFixed(1),
    arOver90: +arOver90.toFixed(1),
    monthlyCost,
    costToCollect: +costToCollect.toFixed(2),
  };

  const run = await prisma.capacityRun.create({
    data: { attemptId, analysts, qaBar, automation, result: result as never },
  });

  await audit({
    actorId: user.id,
    action: "create",
    entity: "CapacityRun",
    entityId: run.id,
    after: { attemptId, analysts, qaBar, automation },
  });

  revalidatePath(`/labs/${attemptId}`);
  return { ok: true as const, data: result };
}

const RcaInput = z.object({
  subject: z.string().trim().min(3, "Name the category you are analysing.").max(200),
  conclusion: z.string().trim().max(2000).optional(),
});

export async function saveRca(attemptId: string, formData: FormData) {
  const user = await requireUser();
  const found = await openAttempt(user.id, attemptId);
  if (!found.ok) return fail(found.error);

  const parsed = RcaInput.safeParse({
    subject: formData.get("subject"),
    conclusion: formData.get("conclusion") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const steps = [0, 1, 2, 3, 4].map((i) => ({
    question: String(formData.get(`q${i}`) ?? "").trim(),
    answer: String(formData.get(`a${i}`) ?? "").trim(),
    evidence: String(formData.get(`e${i}`) ?? "").trim(),
  }));

  const answered = steps.filter((s) => s.answer).length;
  if (answered < 3) {
    return fail("Work at least three levels down. Two stops at the symptom.");
  }

  await prisma.rcaBoard.upsert({
    where: { attemptId },
    update: { subject: parsed.data.subject, steps: steps as never, conclusion: parsed.data.conclusion },
    create: {
      attemptId,
      subject: parsed.data.subject,
      steps: steps as never,
      conclusion: parsed.data.conclusion,
    },
  });

  await audit({
    actorId: user.id,
    action: "update",
    entity: "RcaBoard",
    entityId: attemptId,
    after: { subject: parsed.data.subject, levels: answered },
  });

  revalidatePath(`/labs/${attemptId}`);
  return { ok: true as const };
}

const ActionInput = z.object({
  action: z.string().trim().min(8, "Say what will actually be done.").max(500),
  owner: z.string().trim().min(2, "An action without an owner is a wish.").max(120),
  dueDate: z.string().trim().min(4, "Give it a date.").max(40),
  expectedImpact: z.string().trim().max(400).optional(),
});

export async function addActionItem(attemptId: string, formData: FormData) {
  const user = await requireUser();
  const found = await openAttempt(user.id, attemptId);
  if (!found.ok) return fail(found.error);

  const parsed = ActionInput.safeParse({
    action: formData.get("action"),
    owner: formData.get("owner"),
    dueDate: formData.get("dueDate"),
    expectedImpact: formData.get("expectedImpact") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  await prisma.actionItem.create({ data: { attemptId, ...parsed.data } });

  revalidatePath(`/labs/${attemptId}`);
  return { ok: true as const };
}

export async function removeActionItem(itemId: string) {
  const user = await requireUser();
  const item = await prisma.actionItem.findUnique({ where: { id: itemId } });
  if (!item) return fail("That action no longer exists.");

  const found = await openAttempt(user.id, item.attemptId);
  if (!found.ok) return fail(found.error);

  await prisma.actionItem.delete({ where: { id: itemId } });
  revalidatePath(`/labs/${item.attemptId}`);
  return { ok: true as const };
}

const NotesInput = z.object({
  whatChanged: z.string().trim().min(20, "What moved, and by how much?").max(2000),
  whyChanged: z.string().trim().min(20, "The cause, not the symptom.").max(2000),
  financialImpact: z.string().trim().min(3, "Attach a number or it will not be prioritised.").max(1000),
  rootCause: z.string().trim().min(20, "Where was the control missing?").max(2000),
  recommendedAction: z.string().trim().min(20, "Name the decision you need.").max(2000),
  owner: z.string().trim().min(2, "Who is accountable?").max(120),
  deadline: z.string().trim().min(4, "By when?").max(60),
});

/**
 * Submitting closes the attempt. Everything after this is read-only for the learner and
 * gradeable by a trainer.
 */
export async function submitAttempt(attemptId: string, formData: FormData) {
  const user = await requireUser();
  const found = await openAttempt(user.id, attemptId);
  if (!found.ok) return fail(found.error);

  const parsed = NotesInput.safeParse({
    whatChanged: formData.get("whatChanged"),
    whyChanged: formData.get("whyChanged"),
    financialImpact: formData.get("financialImpact"),
    rootCause: formData.get("rootCause"),
    recommendedAction: formData.get("recommendedAction"),
    owner: formData.get("owner"),
    deadline: formData.get("deadline"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const [rca, runs, actions] = await Promise.all([
    prisma.rcaBoard.findUnique({ where: { attemptId } }),
    prisma.capacityRun.count({ where: { attemptId } }),
    prisma.actionItem.count({ where: { attemptId } }),
  ]);

  if (!rca) return fail("Complete the root cause analysis before submitting.");
  if (runs === 0) return fail("Settle on a capacity decision before submitting.");
  if (actions === 0) return fail("A review with no actions is a status update. Assign at least one.");

  await prisma.$transaction([
    prisma.executiveNote.upsert({
      where: { attemptId },
      update: parsed.data,
      create: { attemptId, ...parsed.data },
    }),
    prisma.labAttempt.update({
      where: { id: attemptId },
      data: { state: "SUBMITTED", submittedAt: new Date() },
    }),
  ]);

  await audit({
    actorId: user.id,
    action: "update",
    entity: "LabAttempt",
    entityId: attemptId,
    after: { state: "SUBMITTED" },
  });

  revalidatePath("/labs");
  revalidatePath("/studio/grading");
  return { ok: true as const };
}

/** Trainer only. Scores every rubric criterion at once and closes the attempt as graded. */
export async function gradeAttempt(attemptId: string, formData: FormData) {
  const trainer = await requireTrainer();

  const attempt = await prisma.labAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) return fail("That attempt no longer exists.");
  if (attempt.state === "IN_PROGRESS") return fail("That attempt has not been submitted yet.");

  const scores = RUBRIC.map((r) => ({
    criterion: r.criterion,
    score: Number(formData.get(`score:${r.criterion}`) ?? 0),
    comment: String(formData.get(`comment:${r.criterion}`) ?? "").trim() || null,
    maxScore: r.max,
  }));

  if (scores.some((s) => !Number.isInteger(s.score) || s.score < 0 || s.score > s.maxScore)) {
    return fail("Every criterion needs a score within its range.");
  }

  await prisma.$transaction([
    prisma.rubricScore.deleteMany({ where: { attemptId } }),
    prisma.rubricScore.createMany({
      data: scores.map((s) => ({ ...s, attemptId, gradedById: trainer.id })),
    }),
    prisma.labAttempt.update({ where: { id: attemptId }, data: { state: "GRADED" } }),
  ]);

  const total = scores.reduce((n, s) => n + s.score, 0);
  const max = scores.reduce((n, s) => n + s.maxScore, 0);

  await audit({
    actorId: trainer.id,
    action: "grade",
    entity: "LabAttempt",
    entityId: attemptId,
    after: { total, max },
  });

  await prisma.notification.create({
    data: {
      userId: attempt.userId,
      kind: "lab_graded",
      title: "Your governance review has been marked",
      body: `${total} out of ${max}, with comments on each criterion.`,
      href: `/labs/${attemptId}`,
    },
  });

  revalidatePath("/studio/grading");
  revalidatePath(`/labs/${attemptId}`);
  return { ok: true as const };
}
