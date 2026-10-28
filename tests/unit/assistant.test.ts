import { describe, expect, it } from "vitest";
import { excerpt, MIN_SCORE, search, type Passage } from "@/lib/assistant/search";
import { learnerIntent, staffCommand } from "@/lib/assistant/intents";
import { sanitizeOutput } from "@/lib/assistant/provider";
import { HELP } from "@/lib/assistant/help";

const corpus: Passage[] = [
  ...HELP,
  { id: "l1", kind: "lesson", title: "Reading a remittance", href: "/a/1", text: "A claim adjustment reason code (CARC) on the electronic remittance advice explains why a line was paid differently from what was billed. The group code says who is responsible: CO for contractual obligation, PR for patient responsibility." },
  { id: "l2", kind: "lesson", title: "Prior authorization basics", href: "/a/2", text: "Some services need prior authorization from the payer before they are performed. Record the authorization number on the claim." },
  { id: "l3", kind: "library", title: "Timely filing limit", href: "/r/3", text: "Each payer sets a deadline for receiving a claim after the date of service." },
];

describe("retrieval", () => {
  it("finds the passage that answers, including through abbreviations", () => {
    expect(search(corpus, "What does a CARC on the ERA mean?")[0].passage.id).toBe("l1");
    expect(search(corpus, "when do I need prior auth")[0].passage.id).toBe("l2");
    expect(search(corpus, "how do I download my certificate pdf")[0].passage.id).toBe("help:certificate");
  });

  it("scores unrelated questions below the answer threshold", () => {
    const hits = search(corpus, "What is the best pizza topping in Naples?");
    expect(!hits.length || hits[0].score < MIN_SCORE).toBe(true);
  });

  it("quotes the matching sentence", () => {
    expect(excerpt(corpus[corpus.length - 3].text, "who is responsible group code")).toMatch(/group code says who is responsible/);
  });
});

describe("intents", () => {
  it("sends requests for a person and for personal records away from the model", () => {
    expect(learnerIntent("Can I talk to a human?", false)).toBe("human");
    expect(learnerIntent("I want to raise a ticket about billing", false)).toBe("ticket");
    expect(learnerIntent("What do I need to complete before the certificate?", false)).toBe("my_progress");
    expect(learnerIntent("What do I need to complete before my certificate?", false)).toBe("my_progress");
    expect(learnerIntent("Why is this assessment marked incomplete?", false)).toBe("my_progress");
    expect(learnerIntent("Where can I download my certificate?", false)).toBe("my_certificates");
    expect(learnerIntent("what's the status of my ticket", false)).toBe("my_tickets");
    expect(learnerIntent("Explain this lesson in simpler terms", true)).toBe("explain_lesson");
    expect(learnerIntent("Explain this lesson in simpler terms", false)).toBe("knowledge");
    expect(learnerIntent("What is a CARC?", false)).toBe("knowledge");
  });

  it("recognises staff commands, including the one that needs confirmation", () => {
    expect(staffCommand("Show me open high-priority tickets assigned to my team")).toEqual({ kind: "high_priority_tickets", team: true });
    expect(staffCommand("Assign SUP-2026-00012 to me")).toEqual({ kind: "assign_to_me", reference: "SUP-2026-00012" });
    expect(staffCommand("Summarize sup-2026-00012")).toEqual({ kind: "summarize_ticket", reference: "SUP-2026-00012" });
    expect(staffCommand("Find learners enrolled in Foundation course who have not completed module two")).toEqual({ kind: "not_completed_module", course: "Foundation", module: 2 });
    expect(staffCommand("Find duplicate course titles").kind).toBe("duplicate_titles");
    expect(staffCommand("Show unpublished lessons awaiting review").kind).toBe("awaiting_review");
    expect(staffCommand("DROP TABLE users; run rm -rf").kind).toBe("knowledge");
  });
});

describe("model output", () => {
  it("keeps only citations of sources that were sent, and strips links", () => {
    const out = sanitizeOutput("CO means contractual [1]. See https://evil.example/x [7] and [2].", 2);
    expect(out.cited).toEqual([1, 2]);
    expect(out.text).not.toMatch(/evil|\[7\]/);
  });
});
