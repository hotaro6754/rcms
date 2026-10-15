import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorisationError } from "@/lib/errors";
import * as lib from "@/lib/services/cms/library";
import { makeUser, resetDb, staff } from "../helpers";

beforeEach(resetDb);

const term = { kind: "GLOSSARY", title: "Timely filing limit", summary: "The deadline a payer sets for receiving a claim after the date of service.", body: "Each payer sets its own limit in its provider manual or contract." };

describe("content library", () => {
  it("publishes only after a different reviewer approves, and keeps drafts private", async () => {
    const author = await staff("CONTENT_ADMIN");
    const reviewer = await staff("ACADEMIC_REVIEWER");
    const e = await lib.createEntry(author, term);
    expect(await lib.publicEntries("GLOSSARY")).toEqual([]);

    await lib.submitEntry(author, e.id);
    await expect(lib.reviewEntry(author, e.id, true)).rejects.toBeInstanceOf(AuthorisationError);
    const dualRole = await makeUser({ staff: ["CONTENT_ADMIN", "ACADEMIC_REVIEWER"] });
    const e2 = await lib.createEntry(dualRole, { ...term, title: "Clearinghouse" });
    await lib.submitEntry(dualRole, e2.id);
    await expect(lib.reviewEntry(dualRole, e2.id, true)).rejects.toThrow(/different reviewer/);

    await expect(lib.reviewEntry(reviewer, e.id, false)).rejects.toThrow(/what needs to change/);
    await lib.reviewEntry(reviewer, e.id, true, "Accurate");
    const live = await lib.publicEntries("GLOSSARY");
    expect(live.map((x) => x.title)).toEqual(["Timely filing limit"]);
    expect((await lib.publicEntries(undefined, "payer")).length).toBe(1);

    // An edit to a published entry stays private until approved.
    const fresh = await prisma.libraryEntry.findUniqueOrThrow({ where: { id: e.id } });
    await lib.updateEntry(author, e.id, { ...term, summary: "A changed summary that has not been approved yet." }, fresh.lockVersion);
    expect((await lib.publicEntry(fresh.slug))!.summary).toBe(term.summary);
    await lib.submitEntry(author, e.id);
    expect((await lib.publicEntry(fresh.slug))!.summary).toBe(term.summary);
    await lib.reviewEntry(reviewer, e.id, true);
    expect((await lib.publicEntry(fresh.slug))!.summary).toMatch(/changed summary/);

    // Archived entries disappear; restoring needs approval again.
    await lib.setEntryArchived(await staff("ACADEMY_DIRECTOR"), e.id, true);
    expect(await lib.publicEntry(fresh.slug)).toBeNull();
    await lib.setEntryArchived(await staff("ACADEMY_DIRECTOR"), e.id, false);
    expect(await lib.publicEntry(fresh.slug)).toBeNull();
  });

  it("refuses patient identifiers and learner writes", async () => {
    const author = await staff("CONTENT_ADMIN");
    await expect(lib.createEntry(author, { ...term, body: "Example patient SSN 123-45-6789 was denied." })).rejects.toThrow(/synthetic, de-identified/);
    await expect(lib.createEntry(await makeUser(), term)).rejects.toBeInstanceOf(AuthorisationError);
  });
});
