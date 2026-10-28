"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { attempt as run, ServiceError } from "@/lib/errors";
import { Answers } from "@/lib/sim/definition";
import * as cases from "@/lib/services/sims/cases";
import * as attempts from "@/lib/services/sims/attempts";
import * as comps from "@/lib/services/sims/competencies";
import { bool, int, json, opt, str } from "./_form";

// ---------------------------------------------------------------------------
// Learner
// ---------------------------------------------------------------------------

export async function startCaseAction(fd: FormData) {
  return run(async () => {
    const a = await attempts.startAttempt(await requireActor(), str(fd, "caseId"));
    return { href: `/cases/attempt/${a.id}` };
  });
}

/** Autosave and explicit save: answers arrive as JSON from the workbench. */
export async function saveCaseAnswersAction(attemptId: string, answers: unknown) {
  return run(async () => {
    await attempts.saveAnswers(await requireActor(), attemptId, answers);
    return { savedAt: new Date().toISOString() };
  });
}

export async function submitCaseAction(attemptId: string, answers: unknown) {
  return run(async () => {
    await attempts.submitAttempt(await requireActor(), attemptId, answers);
    revalidatePath("/cases");
    return { href: `/cases/attempt/${attemptId}` };
  });
}

export async function requestCaseReviewAction(fd: FormData) {
  return run(async () => {
    await attempts.requestReview(await requireActor(), str(fd, "attemptId"));
  });
}

// ---------------------------------------------------------------------------
// Authoring
// ---------------------------------------------------------------------------

const refreshCase = (id?: string) => {
  revalidatePath("/admin/cases");
  if (id) revalidatePath(`/admin/cases/${id}`);
  revalidatePath("/cases");
};

export async function createCaseAction(fd: FormData) {
  return run(async () => {
    const c = await cases.createCase(await requireActor(), str(fd, "title"));
    refreshCase();
    return { href: `/admin/cases/${c.id}` };
  });
}

export async function updateCaseAction(fd: FormData) {
  return run(async () => {
    const definition = json(fd, "definition");
    if (!definition) throw new ServiceError("The case definition is not valid JSON.");
    await cases.updateCase(await requireActor(), str(fd, "id"), { definition, programId: opt(fd, "programId") }, Number(str(fd, "lockVersion")));
    refreshCase(str(fd, "id"));
  });
}

export async function caseWorkflowAction(fd: FormData) {
  return run(async () => {
    const actor = await requireActor();
    const id = str(fd, "id");
    switch (str(fd, "op")) {
      case "submit":
        await cases.submitCase(actor, id);
        break;
      case "withdraw":
        await cases.withdrawCase(actor, id);
        break;
      case "approve":
        await cases.reviewCase(actor, id, true, str(fd, "note"));
        break;
      case "reject":
        await cases.reviewCase(actor, id, false, str(fd, "note"));
        break;
      case "retire":
        await cases.setCaseRetired(actor, id, true);
        break;
      case "restore":
        await cases.setCaseRetired(actor, id, false);
        break;
    }
    refreshCase(id);
  });
}

export async function previewCaseScoreAction(caseId: string, answers: unknown) {
  return run(async () => cases.previewScore(await requireActor(), caseId, Answers.parse(answers)));
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export async function reviewCaseAttemptAction(fd: FormData) {
  return run(async () => {
    const id = str(fd, "attemptId");
    const score = (name: string) => {
      const v = int(fd, name);
      return v === null || Number.isNaN(v) ? undefined : v;
    };
    await attempts.reviewAttempt(await requireActor(), id, { documentation: score("documentation"), rationale: score("rationale"), dismissIdentifierFlag: bool(fd, "dismissIdentifierFlag"), note: str(fd, "note") });
    revalidatePath(`/admin/grading/cases/${id}`);
    revalidatePath("/admin/grading/cases");
  });
}

// ---------------------------------------------------------------------------
// Competencies
// ---------------------------------------------------------------------------

const compInput = (fd: FormData) => ({
  code: str(fd, "code"),
  name: str(fd, "name"),
  description: str(fd, "description"),
  expectedBehavior: str(fd, "expectedBehavior"),
  proficiencyLevel: str(fd, "proficiencyLevel"),
  criteria: fd.getAll("criteria").map(String),
  threshold: str(fd, "threshold"),
  reassessMonths: str(fd, "reassessMonths"),
});

export async function createCompetencyAction(fd: FormData) {
  return run(async () => {
    await comps.createCompetency(await requireActor(), compInput(fd));
    revalidatePath("/admin/competencies");
  });
}

export async function updateCompetencyAction(fd: FormData) {
  return run(async () => {
    await comps.updateCompetency(await requireActor(), str(fd, "id"), compInput(fd), Number(str(fd, "lockVersion")));
    revalidatePath("/admin/competencies");
  });
}

export async function competencyWorkflowAction(fd: FormData) {
  return run(async () => {
    const actor = await requireActor();
    const id = str(fd, "id");
    const op = str(fd, "op");
    if (op === "activate") await comps.activateCompetency(actor, id);
    else if (op === "retire") await comps.setCompetencyRetired(actor, id, true);
    else if (op === "restore") await comps.setCompetencyRetired(actor, id, false);
    revalidatePath("/admin/competencies");
  });
}
