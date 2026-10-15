import { describe, expect, it } from "vitest";
import { CaseDefinition, learnerView } from "@/lib/sim/definition";
import { findIdentifiers, scoreAttempt } from "@/lib/sim/score";
import { SEED_CASES } from "@/lib/sim/seed-cases";
import { expert } from "../sim-helpers";

const defs = SEED_CASES.map((c) => CaseDefinition.parse(c.definition));

describe("seed case definitions", () => {
  it("all validate, and an expert answer scores 100 and passes", () => {
    for (const d of defs) {
      const r = scoreAttempt(d, expert(d), { attemptNo: 1 });
      expect(r.criticalErrors).toEqual([]);
      expect(r.score).toBe(100);
      expect(r.passed).toBe(true);
      expect(r.revealed?.decision).toBe(d.expected.decision);
    }
  });

  it("rejects a definition with two correct actions or a critical error naming the correct action", () => {
    const raw = structuredClone(SEED_CASES[0].definition);
    raw.actionOptions[1].correct = true;
    expect(CaseDefinition.safeParse(raw).success).toBe(false);
    const raw2 = structuredClone(SEED_CASES[0].definition);
    raw2.rubric!.criticalErrors![0].trigger = { type: "action", optionId: "close" };
    expect(CaseDefinition.safeParse(raw2).success).toBe(false);
  });
});

describe("scoring", () => {
  it("fails a high aggregate score when a critical error is made", () => {
    const d = defs[1];
    const a = { ...expert(d), action: "bill-patient" };
    const r = scoreAttempt(d, a, { attemptNo: 1 });
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.passed).toBe(false);
    expect(r.criticalErrors.map((c) => c.id)).toContain("ce-patient");
    expect(r.actionRisk).toMatch(/contractual/);
  });

  it("requires escalation where the case needs it", () => {
    const d = defs[2];
    const r = scoreAttempt(d, { ...expert(d), escalate: false }, { attemptNo: 1 });
    expect(r.criticalErrors.map((c) => c.id)).toContain("ce-escalation");
    expect(r.passed).toBe(false);
  });

  it("does not reveal the expected decision on a failed first attempt, but does at the reveal threshold", () => {
    const d = defs[0];
    const wrong = { ...expert(d), action: "appeal" };
    expect(scoreAttempt(d, wrong, { attemptNo: 1 }).revealed).toBeNull();
    expect(scoreAttempt(d, wrong, { attemptNo: 2 }).revealed).not.toBeNull();
  });

  it("flags identifiers in notes, masks them, and lets an instructor dismiss a false flag", () => {
    const d = defs[0];
    const a = { ...expert(d), notes: `${expert(d).notes} Patient DOB: 01/02/1980, SSN 123-45-6789, call 555-123-4567.` };
    const r = scoreAttempt(d, a, { attemptNo: 1 });
    expect(r.passed).toBe(false);
    expect(r.identifiers.length).toBe(3);
    expect(JSON.stringify(r)).not.toContain("123-45-6789");
    const reviewed = scoreAttempt(d, a, { attemptNo: 1, overrides: { dismissIdentifierFlag: true } });
    expect(reviewed.criticalErrors).toEqual([]);
    expect(reviewed.passed).toBe(true);
  });

  it("applies instructor scores for documentation and rationale", () => {
    const d = defs[0];
    const thin = { ...expert(d), notes: "Closed.", rationale: "Duplicate." };
    const auto = scoreAttempt(d, thin, { attemptNo: 1 });
    const adjusted = scoreAttempt(d, thin, { attemptNo: 1, overrides: { documentation: 100, rationale: 100 } });
    expect(adjusted.score).toBeGreaterThan(auto.score);
    expect(adjusted.criteria.find((c) => c.key === "documentation")?.adjusted).toBe(true);
  });

  it("penalises citing irrelevant evidence", () => {
    const d = defs[0];
    const all = scoreAttempt(d, { ...expert(d), supportingEvidence: d.evidence.map((e) => e.id) }, { attemptNo: 1 });
    expect(all.criteria.find((c) => c.key === "evidence")!.score).toBeLessThan(100);
  });

  it("finds common identifier formats and ignores claim references", () => {
    expect(findIdentifiers("Claim SYN-31877, account ACCT-SYN-60417, auth AUTH-SYN-88213")).toEqual([]);
    expect(findIdentifiers("email jane@example.com")).toHaveLength(1);
  });
});

describe("learner view", () => {
  it("carries no part of the answer key", () => {
    for (const d of defs) {
      const json = JSON.stringify(learnerView(d));
      for (const banned of ['"correct"', '"relevant"', '"explanation"', '"risk"', '"terms"', '"expected"', d.expected.decision.slice(0, 40)]) expect(json).not.toContain(banned);
      for (const ce of d.rubric.criticalErrors) expect(json).not.toContain(ce.explanation);
    }
  });
});
