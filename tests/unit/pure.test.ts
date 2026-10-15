import { describe, expect, it } from "vitest";
import { effectiveRoles, permissionsFor, ROLE_PERMISSIONS, canRequestRole } from "@/lib/permissions";
import { gradeAttempt, gradeQuestion, normaliseQuestion, prepareQuestion, toLearner, type QuestionDef } from "@/lib/assessment/questions";
import { findings, mask, refusalFor } from "@/lib/cms/screen";
import { parseBlocks, safeHref } from "@/lib/cms/markdown";
import { parseBlock, videoEmbedUrl } from "@/lib/cms/blocks";
import { sniff } from "@/lib/storage";
import { redact } from "@/lib/audit";

describe("permission matrix", () => {
  it("gives the super administrator everything and the auditor nothing writable", () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN.has("refund.approve_exceptional")).toBe(true);
    const auditor = [...ROLE_PERMISSIONS.AUDITOR];
    expect(auditor.every((p) => p.endsWith(".view") || p.endsWith("_all"))).toBe(true);
  });

  it("separates content authoring from approval and publication", () => {
    const content = ROLE_PERMISSIONS.CONTENT_ADMIN;
    expect(content.has("content.edit")).toBe(true);
    expect(content.has("content.review.academic")).toBe(false);
    expect(content.has("content.review.compliance")).toBe(false);
    expect(content.has("content.publish")).toBe(false);
  });

  it("keeps vendor payout requests and approvals with different roles", () => {
    const requesters = Object.entries(ROLE_PERMISSIONS).filter(([, p]) => p.has("vendor.payout.request")).map(([r]) => r);
    const approvers = Object.entries(ROLE_PERMISSIONS).filter(([, p]) => p.has("vendor.payout.approve")).map(([r]) => r);
    expect(requesters.filter((r) => r !== "SUPER_ADMIN").some((r) => approvers.includes(r))).toBe(false);
  });

  it("maps legacy roles onto staff roles without granting students anything", () => {
    expect(effectiveRoles("STUDENT", [])).toEqual([]);
    expect(permissionsFor("STUDENT", []).size).toBe(0);
    expect(effectiveRoles("OWNER", [])).toEqual(["SUPER_ADMIN"]);
    expect(permissionsFor("TRAINER", []).has("content.edit")).toBe(true);
    expect(permissionsFor("TRAINER", []).has("content.publish")).toBe(false);
    expect(effectiveRoles("STUDENT", ["NOT_A_ROLE", "AUDITOR"])).toEqual(["AUDITOR"]);
  });

  it("only lets a super administrator propose super administrator", () => {
    expect(canRequestRole(["ACADEMY_DIRECTOR"], "SUPER_ADMIN")).toBe(false);
    expect(canRequestRole(["SUPER_ADMIN"], "SUPER_ADMIN")).toBe(true);
  });
});

const q = (over: Partial<QuestionDef>): QuestionDef => ({
  id: "q1",
  type: "SINGLE",
  prompt: "Which?",
  options: ["A", "B", "C"],
  targets: [],
  answerKey: { index: 1 },
  points: 1,
  difficulty: 2,
  ...over,
});

describe("questions", () => {
  it("validates and normalises every type", () => {
    expect(normaliseQuestion({ type: "SINGLE", prompt: "Pick one", options: ["a", "b"], answerKey: { index: 5 } }).ok).toBe(false);
    const tf = normaliseQuestion({ type: "TRUE_FALSE", prompt: "Is it true?", answerKey: { index: 0 } });
    expect(tf.ok && tf.value.options).toEqual(["True", "False"]);
    expect(normaliseQuestion({ type: "MULTI", prompt: "Pick some", options: ["a", "b", "c"], answerKey: { indices: [0, 1, 2] } }).ok).toBe(false);
    expect(normaliseQuestion({ type: "MATCHING", prompt: "Match them", options: ["a", "b"], targets: ["x", "y"], answerKey: { pairs: [1, 1] } }).ok).toBe(false);
    const seq = normaliseQuestion({ type: "SEQUENCE", prompt: "Order these", options: ["first", "second", "third"] });
    expect(seq.ok && seq.value.answerKey).toEqual({ order: [0, 1, 2] });
  });

  it("never sends a key to the learner and tokens do not reveal order", () => {
    const p = prepareQuestion(q({ type: "SEQUENCE", options: ["1", "2", "3", "4"], answerKey: { order: [0, 1, 2, 3] } }), false);
    const view = toLearner(p);
    expect(JSON.stringify(view)).not.toContain("answerKey");
    expect(JSON.stringify(view)).not.toContain("order");
    expect(view.options.map((o) => o.text)).not.toEqual(["1", "2", "3", "4"]);
  });

  it("grades each type, all or nothing", () => {
    const single = prepareQuestion(q({}), false);
    expect(gradeQuestion(single, single.optionTokens[1]).correct).toBe(true);
    expect(gradeQuestion(single, single.optionTokens[0]).correct).toBe(false);
    expect(gradeQuestion(single, "forged-token").correct).toBe(false);

    const multi = prepareQuestion(q({ type: "MULTI", answerKey: { indices: [0, 2] } }), true);
    expect(gradeQuestion(multi, [multi.optionTokens[2], multi.optionTokens[0]]).correct).toBe(true);
    expect(gradeQuestion(multi, [multi.optionTokens[0]]).correct).toBe(false);

    const match = prepareQuestion(q({ type: "MATCHING", options: ["CO-45", "PR-1"], targets: ["Contractual", "Deductible"], answerKey: { pairs: [0, 1] } }), false);
    expect(gradeQuestion(match, { [match.optionTokens[0]]: match.targetTokens[0], [match.optionTokens[1]]: match.targetTokens[1] }).correct).toBe(true);
    expect(gradeQuestion(match, { [match.optionTokens[0]]: match.targetTokens[1], [match.optionTokens[1]]: match.targetTokens[0] }).correct).toBe(false);

    const manual = prepareQuestion(q({ type: "SHORT_ANSWER", options: [], answerKey: {} }), false);
    expect(gradeQuestion(manual, "My answer").correct).toBeNull();
  });

  it("scores by points, holds manual questions for review and recommends remediation", () => {
    const a = prepareQuestion(q({ id: "a", points: 3, competency: "Denials", remediationLessonId: "L1" }), false);
    const b = prepareQuestion(q({ id: "b", type: "SHORT_ANSWER", options: [], answerKey: {}, points: 2 }), false);
    const pending = gradeAttempt([a, b], { a: a.optionTokens[0], b: "text" });
    expect(pending.needsReview).toBe(true);
    expect(pending.remediation).toEqual(["L1"]);
    const final = gradeAttempt([a, b], { a: a.optionTokens[1], b: "text" }, { b: 2 });
    expect(final.needsReview).toBe(false);
    expect(final.score).toBe(100);
    expect(final.breakdown.Denials).toEqual({ awarded: 3, possible: 3 });
  });
});

describe("screening", () => {
  it("catches card numbers by checksum, SSNs and MBIs, and masks them", () => {
    expect(findings("card 4111 1111 1111 1111").map((f) => f.kind)).toContain("card");
    expect(findings("order 4111 1111 1111 1112").map((f) => f.kind)).not.toContain("card");
    expect(findings("SSN 123-45-6789").map((f) => f.kind)).toContain("ssn");
    expect(findings("MBI 1EG4-TE5-MK73").map((f) => f.kind)).toContain("mbi");
    expect(refusalFor("Patient DOB: 01/02/1960")).not.toBeNull();
    expect(refusalFor("CO-45 means the charge exceeds the fee schedule.")).toBeNull();
    const m = mask("my card is 4111111111111111 thanks");
    expect(m.masked).toBe(true);
    expect(m.text).not.toContain("4111");
  });

  it("redacts secrets and card-like numbers from audit diffs", () => {
    expect(redact({ password: "x", nested: { token: "t", note: "card 4111111111111111" } })).toEqual({ password: "[redacted]", nested: { token: "[redacted]", note: "card [number removed]" } });
  });
});

describe("rich text and blocks", () => {
  it("parses the markdown subset and refuses unsafe links", () => {
    const chunks = parseBlocks("## Title\n\nPara one\ncontinued\n\n- a\n- b\n\n1. x\n2. y");
    expect(chunks.map((c) => c.t)).toEqual(["h", "p", "ul", "ol"]);
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("https://www.cms.gov")).toBe("https://www.cms.gov");
    expect(safeHref("/academy")).toBe("/academy");
  });

  it("validates blocks per kind", () => {
    expect(parseBlock("IMAGE", { mediaId: "m1", alt: "" }).success).toBe(false);
    expect(parseBlock("VIDEO", { url: "https://evil.example/v.mp4", title: "Video" }).success).toBe(false);
    expect(parseBlock("VIDEO", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Claim lifecycle" }).success).toBe(true);
    expect(parseBlock("SCENARIO", { title: "Case", context: "A synthetic denial case." }).success).toBe(false);
    expect(parseBlock("SCENARIO", { title: "Case", context: "A synthetic denial case.", synthetic: true }).success).toBe(true);
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("upload sniffing", () => {
  it("recognises audio by its bytes", async () => {
    const { sniff } = await import("@/lib/storage");
    expect(sniff(new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0]), "talk.mp3")).toBe("audio/mpeg");
    expect(sniff(new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 2, 0, 0]), "talk.ogg")).toBe("audio/ogg");
    expect(sniff(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]), "talk.wav")).toBe("audio/wav");
    expect(sniff(new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]), "talk.m4a")).toBe("audio/mp4");
  });

  it("trusts content, not the file name", () => {
    expect(sniff(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), "a.pdf")).toBe("application/pdf");
    expect(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "a.png")).toBe("image/png");
    expect(sniff(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), "invoice.pdf")).toBeNull();
    expect(sniff(new TextEncoder().encode("a,b\n1,2"), "x.csv")).toBe("text/csv");
    expect(sniff(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "deck.pptx")).toContain("presentationml");
  });
});
