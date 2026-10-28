import type { Prisma, SupportCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { can, canAny, isStaff, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { mask } from "@/lib/cms/screen";
import type { CourseSnapshot } from "@/lib/cms/snapshot";
import { eligibility } from "@/lib/certificates";
import { progressFor } from "@/lib/services/learning/progress";
import * as support from "@/lib/services/support/tickets";
import { LEARNER_STATUS_LABEL, STATUS_LABEL } from "@/lib/support/states";
import { knowledgeFor } from "@/lib/assistant/knowledge";
import { learnerIntent, staffCommand } from "@/lib/assistant/intents";
import { configuredProvider, ProviderUnavailable } from "@/lib/assistant/provider";
import { excerpt, MIN_SCORE, search, type Hit, type Passage } from "@/lib/assistant/search";
import { strings } from "@/lib/json-list";

/**
 * The learning assistant and the staff copilot.
 *
 * Facts about the person (progress, certificates, cases) come from the platform's records and are
 * never generated. Knowledge questions are answered from passages the person is allowed to read
 * (lib/assistant/knowledge.ts), either quoted directly or, if an AI provider is configured and
 * approved, summarised by it with citations. The model has no tools; the only things the
 * assistant can change are a support case the learner confirms and, for staff, an assignment the
 * staff member confirms, both carried out by the normal services with their own permission checks.
 */

export interface Citation {
  title: string;
  href: string;
  kind: Passage["kind"];
  context?: string;
  excerpt: string;
}

export interface ReplyPayload {
  mode?: "grounded" | "extractive" | "insufficient" | "facts" | "command";
  notice?: string;
  offerTicket?: { category: SupportCategory; subject: string; body: string };
  ticket?: { id: string; reference: string; status: string; team: string | null; assignee: string | null };
  items?: { label: string; href?: string; meta?: string }[];
  action?: { kind: "assign_ticket"; ticketId: string; reference: string; label: string; done?: boolean };
}

const MAX_QUESTION = 1000;
const RATE_WINDOW_MIN = 10;
const RATE_MAX = 20;
export const RETENTION_DAYS = 90;

const json = (v: unknown) => v as Prisma.InputJsonValue;

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

async function ownConversation(actor: Actor, id: string) {
  const c = await prisma.assistantConversation.findUnique({ where: { id } });
  if (!c || c.userId !== actor.id) throw new ServiceError("That conversation does not exist.");
  return c;
}

export async function listConversations(actor: Actor, mode: "learner" | "staff") {
  return prisma.assistantConversation.findMany({ where: { userId: actor.id, mode }, orderBy: { updatedAt: "desc" }, take: 30, select: { id: true, title: true, updatedAt: true } });
}

export async function conversationView(actor: Actor, id: string) {
  const c = await ownConversation(actor, id);
  const messages = await prisma.assistantMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  return { conversation: c, messages };
}

export async function deleteConversation(actor: Actor, id: string) {
  await ownConversation(actor, id);
  await prisma.assistantConversation.delete({ where: { id } });
  await audit({ actorId: actor.id, action: "delete", entity: "AssistantConversation", entityId: id });
}

/** Retention: conversations untouched for RETENTION_DAYS are deleted. */
export async function purgeAssistant(now = new Date()) {
  const res = await prisma.assistantConversation.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - RETENTION_DAYS * 86400_000) } } });
  if (res.count) await audit({ action: "delete", entity: "AssistantConversation", after: { retentionDays: RETENTION_DAYS, conversations: res.count } });
  return res.count;
}

export async function setFeedback(actor: Actor, messageId: string, feedback: "HELPFUL" | "NOT_HELPFUL" | "INCORRECT", note?: string) {
  const m = await prisma.assistantMessage.findUnique({ where: { id: messageId }, include: { conversation: { select: { userId: true } } } });
  if (!m || m.conversation.userId !== actor.id || m.role !== "ASSISTANT") throw new ServiceError("That answer does not exist.");
  await prisma.assistantMessage.update({ where: { id: messageId }, data: { feedback, feedbackNote: note ? mask(note.slice(0, 500)).text : null } });
}

// ---------------------------------------------------------------------------
// Asking
// ---------------------------------------------------------------------------

export interface AskInput {
  conversationId?: string | null;
  text: string;
  mode?: "learner" | "staff";
  /** "courseSlug/lessonId" when asked from a lesson. */
  context?: string | null;
}

export async function ask(actor: Actor, input: AskInput) {
  const mode = input.mode ?? "learner";
  if (mode === "staff" && !isStaff(actor)) throw new AuthorisationError("The staff copilot is for staff.", 403);
  const raw = (input.text ?? "").trim();
  if (!raw) throw new ServiceError("Type a question.");
  if (raw.length > MAX_QUESTION) throw new ServiceError(`Keep questions under ${MAX_QUESTION} characters.`);
  const recent = await prisma.assistantMessage.count({ where: { role: "USER", conversation: { userId: actor.id }, createdAt: { gt: new Date(Date.now() - RATE_WINDOW_MIN * 60_000) } } });
  if (recent >= RATE_MAX) throw new ServiceError(`You have asked ${RATE_MAX} questions in ${RATE_WINDOW_MIN} minutes. Please wait a few minutes.`);
  const q = mask(raw);

  const conversation = input.conversationId
    ? await ownConversation(actor, input.conversationId)
    : await prisma.assistantConversation.create({ data: { userId: actor.id, mode, title: q.text.slice(0, 80), context: input.context?.slice(0, 120) ?? null } });
  const context = conversation.context ?? input.context ?? null;
  const userMsg = await prisma.assistantMessage.create({ data: { conversationId: conversation.id, role: "USER", content: q.text } });

  const started = Date.now();
  const reply = mode === "staff" ? await staffAnswer(actor, q.text) : await learnerAnswer(actor, q.text, context);
  if (q.masked) reply.payload.notice = [reply.payload.notice, "Something that looked like an identifier was removed from your question before it was stored or searched."].filter(Boolean).join(" ");
  const saved = await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: reply.content,
      citations: json(reply.citations),
      payload: json(reply.payload),
      provider: reply.provider,
      model: reply.model ?? null,
      latencyMs: Date.now() - started,
      inputTokens: reply.inputTokens ?? null,
      outputTokens: reply.outputTokens ?? null,
    },
  });
  await prisma.assistantConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  return { conversationId: conversation.id, user: userMsg, reply: saved };
}

interface Reply {
  content: string;
  citations: Citation[];
  payload: ReplyPayload;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

const cite = (hits: Hit[], q: string): Citation[] => hits.map((h) => ({ title: h.passage.title, href: h.passage.href, kind: h.passage.kind, context: h.passage.context, excerpt: excerpt(h.passage.text, q) }));

function guessCategory(q: string): SupportCategory {
  const s = q.toLowerCase();
  if (/certificat/.test(s)) return "CERTIFICATE";
  if (/password|log ?in|sign ?in|two-step|account/.test(s)) return "LOGIN_ACCESS";
  if (/refund/.test(s)) return "REFUND";
  if (/pay|invoice|subscription|billing|charge/.test(s)) return "SUBSCRIPTION";
  if (/assessment|quiz|grade|score|exam|case attempt/.test(s)) return "ASSESSMENT";
  if (/lesson|module|course|content/.test(s)) return "MODULE_CONTENT";
  if (/error|bug|video|page|load|crash|broken/.test(s)) return "TECHNICAL";
  if (/access|enrol/.test(s)) return "ENROLLMENT";
  return "OTHER";
}

const ticketOffer = (q: string): ReplyPayload["offerTicket"] => ({ category: guessCategory(q), subject: q.replace(/\s+/g, " ").slice(0, 100), body: q });

/** Grounded answer: AI summary with citations if a provider is configured; otherwise quoted passages. */
async function grounded(actor: Actor, q: string, hits: Hit[], task: "answer" | "explain"): Promise<Reply> {
  const provider = configuredProvider();
  let notice: string | undefined;
  if (provider) {
    const used = hits.slice(0, 5);
    const t0 = Date.now();
    try {
      const out = await provider.generate({ question: q, passages: used.map((h) => h.passage), task });
      await audit({ actorId: actor.id, action: "create", entity: "AssistantGeneration", after: { provider: provider.name, model: out.model, passages: used.length, latencyMs: Date.now() - t0, inputTokens: out.inputTokens, outputTokens: out.outputTokens } });
      const cited = out.cited.length ? out.cited.map((i) => used[i - 1]).filter(Boolean) : used;
      return { content: out.text, citations: cite(cited, q), payload: { mode: "grounded", notice: "Written by an AI model from the approved material cited below. Check the sources; this is not official policy or professional advice." }, provider: provider.name, model: out.model, inputTokens: out.inputTokens, outputTokens: out.outputTokens };
    } catch (e) {
      if (!(e instanceof ProviderUnavailable)) throw e;
      notice = `${e.message} Here is what the approved material says instead.`;
    }
  }
  const top = hits.slice(0, 3);
  const body = top.map((h, i) => `${excerpt(h.passage.text, q)} [${i + 1}]`).join("\n\n");
  return { content: `From the approved material:\n\n${body}`, citations: cite(top, q), payload: { mode: "extractive", notice }, provider: "none" };
}

async function learnerAnswer(actor: Actor, q: string, context: string | null): Promise<Reply> {
  const lessonId = context?.split("/")[1] ?? null;
  const intent = learnerIntent(q, !!lessonId);

  if (intent === "human" || intent === "ticket") {
    return {
      content: "I can pass this to a person in the support team. Check the details below and send it; you will get a case number straight away and a notification when someone replies.",
      citations: [],
      payload: { mode: "facts", offerTicket: ticketOffer(q) },
      provider: "facts",
    };
  }

  if (intent === "my_tickets") {
    const tickets = await prisma.supportTicket.findMany({ where: { requesterId: actor.id }, orderBy: { updatedAt: "desc" }, take: 10, include: { team: { select: { name: true } }, assignee: { select: { name: true } } } });
    if (!tickets.length) return { content: "You have no support cases.", citations: [], payload: { mode: "facts" }, provider: "facts" };
    return {
      content: `Your ${tickets.length === 1 ? "case" : `${tickets.length} most recent cases`}, from the support system:`,
      citations: [],
      payload: { mode: "facts", items: tickets.map((t) => ({ label: `${t.reference}: ${t.subject}`, href: `/support/${t.id}`, meta: `${LEARNER_STATUS_LABEL[t.status]}${t.assignee ? ` · with ${t.assignee.name}` : t.team ? ` · ${t.team.name} queue` : ""}` })) },
      provider: "facts",
    };
  }

  if (intent === "my_certificates") {
    const certs = await prisma.certificate.findMany({ where: { userId: actor.id }, orderBy: { issuedAt: "desc" } });
    const help = (await knowledgeFor(actor)).passages.filter((p) => p.id === "help:certificate");
    return {
      content: certs.length ? "Your certificates. Open one for its verification page and the Download PDF link." : "You have no certificates yet. A certificate becomes available when you finish every lesson and pass every assessment in a released course.",
      citations: cite(help.map((p) => ({ passage: p, score: 1 })), q),
      payload: { mode: "facts", items: certs.map((c) => ({ label: c.programName, href: `/certificates/${c.serial}`, meta: `${c.serial}${c.revokedAt ? " · revoked" : ""}` })) },
      provider: "facts",
    };
  }

  if (intent === "my_progress") {
    const enrolments = await prisma.enrolment.findMany({ where: { userId: actor.id, state: { in: ["ACTIVE", "COMPLETED"] } }, include: { program: { select: { id: true, slug: true, publishedVersion: { select: { snapshot: true } } } } } });
    const items: ReplyPayload["items"] = [];
    for (const e of enrolments) {
      const s = e.program.publishedVersion?.snapshot as unknown as CourseSnapshot | undefined;
      if (!s) continue;
      const [p, el, awaiting] = await Promise.all([
        progressFor(actor.id, s),
        eligibility(actor.id, e.program.id),
        prisma.quizAttempt.count({ where: { userId: actor.id, status: "PENDING_REVIEW", quiz: { lesson: { module: { programId: e.program.id } } } } }),
      ]);
      const parts = [`${p.lessonsDone} of ${p.lessonsTotal} lessons`, `${el.quizzesPassed} of ${el.quizzesTotal} assessments passed`];
      if (awaiting) parts.push(`${awaiting} attempt${awaiting === 1 ? "" : "s"} waiting for an instructor to grade`);
      parts.push(el.eligible ? "certificate ready to claim" : p.next ? `next: ${p.next.title}` : "");
      items.push({ label: s.course.name, href: p.next && !el.eligible ? `/academy/${e.program.slug}/${p.next.id}` : `/academy/${e.program.slug}`, meta: parts.filter(Boolean).join(" · ") });
    }
    const help = (await knowledgeFor(actor)).passages.filter((p) => p.id === "help:assessment-incomplete" || p.id === "help:locked");
    return {
      content: items.length ? "Where you are, from your course records. A course certificate needs every lesson complete and every assessment passed." : "You are not enrolled in any course yet.",
      citations: cite(help.map((p) => ({ passage: p, score: 1 })), q),
      payload: { mode: "facts", items },
      provider: "facts",
    };
  }

  const k = await knowledgeFor(actor);
  if (intent === "explain_lesson" && lessonId) {
    const lessonPassages = k.byLesson.get(lessonId);
    if (!lessonPassages?.length) return { content: "I can only explain lessons you can open. Enrol in the course, or ask about the topic in general.", citations: [], payload: { mode: "insufficient" }, provider: "facts" };
    const hits = search(lessonPassages, q, 5);
    return grounded(actor, q, (hits.length ? hits : lessonPassages.slice(0, 3).map((p) => ({ passage: p, score: 1 }))), "explain");
  }

  const hits = search(k.passages, q, 6);
  if (!hits.length || hits[0].score < MIN_SCORE) {
    const related = hits.slice(0, 3);
    return {
      content: "I could not find an answer to that in the approved course material, library or help pages, so I will not guess." + (related.length ? " These might be related:" : "") + " If you need a person to help, send it to the support team below.",
      citations: cite(related, q),
      payload: { mode: "insufficient", offerTicket: ticketOffer(q) },
      provider: "none",
    };
  }
  return grounded(actor, q, hits, "answer");
}

// ---------------------------------------------------------------------------
// Learner hand-off to support
// ---------------------------------------------------------------------------

export async function createTicketFromAssistant(actor: Actor, conversationId: string, input: { category: string; subject: string; body: string }) {
  await ownConversation(actor, conversationId);
  const { ticket, team, assigneeName } = await support.openTicket(actor, {
    subject: input.subject,
    category: input.category,
    body: `${input.body}\n\n(Sent from the learning assistant.)`,
    source: "ASSISTANT",
    channel: "TICKET",
  });
  const status = LEARNER_STATUS_LABEL[ticket.status];
  const reply = await prisma.assistantMessage.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: `Your case ${ticket.reference} is open (${status.toLowerCase()}). ${assigneeName ? `${assigneeName}${team ? ` in ${team}` : ""} has it.` : team ? `It is in the ${team} queue.` : "It is in the support queue."} You will be notified when someone replies.`,
      payload: json({ mode: "facts", ticket: { id: ticket.id, reference: ticket.reference, status, team, assignee: assigneeName } } satisfies ReplyPayload),
      provider: "facts",
    },
  });
  await prisma.assistantConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  return reply;
}

// ---------------------------------------------------------------------------
// Staff copilot: read-only commands, drafts for review, and one confirmed action
// ---------------------------------------------------------------------------

const STAFF_HELP = [
  "Show open high-priority tickets for my team",
  "Show courses awaiting review",
  "Find duplicate course titles",
  "Find courses missing outcomes or assessments",
  "Which courses and lessons have the most support requests?",
  "Show recurring competency gaps",
  "Learners in <course name> who have not completed module 2",
  "Summarize SUP-2026-00001",
  "Draft a reply to SUP-2026-00001",
  "Assign SUP-2026-00001 to me (asks you to confirm)",
];

const denied = (what: string): Reply => ({ content: `Your role does not include ${what}.`, citations: [], payload: { mode: "command" }, provider: "facts" });
const listReply = (content: string, items: ReplyPayload["items"]): Reply => ({ content: items?.length ? content : "Nothing matches.", citations: [], payload: { mode: "command", items }, provider: "facts" });

async function ticketByRef(actor: Actor, reference: string) {
  const t = await prisma.supportTicket.findUnique({ where: { reference } });
  if (!t) return null;
  try {
    return await support.viewTicket(actor, t.id);
  } catch (e) {
    if (e instanceof AuthorisationError) return null;
    throw e;
  }
}

async function staffAnswer(actor: Actor, q: string): Promise<Reply> {
  const cmd = staffCommand(q);
  switch (cmd.kind) {
    case "help":
      return listReply("I answer from the platform's records and never change anything without your confirmation. Try:", STAFF_HELP.map((label) => ({ label })));

    case "high_priority_tickets": {
      if (!canAny(actor, ["support.view_assigned", "support.view_all"])) return denied("support cases");
      const rows = (await support.queue(actor, { view: cmd.team ? "team" : "high" })).filter((t) => t.priority === "HIGH" || t.priority === "URGENT");
      return listReply(`${rows.length} open high-priority case${rows.length === 1 ? "" : "s"}${cmd.team ? " in your teams" : ""}:`, rows.map((t) => ({ label: `${t.reference}: ${t.subject}`, href: `/admin/support/${t.id}`, meta: `${t.priority.toLowerCase()} · ${STATUS_LABEL[t.status]} · ${t.assignee?.name ?? "unassigned"}` })));
    }

    case "awaiting_review": {
      if (!can(actor, "content.view")) return denied("content");
      const [courses, library, cases] = await Promise.all([
        prisma.program.findMany({ where: { status: { in: ["ACADEMIC_REVIEW", "COMPLIANCE_REVIEW"] } }, select: { id: true, name: true, status: true } }),
        prisma.libraryEntry.findMany({ where: { status: "IN_REVIEW" }, select: { id: true, title: true } }),
        prisma.simCase.findMany({ where: { status: "IN_REVIEW" }, select: { id: true, title: true } }),
      ]);
      return listReply("Waiting for review:", [
        ...courses.map((c) => ({ label: c.name, href: `/admin/content/courses/${c.id}`, meta: `course · ${c.status.replace("_", " ").toLowerCase()}` })),
        ...cases.map((c) => ({ label: c.title, href: `/admin/cases/${c.id}`, meta: "case simulation" })),
        ...library.map((e) => ({ label: e.title, href: `/admin/content/library/${e.id}`, meta: "library entry" })),
      ]);
    }

    case "duplicate_titles": {
      if (!can(actor, "content.view")) return denied("content");
      const rows = await prisma.program.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true } });
      const groups = new Map<string, typeof rows>();
      for (const r of rows) groups.set(r.name.trim().toLowerCase(), [...(groups.get(r.name.trim().toLowerCase()) ?? []), r]);
      const dups = [...groups.values()].filter((g) => g.length > 1).flat();
      return listReply("Courses sharing a title:", dups.map((c) => ({ label: c.name, href: `/admin/content/courses/${c.id}` })));
    }

    case "missing_criteria": {
      if (!can(actor, "content.view")) return denied("content");
      const rows = await prisma.program.findMany({ where: { status: { not: "ARCHIVED" }, isTemplate: false }, select: { id: true, name: true, outcomes: true, modules: { select: { lessons: { select: { _count: { select: { quizzes: true } } } } } } } });
      const items = rows
        .map((c) => {
          const reasons = [];
          if (!strings(c.outcomes).length) reasons.push("no learning outcomes");
          if (!c.modules.some((m) => m.lessons.some((l) => l._count.quizzes > 0))) reasons.push("no assessment, so completion rests on lessons alone");
          return reasons.length ? { label: c.name, href: `/admin/content/courses/${c.id}`, meta: reasons.join("; ") } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x);
      return listReply("Courses missing outcomes or assessments:", items);
    }

    case "support_hotspots": {
      if (!can(actor, "support.view_all")) return denied("all support cases");
      const since = new Date(Date.now() - 90 * 86400_000);
      const [byCourse, byItem] = await Promise.all([
        prisma.supportTicket.groupBy({ by: ["programId"], where: { createdAt: { gte: since }, programId: { not: null } }, _count: { _all: true }, orderBy: { _count: { programId: "desc" } }, take: 5 }),
        prisma.supportTicket.groupBy({ by: ["relatedRef"], where: { createdAt: { gte: since }, relatedRef: { not: null } }, _count: { _all: true }, orderBy: { _count: { relatedRef: "desc" } }, take: 5 }),
      ]);
      const names = await prisma.program.findMany({ where: { id: { in: byCourse.map((b) => b.programId!) } }, select: { id: true, name: true } });
      return listReply("Support requests in the last 90 days, by course and by the lesson or item they were raised from:", [
        ...byCourse.map((b) => ({ label: names.find((n) => n.id === b.programId)?.name ?? "Unknown course", meta: `${b._count._all} cases` })),
        ...byItem.map((b) => ({ label: b.relatedRef!, meta: `${b._count._all} cases` })),
      ]);
    }

    case "competency_gaps": {
      if (!canAny(actor, ["assessment.grade", "reports.view"])) return denied("assessment results");
      const rows = await prisma.competencyOutcome.groupBy({ by: ["competencyId", "demonstrated"], where: { supersededAt: null }, _count: { _all: true } });
      const comps = await prisma.competency.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.competencyId))] } }, select: { id: true, code: true, name: true } });
      const items = comps
        .map((c) => {
          const no = rows.find((r) => r.competencyId === c.id && !r.demonstrated)?._count._all ?? 0;
          const yes = rows.find((r) => r.competencyId === c.id && r.demonstrated)?._count._all ?? 0;
          return { c, no, yes };
        })
        .filter((x) => x.no > 0)
        .sort((a, b) => b.no / (a.no + a.yes) - a.no / (b.no + b.yes) || 0)
        .map((x) => ({ label: `${x.c.code} ${x.c.name}`, meta: `${x.no} attempts without the evidence, ${x.yes} with` }));
      return listReply("Competencies most often not demonstrated in scored case attempts:", items);
    }

    case "not_completed_module": {
      if (!can(actor, "subscriber.view")) return denied("learner records");
      const course = await prisma.program.findFirst({ where: { name: { contains: cmd.course }, publishedVersionId: { not: null } }, select: { id: true, name: true, publishedVersion: { select: { snapshot: true } } } });
      if (!course) return listReply("", []);
      const s = course.publishedVersion!.snapshot as unknown as CourseSnapshot;
      const mod = s.modules[cmd.module - 1];
      if (!mod) return { content: `${course.name} has ${s.modules.length} modules.`, citations: [], payload: { mode: "command" }, provider: "facts" };
      const lessonIds = mod.lessons.map((l) => l.id);
      const enrolled = await prisma.enrolment.findMany({ where: { programId: course.id, state: "ACTIVE" }, select: { user: { select: { id: true, name: true, email: true } } } });
      const done = await prisma.progress.groupBy({ by: ["userId"], where: { userId: { in: enrolled.map((e) => e.user.id) }, lessonId: { in: lessonIds }, completedAt: { not: null } }, _count: { _all: true } });
      const items = enrolled
        .map((e) => ({ e, n: done.find((d) => d.userId === e.user.id)?._count._all ?? 0 }))
        .filter((x) => x.n < lessonIds.length)
        .map((x) => ({ label: x.e.user.name, href: `/admin/subscribers/${x.e.user.id}`, meta: `${x.n} of ${lessonIds.length} lessons of “${mod.title}”` }));
      return listReply(`Active learners in ${course.name} who have not completed module ${cmd.module} (“${mod.title}”):`, items);
    }

    case "summarize_ticket": {
      const v = await ticketByRef(actor, cmd.reference);
      if (!v) return { content: `I cannot open ${cmd.reference}: it does not exist or is not visible to you.`, citations: [], payload: { mode: "command" }, provider: "facts" };
      const t = v.ticket;
      const learnerMsgs = t.messages.filter((m) => m.authorId === t.requesterId);
      const staffMsgs = t.messages.filter((m) => m.authorId !== t.requesterId && !m.internal);
      const lines = [
        `${t.reference}: ${t.subject}`,
        `${STATUS_LABEL[t.status]} · ${t.priority.toLowerCase()} priority · ${t.team?.name ?? "no team"} · ${t.assignee?.name ?? "unassigned"}`,
        `Opened ${t.createdAt.toISOString().slice(0, 10)} from ${t.source.toLowerCase().replace("_", " ")}${t.program ? ` about ${t.program.name}` : ""}.`,
        `First message: ${(learnerMsgs[0]?.body ?? "").slice(0, 300)}`,
        learnerMsgs.length > 1 ? `Latest from the learner: ${learnerMsgs.at(-1)!.body.slice(0, 300)}` : "",
        staffMsgs.length ? `Latest reply from staff: ${staffMsgs.at(-1)!.body.slice(0, 300)}` : "No staff reply yet.",
        t.resolutionSummary ? `Resolution: ${t.resolutionSummary}` : "",
        `${t.messages.length} messages, ${t.reopenCount} reopen${t.reopenCount === 1 ? "" : "s"}.`,
      ].filter(Boolean);
      return { content: lines.join("\n"), citations: [], payload: { mode: "command", items: [{ label: `Open ${t.reference}`, href: `/admin/support/${t.id}` }] }, provider: "facts" };
    }

    case "draft_reply": {
      const v = await ticketByRef(actor, cmd.reference);
      if (!v) return { content: `I cannot open ${cmd.reference}: it does not exist or is not visible to you.`, citations: [], payload: { mode: "command" }, provider: "facts" };
      const templates = await prisma.responseTemplate.findMany({ where: { approved: true, archivedAt: null, OR: [{ category: v.ticket.category }, { category: null }] }, orderBy: { title: "asc" }, take: 5 });
      return {
        content: templates.length ? `Approved responses that fit ${support.CATEGORY_LABEL[v.ticket.category].toLowerCase()} cases. Adapt one on the case page; nothing is sent from here.` : "There are no approved responses for this topic yet. Write the reply on the case page.",
        citations: [],
        payload: { mode: "command", items: [...templates.map((t) => ({ label: t.title, meta: t.body.slice(0, 220) })), { label: `Open ${v.ticket.reference}`, href: `/admin/support/${v.ticket.id}` }] },
        provider: "facts",
      };
    }

    case "assign_to_me": {
      if (!can(actor, "support.respond")) return denied("answering support cases");
      const v = await ticketByRef(actor, cmd.reference);
      if (!v) return { content: `I cannot open ${cmd.reference}: it does not exist or is not visible to you.`, citations: [], payload: { mode: "command" }, provider: "facts" };
      if (v.ticket.assigneeId === actor.id) return { content: `${v.ticket.reference} is already assigned to you.`, citations: [], payload: { mode: "command", items: [{ label: `Open ${v.ticket.reference}`, href: `/admin/support/${v.ticket.id}` }] }, provider: "facts" };
      return {
        content: `${v.ticket.reference} is ${STATUS_LABEL[v.ticket.status].toLowerCase()} and ${v.ticket.assignee ? `assigned to ${v.ticket.assignee.name}` : "unassigned"}. Confirm to assign it to yourself. Your permissions are checked again when you confirm.`,
        citations: [],
        payload: { mode: "command", action: { kind: "assign_ticket", ticketId: v.ticket.id, reference: v.ticket.reference, label: `Assign ${v.ticket.reference} to me` } },
        provider: "facts",
      };
    }

    case "knowledge": {
      const k = await knowledgeFor(actor);
      const hits = search(k.passages, q, 6);
      if (!hits.length || hits[0].score < MIN_SCORE) return { content: "That is not a command I know, and the approved material does not answer it. Type “help” for what I can do.", citations: cite(hits.slice(0, 3), q), payload: { mode: "insufficient" }, provider: "none" };
      return grounded(actor, q, hits, "answer");
    }
  }
}

/** Carry out a proposed copilot action after the staff member confirms it. */
export async function confirmAction(actor: Actor, messageId: string) {
  const m = await prisma.assistantMessage.findUnique({ where: { id: messageId }, include: { conversation: true } });
  if (!m || m.conversation.userId !== actor.id) throw new ServiceError("That proposal does not exist.");
  const payload = (m.payload ?? {}) as ReplyPayload;
  if (!payload.action) throw new ServiceError("There is nothing to confirm.");
  if (payload.action.done) throw new ServiceError("This was already done.");
  // The normal service applies every permission and state check again.
  await support.assign(actor, payload.action.ticketId, actor.id);
  await prisma.assistantMessage.update({ where: { id: messageId }, data: { payload: json({ ...payload, action: { ...payload.action, done: true } }) } });
  return prisma.assistantMessage.create({
    data: { conversationId: m.conversationId, role: "ASSISTANT", content: `Done: ${payload.action.reference} is assigned to you.`, payload: json({ mode: "facts", items: [{ label: `Open ${payload.action.reference}`, href: `/admin/support/${payload.action.ticketId}` }] } satisfies ReplyPayload), provider: "facts" },
  });
}

