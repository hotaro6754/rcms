import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorisationError } from "@/lib/errors";
import { CaseDefinition } from "@/lib/sim/definition";
import * as cases from "@/lib/services/sims/cases";
import * as attempts from "@/lib/services/sims/attempts";
import * as comps from "@/lib/services/sims/competencies";
import { seedCases } from "../../prisma/seed-cases";
import { makeUser, makeCourseDraft, resetDb, staff } from "../helpers";
import { expert } from "../sim-helpers";

beforeEach(resetDb);

/** Seed, activate every competency and approve every case, as a reviewer would. */
async function publishedSeed() {
  await seedCases(prisma);
  const reviewer = await staff("ACADEMIC_REVIEWER");
  for (const c of await prisma.competency.findMany()) await comps.activateCompetency(reviewer, c.id);
  for (const c of await prisma.simCase.findMany()) await cases.reviewCase(reviewer, c.id, true, "Checked against sources.");
  const all = await prisma.simCase.findMany({ include: { versions: true } });
  const bySlug = (slug: string) => {
    const c = all.find((x) => x.slug === slug)!;
    return { ...c, def: CaseDefinition.parse(c.versions[0].definition) };
  };
  return { reviewer, bySlug };
}

describe("case authoring", () => {
  it("validates on save, needs active competencies, and needs a reviewer other than the submitter", async () => {
    const author = await staff("CONTENT_ADMIN");
    const c = await cases.createCase(author, "Timely filing denial");
    const def = CaseDefinition.parse(c.draft);
    await expect(cases.updateCase(author, c.id, { definition: { ...def, actionOptions: [] } }, c.lockVersion)).rejects.toThrow(/not valid yet/);
    await expect(cases.submitCase(author, c.id)).rejects.toThrow(/Link at least one competency/);

    await seedCases(prisma);
    await cases.updateCase(author, c.id, { definition: { ...def, competencyCodes: ["DEN-ID"] } }, c.lockVersion);
    await expect(cases.submitCase(author, c.id)).rejects.toThrow(/not active/);
    const reviewer = await staff("ACADEMIC_REVIEWER");
    await comps.activateCompetency(reviewer, (await prisma.competency.findUniqueOrThrow({ where: { code: "DEN-ID" } })).id);
    await cases.submitCase(author, c.id);
    await expect(cases.reviewCase(author, c.id, true)).rejects.toBeInstanceOf(AuthorisationError);
    const director = await staff("SUPER_ADMIN");
    await expect(cases.reviewCase(director, c.id, false)).rejects.toThrow(/Say what needs to change/);
    await cases.reviewCase(reviewer, c.id, true);
    expect(await prisma.simCaseVersion.count({ where: { caseId: c.id } })).toBe(1);
  });

  it("refuses identifiers in case content", async () => {
    const author = await staff("CONTENT_ADMIN");
    const c = await cases.createCase(author, "Leaky case");
    const def = CaseDefinition.parse(c.draft);
    await expect(cases.updateCase(author, c.id, { definition: { ...def, brief: `${def.brief} Patient SSN 123-45-6789.` } }, c.lockVersion)).rejects.toThrow();
  });
});

describe("learner attempts", () => {
  it("runs a case end to end: start, save, return, submit, scored feedback, competency outcomes", async () => {
    const { bySlug } = await publishedSeed();
    const c = bySlug("authorization-on-file-not-on-claim");
    const learner = await makeUser();
    const a = await attempts.startAttempt(learner, c.id);
    expect((await attempts.startAttempt(learner, c.id)).id).toBe(a.id);

    const view = await attempts.attemptForLearner(learner, a.id);
    expect(JSON.stringify(view)).not.toMatch(/"correct"|"relevant"|"explanation"/);
    expect(view.result).toBeNull();

    const answers = expert(c.def);
    await attempts.saveAnswers(learner, a.id, { issue: answers.issue, notes: "Draft note" });
    expect((await attempts.attemptForLearner(learner, a.id)).answers.notes).toBe("Draft note");

    const other = await makeUser();
    await expect(attempts.saveAnswers(other, a.id, {})).rejects.toThrow(/does not exist/);

    const result = await attempts.submitAttempt(learner, a.id, answers);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    await expect(attempts.submitAttempt(learner, a.id, answers)).rejects.toThrow(/already been submitted/);
    await expect(attempts.saveAnswers(learner, a.id, {})).rejects.toThrow(/can no longer change/);

    const after = await attempts.attemptForLearner(learner, a.id);
    expect(after.outcomes.every((o) => o.demonstrated)).toBe(true);
    expect(after.outcomes.map((o) => o.code).sort()).toEqual(["DEN-DOC", "DEN-ESC", "DEN-ID", "DEN-RES", "PRIV-MIN"]);
    const standing = (await comps.standings([learner.id])).get(learner.id)!;
    expect(standing.filter((s) => s.demonstrated)).toHaveLength(5);
    expect(standing.find((s) => s.code === "PRIV-MIN")).toBeTruthy();
  });

  it("does not award competence for a failed attempt, limits attempts and reveals the answer at the threshold", async () => {
    const { bySlug } = await publishedSeed();
    const c = bySlug("medical-necessity-plan-of-care-lapsed");
    const learner = await makeUser();
    const wrong = { ...expert(c.def), action: "amend-note" };
    for (let i = 1; i <= 3; i++) {
      const a = await attempts.startAttempt(learner, c.id);
      const r = await attempts.submitAttempt(learner, a.id, wrong);
      expect(r.passed).toBe(false);
      expect(r.criticalErrors.map((x) => x.id)).toContain("ce-amend");
      expect(r.revealed === null).toBe(i < 2);
    }
    await expect(attempts.startAttempt(learner, c.id)).rejects.toThrow(/used all 3 attempts/);
    const standing = (await comps.standings([learner.id])).get(learner.id)!;
    expect(standing.find((s) => s.code === "DEN-RES")?.demonstrated).toBe(false);
  });

  it("requires an answer to the key questions before submitting", async () => {
    const { bySlug } = await publishedSeed();
    const c = bySlug("duplicate-denial-already-paid");
    const learner = await makeUser();
    const a = await attempts.startAttempt(learner, c.id);
    await expect(attempts.submitAttempt(learner, a.id, { issue: "duplicate-paid" })).rejects.toThrow(/next action/);
  });

  it("keeps an attempt on the version it started, after the case is republished", async () => {
    const { bySlug, reviewer } = await publishedSeed();
    const c = bySlug("duplicate-denial-already-paid");
    const learner = await makeUser();
    const a = await attempts.startAttempt(learner, c.id);
    const author = await staff("CONTENT_ADMIN");
    const fresh = await prisma.simCase.findUniqueOrThrow({ where: { id: c.id } });
    await cases.updateCase(author, c.id, { definition: { ...c.def, title: "Duplicate denial (revised)" } }, fresh.lockVersion);
    await cases.submitCase(author, c.id);
    await cases.reviewCase(reviewer, c.id, true);
    expect((await attempts.attemptForLearner(learner, a.id)).version).toBe(1);
    await attempts.submitAttempt(learner, a.id, expert(c.def));
    const b = await attempts.startAttempt(learner, c.id);
    expect((await attempts.attemptForLearner(learner, b.id)).view.title).toBe("Duplicate denial (revised)");
  });

  it("blocks new attempts on a retired case and on a course-linked case without access", async () => {
    const { bySlug } = await publishedSeed();
    const director = await staff("ACADEMY_DIRECTOR");
    const learner = await makeUser();
    const retired = bySlug("duplicate-denial-already-paid");
    await cases.setCaseRetired(director, retired.id, true);
    await expect(attempts.startAttempt(learner, retired.id)).rejects.toThrow(/not available/);

    const linked = bySlug("authorization-on-file-not-on-claim");
    const { course } = await makeCourseDraft(director, { modules: 1, lessons: 1 });
    await prisma.simCase.update({ where: { id: linked.id }, data: { programId: course.id } });
    await expect(attempts.startAttempt(learner, linked.id)).rejects.toBeInstanceOf(AuthorisationError);
    await prisma.enrolment.create({ data: { userId: learner.id, programId: course.id, source: "FREE" } });
    await expect(attempts.startAttempt(learner, linked.id)).resolves.toMatchObject({ attemptNo: 1 });
  });
});

describe("instructor review", () => {
  it("adjusts the automated scores, supersedes outcomes and is limited to graders", async () => {
    const { bySlug, reviewer } = await publishedSeed();
    const c = bySlug("duplicate-denial-already-paid");
    const learner = await makeUser();
    const a = await attempts.startAttempt(learner, c.id);
    const r = await attempts.submitAttempt(learner, a.id, { ...expert(c.def), notes: "Closed duplicate.", rationale: "Paid already." });
    expect(r.criteria.find((x) => x.key === "documentation")!.score).toBeLessThan(100);

    await expect(attempts.reviewAttempt(learner, a.id, { note: "Looks fine to me." })).rejects.toBeInstanceOf(AuthorisationError);
    const reviewed = await attempts.reviewAttempt(reviewer, a.id, { documentation: 100, rationale: 75, note: "Short, but it says what the next person needs." });
    expect(reviewed.score).toBeGreaterThan(r.score);
    expect(await prisma.competencyOutcome.count({ where: { attemptId: a.id, supersededAt: { not: null } } })).toBe(5);
    expect(await prisma.competencyOutcome.count({ where: { attemptId: a.id, supersededAt: null } })).toBe(5);
    const view = await attempts.attemptForLearner(learner, a.id);
    expect(view.state).toBe("REVIEWED");
    expect(view.instructorNote).toMatch(/next person/);
  });
});

describe("competencies", () => {
  it("needs a reviewer other than the author, and editing sends it back to draft", async () => {
    const manager = await staff("CONTENT_ADMIN");
    const c = await comps.createCompetency(manager, { code: "ar-fu", name: "Follow up open AR", description: "Prioritise and follow up open claims.", expectedBehavior: "Works the oldest, largest balances first.", proficiencyLevel: 2, criteria: ["action"], threshold: 75, reassessMonths: "" });
    expect(c.code).toBe("AR-FU");
    const director = await staff("SUPER_ADMIN");
    await prisma.competency.update({ where: { id: c.id }, data: { authorId: director.id } });
    await expect(comps.activateCompetency(director, c.id)).rejects.toThrow(/different reviewer/);
    const reviewer = await staff("ACADEMIC_REVIEWER");
    await comps.activateCompetency(reviewer, c.id);
    const fresh = await prisma.competency.findUniqueOrThrow({ where: { id: c.id } });
    await comps.updateCompetency(manager, c.id, { ...fresh, criteria: ["action", "policy"] }, fresh.lockVersion);
    expect((await prisma.competency.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("DRAFT");
  });
});
