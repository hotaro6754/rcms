import { prisma } from "@/lib/db";
import { assertCan, type Actor } from "@/lib/actor";
import { getSetting } from "@/lib/settings";

/**
 * The seven dashboards in blueprint §9, computed from stored records only. A figure that the
 * platform cannot yet measure is returned as `null` with a note saying why, never as an
 * invented number.
 */

export interface Metric {
  label: string;
  value: number | string | null;
  format?: "int" | "pct" | "inr" | "hours" | "rating";
  note?: string;
  kpi?: string;
  href?: string;
}

export interface Breakdown {
  label: string;
  rows: { label: string; value: number | string }[];
}

export interface Board {
  metrics: Metric[];
  breakdowns: Breakdown[];
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
const since = (days: number) => new Date(Date.now() - days * 86400_000);
const LEARNER = { role: "STUDENT" as const, staffRoles: { none: {} }, NOT: { email: { endsWith: "@deleted.invalid" } } };

export const BOARDS = {
  executive: "Executive",
  learning: "Learning",
  subscribers: "Subscribers",
  support: "Support and chat",
  finance: "Financial",
  vendors: "Vendors",
  compliance: "Compliance and controls",
} as const;

export type BoardKey = keyof typeof BOARDS;

const BOARD_PERMISSION: Record<BoardKey, "reports.view" | "finance.view" | "vendor.view" | "audit.view"> = {
  executive: "reports.view",
  learning: "reports.view",
  subscribers: "reports.view",
  support: "reports.view",
  finance: "finance.view",
  vendors: "vendor.view",
  compliance: "audit.view",
};

export function boardsFor(actor: Actor): BoardKey[] {
  return (Object.keys(BOARDS) as BoardKey[]).filter((b) => actor.permissions.has(BOARD_PERMISSION[b]));
}

export async function board(actor: Actor, key: BoardKey, days = 30): Promise<Board> {
  await assertCan(actor, BOARD_PERMISSION[key], { entity: "Report", id: key });
  switch (key) {
    case "executive":
      return executive(days);
    case "learning":
      return learning(days);
    case "subscribers":
      return subscribers(days);
    case "support":
      return support(days);
    case "finance":
      return finance(days);
    case "vendors":
      return vendors();
    case "compliance":
      return compliance(days);
  }
}

async function completion() {
  const cutoff = since(7);
  const [done, eligible] = await Promise.all([
    prisma.enrolment.count({ where: { state: "COMPLETED", user: LEARNER } }),
    prisma.enrolment.count({ where: { state: { in: ["ACTIVE", "COMPLETED"] }, startedAt: { lte: cutoff }, user: LEARNER } }),
  ]);
  return pct(done, eligible);
}

async function passRate(days: number) {
  const where = { status: { in: ["GRADED" as const, "EXPIRED" as const] }, submittedAt: { gte: since(days) } };
  const [passed, total] = await Promise.all([prisma.quizAttempt.count({ where: { ...where, passed: true } }), prisma.quizAttempt.count({ where })]);
  return { rate: pct(passed, total), passed, total };
}

async function revenue(days: number) {
  const paid = await prisma.order.aggregate({ where: { state: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, paidAt: { gte: since(days) } }, _sum: { amount: true, discount: true, tax: true }, _count: true });
  const refunds = await prisma.refund.aggregate({ where: { status: "CONFIRMED", confirmedAt: { gte: since(days) } }, _sum: { amount: true } });
  return { gross: paid._sum.amount ?? 0, discount: paid._sum.discount ?? 0, tax: paid._sum.tax ?? 0, refunds: refunds._sum.amount ?? 0, orders: paid._count };
}

async function executive(days: number): Promise<Board> {
  const [registered, active, newEnrol, paidEnrol, compEnrol, byLevel, rate, pass, rev, failed, openCases, sat, awaiting, compliance, activeVendors, overdueDeliverables, webhookFailures] = await Promise.all([
    prisma.user.count({ where: LEARNER }),
    prisma.user.count({ where: { ...LEARNER, status: { in: ["ACTIVE", "TRIAL", "GRACE_PERIOD"] } } }),
    prisma.enrolment.count({ where: { createdAt: { gte: since(days) } } }),
    prisma.enrolment.count({ where: { createdAt: { gte: since(days) }, source: { in: ["PURCHASE", "SUBSCRIPTION"] } } }),
    prisma.enrolment.count({ where: { createdAt: { gte: since(days) }, source: { in: ["COMPLIMENTARY", "ADMIN", "FREE", "CORPORATE"] } } }),
    prisma.learningLevel.findMany({ orderBy: { sequence: "asc" }, select: { displayTitle: true, courses: { select: { _count: { select: { enrolments: true } } } } } }),
    completion(),
    passRate(days),
    revenue(days),
    prisma.order.count({ where: { state: "FAILED", updatedAt: { gte: since(days) } } }),
    prisma.supportTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.supportTicket.aggregate({ where: { rating: { not: null }, updatedAt: { gte: since(days) } }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.program.count({ where: { status: { in: ["ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED"] } } }),
    prisma.program.count({ where: { status: "COMPLIANCE_REVIEW" } }),
    prisma.vendor.count({ where: { status: { in: ["ACTIVE", "CONTRACTED"] } } }),
    prisma.deliverable.count({ where: { dueDate: { lt: new Date() }, status: { in: ["ASSIGNED", "IN_PROGRESS", "CHANGES_REQUESTED"] } } }),
    prisma.webhookEvent.count({ where: { status: "failed", createdAt: { gte: since(days) } } }),
  ]);
  const alerts = webhookFailures + overdueDeliverables + (await prisma.program.count({ where: { reviewDate: { lt: new Date() }, status: { not: "ARCHIVED" } } }));
  return {
    metrics: [
      { label: "Registered subscribers", value: registered, format: "int", kpi: "registered", href: "/admin/subscribers" },
      { label: "Active subscribers", value: active, format: "int", kpi: "active", href: "/admin/subscribers?status=ACTIVE" },
      { label: `New enrolments (${days}d)`, value: newEnrol, format: "int", kpi: "newEnrolments", note: `${paidEnrol} paid · ${compEnrol} complimentary, admin, free or corporate` },
      { label: "Course completion", value: rate, format: "pct", kpi: "completionRate" },
      { label: `Assessment pass rate (${days}d)`, value: pass.rate, format: "pct", kpi: "passRate", note: `${pass.passed} of ${pass.total} graded attempts` },
      { label: `Net revenue (${days}d)`, value: rev.gross - rev.refunds, format: "inr", kpi: "revenue", note: rev.orders ? `${rev.orders} paid orders` : "No paid orders in the period", href: "/admin/finance" },
      { label: `Refunds (${days}d)`, value: rev.refunds, format: "inr", kpi: "refunds", href: "/admin/finance/refunds" },
      { label: `Failed payments (${days}d)`, value: failed, format: "int", kpi: "failedPayments" },
      { label: "Active support cases", value: openCases, format: "int", kpi: "openCases", href: "/admin/support" },
      { label: `Satisfaction (${days}d)`, value: sat._count.rating ? Math.round((sat._avg.rating ?? 0) * 10) / 10 : null, format: "rating", kpi: "satisfaction", note: sat._count.rating ? `${sat._count.rating} ratings` : "No ratings yet" },
      { label: "Active vendors", value: activeVendors, format: "int", note: `${overdueDeliverables} overdue deliverables`, href: "/admin/vendors" },
      { label: "Content awaiting approval", value: awaiting, format: "int", kpi: "awaitingApproval", href: "/admin/content/review" },
      { label: "Compliance-review backlog", value: compliance, format: "int", kpi: "complianceBacklog", href: "/admin/content/review" },
      { label: "Critical alerts", value: alerts, format: "int", note: "Webhook failures, overdue deliverables and overdue content reviews", href: "/admin/reports/compliance" },
    ],
    breakdowns: [{ label: "Enrolments by learning level", rows: byLevel.map((l) => ({ label: l.displayTitle, value: l.courses.reduce((n, c) => n + c._count.enrolments, 0) })) }],
  };
}

async function learning(days: number): Promise<Board> {
  const [courses, activeLearners, enrolled, notStarted, pass, attemptsByQuiz, repeat, expiring, certs, overdue] = await Promise.all([
    prisma.program.findMany({ where: { state: "PUBLISHED" }, orderBy: { sortOrder: "asc" }, select: { name: true, _count: { select: { enrolments: true, certificates: true } } } }),
    prisma.progress.groupBy({ by: ["userId"], where: { lastViewedAt: { gte: since(days) } } }).then((r) => r.length),
    prisma.enrolment.count({ where: { state: "ACTIVE", user: LEARNER } }),
    prisma.enrolment.count({ where: { state: "ACTIVE", user: { ...LEARNER, progress: { none: {} } } } }),
    passRate(days),
    prisma.quizAttempt.groupBy({ by: ["quizId"], where: { status: { in: ["GRADED", "EXPIRED"] } }, _avg: { score: true }, _count: true }),
    prisma.quizAttempt.count({ where: { attemptNo: { gt: 1 }, createdAt: { gte: since(days) } } }),
    prisma.enrolment.count({ where: { state: "ACTIVE", expiresAt: { gte: new Date(), lte: new Date(Date.now() + 14 * 86400_000) } } }),
    prisma.certificate.count({ where: { issuedAt: { gte: since(days) }, revokedAt: null } }),
    prisma.program.count({ where: { reviewDate: { lt: new Date() }, status: { not: "ARCHIVED" } } }),
  ]);
  const quizNames = await prisma.quiz.findMany({ where: { id: { in: attemptsByQuiz.map((a) => a.quizId) } }, select: { id: true, title: true } });
  // Drop-off: lessons most often opened but not completed.
  const dropoff = await prisma.progress.groupBy({ by: ["lessonId"], where: { completedAt: null }, _count: true, orderBy: { _count: { lessonId: "desc" } }, take: 8 });
  const lessonNames = await prisma.lesson.findMany({ where: { id: { in: dropoff.map((d) => d.lessonId) } }, select: { id: true, title: true } });
  // Question difficulty, from stored per-question results of graded attempts.
  const recent = await prisma.quizAttempt.findMany({ where: { status: { in: ["GRADED", "EXPIRED"] } }, orderBy: { submittedAt: "desc" }, take: 500, select: { breakdown: true, snapshot: true } });
  const qstats = new Map<string, { prompt: string; right: number; total: number }>();
  for (const a of recent) {
    const results = (a.breakdown as { results?: { questionId: string; correct: boolean | null }[] } | null)?.results ?? [];
    const prompts = new Map(((a.snapshot as { questions?: { id: string; prompt: string }[] } | null)?.questions ?? []).map((q) => [q.id, q.prompt]));
    for (const r of results) {
      if (r.correct === null) continue;
      const s = qstats.get(r.questionId) ?? { prompt: prompts.get(r.questionId) ?? r.questionId, right: 0, total: 0 };
      s.total += 1;
      if (r.correct) s.right += 1;
      qstats.set(r.questionId, s);
    }
  }
  const hardest = [...qstats.values()].filter((s) => s.total >= 3).sort((a, b) => a.right / a.total - b.right / b.total).slice(0, 8);
  return {
    metrics: [
      { label: "Active enrolments", value: enrolled, format: "int" },
      { label: `Active learners (${days}d)`, value: activeLearners, format: "int", note: "Opened at least one lesson" },
      { label: "Not started", value: notStarted, format: "int", note: "Enrolled, no lesson opened" },
      { label: "Completion rate", value: await completion(), format: "pct", kpi: "completionRate" },
      { label: `Pass rate (${days}d)`, value: pass.rate, format: "pct", kpi: "passRate" },
      { label: `Repeat attempts (${days}d)`, value: repeat, format: "int" },
      { label: "Access expiring in 14 days", value: expiring, format: "int" },
      { label: `Certificates issued (${days}d)`, value: certs, format: "int" },
      { label: "Courses overdue for content review", value: overdue, format: "int", href: "/admin/content/review" },
      { label: "Content ratings", value: null, note: "Learners cannot rate content yet; not measured." },
    ],
    breakdowns: [
      { label: "Enrolments and certificates by course", rows: courses.map((c) => ({ label: c.name, value: `${c._count.enrolments} enrolled · ${c._count.certificates} certified` })) },
      { label: "Average score by assessment", rows: attemptsByQuiz.map((a) => ({ label: quizNames.find((q) => q.id === a.quizId)?.title ?? a.quizId, value: `${Math.round(a._avg.score ?? 0)}% over ${a._count} attempts` })) },
      { label: "Hardest questions (share answered correctly)", rows: hardest.map((h) => ({ label: h.prompt, value: `${Math.round((h.right / h.total) * 100)}% of ${h.total}` })) },
      { label: "Lessons most often left unfinished", rows: dropoff.map((d) => ({ label: lessonNames.find((l) => l.id === d.lessonId)?.title ?? d.lessonId, value: d._count })) },
    ],
  };
}

async function subscribers(days: number): Promise<Board> {
  const [newRegs, verified, total, active30, cancelled, suspended, corporate, countries, optIn, atRisk, renewals] = await Promise.all([
    prisma.user.count({ where: { ...LEARNER, createdAt: { gte: since(days) } } }),
    prisma.user.count({ where: { ...LEARNER, createdAt: { gte: since(days) }, emailVerified: true } }),
    prisma.user.count({ where: LEARNER }),
    prisma.user.count({ where: { ...LEARNER, lastLoginAt: { gte: since(30) } } }),
    prisma.subscription.count({ where: { cancelledAt: { gte: since(days) } } }),
    prisma.user.count({ where: { ...LEARNER, status: "SUSPENDED" } }),
    prisma.orgMember.count(),
    prisma.user.groupBy({ by: ["country"], where: LEARNER, _count: true, orderBy: { _count: { country: "desc" } }, take: 10 }),
    prisma.user.count({ where: { ...LEARNER, marketingOptIn: true } }),
    prisma.enrolment.count({ where: { state: "ACTIVE", user: { ...LEARNER, OR: [{ lastLoginAt: { lt: since(14) } }, { lastLoginAt: null }] } } }),
    prisma.order.count({ where: { state: "PAID", paidAt: { gte: since(days) }, product: { kind: "SUBSCRIPTION" }, user: { subscriptions: { some: { createdAt: { lt: since(days) } } } } } }),
  ]);
  return {
    metrics: [
      { label: `New registrations (${days}d)`, value: newRegs, format: "int" },
      { label: "Email verification completion", value: pct(verified, newRegs), format: "pct", note: `${verified} of ${newRegs} verified` },
      { label: "Active (signed in within 30 days)", value: active30, format: "int", note: `${total - active30} inactive` },
      { label: `Subscription renewals (${days}d)`, value: renewals, format: "int" },
      { label: `Cancellations (${days}d)`, value: cancelled, format: "int" },
      { label: "Suspended", value: suspended, format: "int" },
      { label: "Corporate learners", value: corporate, format: "int", note: `${Math.max(0, total - corporate)} individual` },
      { label: "At-risk learners", value: atRisk, format: "int", note: "Active enrolment, no sign-in for 14 days" },
      { label: "Marketing opt-in", value: pct(optIn, total), format: "pct" },
      { label: "Trial conversion", value: null, note: "No trial plans are configured yet." },
    ],
    breakdowns: [{ label: "Geography (self-reported country)", rows: countries.map((c) => ({ label: c.country ?? "Not given", value: c._count })) }],
  };
}

async function support(days: number): Promise<Board> {
  const where = { createdAt: { gte: since(days) } };
  const [incoming, answered, open, escalated, reopened, byCategory, workload, sat, abandoned, firsts] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { ...where, firstResponseAt: { not: null } } }),
    prisma.supportTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.supportTicket.count({ where: { status: "ESCALATED" } }),
    prisma.supportTicket.count({ where: { ...where, reopenCount: { gt: 0 } } }),
    prisma.supportTicket.groupBy({ by: ["category"], where, _count: true, orderBy: { _count: { category: "desc" } } }),
    prisma.supportTicket.groupBy({ by: ["assigneeId"], where: { status: { notIn: ["RESOLVED", "CLOSED"] } }, _count: true }),
    prisma.supportTicket.aggregate({ where: { ...where, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.supportTicket.count({ where: { ...where, channel: "CHAT", status: "CLOSED", firstResponseAt: null } }),
    prisma.supportTicket.findMany({ where: { ...where, firstResponseAt: { not: null } }, select: { createdAt: true, firstResponseAt: true, resolvedAt: true } }),
  ]);
  const agents = await prisma.user.findMany({ where: { id: { in: workload.map((w) => w.assigneeId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const cat = (c: string) => byCategory.find((b) => b.category === c)?._count ?? 0;
  return {
    metrics: [
      { label: `Incoming (${days}d)`, value: incoming, format: "int" },
      { label: "Answered", value: answered, format: "int" },
      { label: "Abandoned chats", value: abandoned, format: "int", note: "Chats closed before any staff reply" },
      { label: "Average first response", value: avg(firsts.map((f) => (+f.firstResponseAt! - +f.createdAt) / 3600_000)), format: "hours", kpi: "firstResponse" },
      { label: "Average resolution", value: avg(firsts.filter((f) => f.resolvedAt).map((f) => (+f.resolvedAt! - +f.createdAt) / 3600_000)), format: "hours" },
      { label: "Open cases", value: open, format: "int", kpi: "openCases" },
      { label: "Escalated", value: escalated, format: "int" },
      { label: "Reopened", value: reopened, format: "int" },
      { label: "Satisfaction", value: sat._count.rating ? Math.round((sat._avg.rating ?? 0) * 10) / 10 : null, format: "rating", kpi: "satisfaction" },
      { label: "Payment-related", value: cat("PAYMENT") + cat("REFUND") + cat("SUBSCRIPTION"), format: "int" },
      { label: "Academic content", value: cat("MODULE_CONTENT") + cat("ASSESSMENT") + cat("FACULTY"), format: "int" },
      { label: "Privacy or security alerts", value: cat("PRIVACY_SECURITY"), format: "int" },
      { label: "Agent quality score", value: null, note: "Chat quality reviews are not recorded in-app yet." },
    ],
    breakdowns: [
      { label: "Cases by category", rows: byCategory.map((b) => ({ label: b.category.replace(/_/g, " ").toLowerCase(), value: b._count })) },
      { label: "Open cases by agent", rows: workload.map((w) => ({ label: agents.find((a) => a.id === w.assigneeId)?.name ?? "Unassigned", value: w._count })) },
    ],
  };
}

async function finance(days: number): Promise<Board> {
  const rev = await revenue(days);
  const [paid, failed, outstanding, disputes, subRev, corpRev, byCourse, obligations, vendorPaid, exceptions] = await Promise.all([
    prisma.order.count({ where: { state: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, paidAt: { gte: since(days) } } }),
    prisma.order.count({ where: { state: "FAILED", updatedAt: { gte: since(days) } } }),
    prisma.order.count({ where: { state: { in: ["CREATED", "PENDING"] }, createdAt: { lt: since(1) } } }),
    prisma.order.count({ where: { state: "DISPUTED" } }),
    prisma.order.aggregate({ where: { state: { in: ["PAID", "PARTIALLY_REFUNDED"] }, paidAt: { gte: since(days) }, product: { kind: "SUBSCRIPTION" } }, _sum: { amount: true } }),
    prisma.order.aggregate({ where: { state: { in: ["PAID", "PARTIALLY_REFUNDED"] }, paidAt: { gte: since(days) }, orgId: { not: null } }, _sum: { amount: true } }),
    prisma.order.groupBy({ by: ["productId"], where: { state: { in: ["PAID", "PARTIALLY_REFUNDED"] }, paidAt: { gte: since(days) } }, _sum: { amount: true } }),
    prisma.vendorInvoice.aggregate({ where: { status: { in: ["APPROVED", "PAYMENT_INITIATED", "VALIDATED"] } }, _sum: { amount: true } }),
    prisma.vendorInvoice.aggregate({ where: { status: { in: ["PAID", "RECONCILED"] }, paidAt: { gte: since(days) } }, _sum: { amount: true } }),
    prisma.payment.count({ where: { reconciliation: "EXCEPTION" } }),
  ]);
  const products = await prisma.product.findMany({ where: { id: { in: byCourse.map((b) => b.productId) } }, select: { id: true, name: true } });
  return {
    metrics: [
      { label: `Gross sales (${days}d)`, value: rev.gross, format: "inr", kpi: "revenue" },
      { label: "Discounts", value: rev.discount, format: "inr" },
      { label: "Tax collected", value: rev.tax, format: "inr" },
      { label: "Refunds", value: rev.refunds, format: "inr", kpi: "refunds" },
      { label: "Net collected", value: rev.gross - rev.refunds, format: "inr", kpi: "revenue" },
      { label: "Subscription revenue", value: subRev._sum.amount ?? 0, format: "inr" },
      { label: "Corporate revenue", value: corpRev._sum.amount ?? 0, format: "inr" },
      { label: "Payment success rate", value: pct(paid, paid + failed), format: "pct", kpi: "paymentSuccess" },
      { label: "Failed payments", value: failed, format: "int", kpi: "failedPayments" },
      { label: "Outstanding orders", value: outstanding, format: "int", note: "Created over a day ago, not paid" },
      { label: "Disputes and chargebacks", value: disputes, format: "int" },
      { label: "Vendor payment obligations", value: obligations._sum.amount ?? 0, format: "inr", href: "/admin/finance/settlements" },
      { label: `Vendor payments completed (${days}d)`, value: vendorPaid._sum.amount ?? 0, format: "inr" },
      { label: "Reconciliation exceptions", value: exceptions, format: "int", href: "/admin/finance?reconciliation=EXCEPTION" },
    ],
    breakdowns: [{ label: "Revenue by product", rows: byCourse.map((b) => ({ label: products.find((p) => p.id === b.productId)?.name ?? b.productId, value: `₹${((b._sum.amount ?? 0) / 100).toLocaleString("en-IN")}` })) }],
  };
}

async function vendors(): Promise<Board> {
  const now = new Date();
  const [active, pending, expiring, due, overdue, reviewed, accepted, rework, quality, outstanding, approved, highRisk, offboarding] = await Promise.all([
    prisma.vendor.count({ where: { status: { in: ["ACTIVE", "CONTRACTED"] } } }),
    prisma.vendor.count({ where: { status: { in: ["PROPOSED", "DUE_DILIGENCE", "DOCUMENTS_PENDING", "UNDER_REVIEW"] } } }),
    prisma.vendor.count({ where: { contractEnd: { gte: now, lte: new Date(Date.now() + 60 * 86400_000) } } }),
    prisma.deliverable.count({ where: { dueDate: { gte: now, lte: new Date(Date.now() + 14 * 86400_000) }, status: { in: ["ASSIGNED", "IN_PROGRESS", "CHANGES_REQUESTED"] } } }),
    prisma.deliverable.count({ where: { dueDate: { lt: now }, status: { in: ["ASSIGNED", "IN_PROGRESS", "CHANGES_REQUESTED"] } } }),
    prisma.deliverable.count({ where: { status: { in: ["ACCEPTED", "REJECTED", "CHANGES_REQUESTED"] } } }),
    prisma.deliverable.count({ where: { status: "ACCEPTED" } }),
    prisma.deliverable.aggregate({ _sum: { reworkCount: true }, _count: true }),
    prisma.deliverable.aggregate({ where: { qualityScore: { not: null } }, _avg: { qualityScore: true } }),
    prisma.vendorInvoice.count({ where: { status: { in: ["SUBMITTED", "VALIDATED"] } } }),
    prisma.vendorInvoice.count({ where: { status: "APPROVED" } }),
    prisma.vendor.count({ where: { riskRating: "high", status: { notIn: ["OFFBOARDED"] } } }),
    prisma.vendor.count({ where: { status: "OFFBOARDING" } }),
  ]);
  return {
    metrics: [
      { label: "Active vendors", value: active, format: "int", href: "/admin/vendors" },
      { label: "Pending approval", value: pending, format: "int" },
      { label: "Contracts expiring in 60 days", value: expiring, format: "int" },
      { label: "Deliverables due in 14 days", value: due, format: "int" },
      { label: "Overdue deliverables", value: overdue, format: "int" },
      { label: "Acceptance rate", value: pct(accepted, reviewed), format: "pct", kpi: "acceptanceRate" },
      { label: "Rework per deliverable", value: rework._count ? Math.round(((rework._sum.reworkCount ?? 0) / rework._count) * 10) / 10 : null, format: "rating" },
      { label: "Quality rating (1–5)", value: quality._avg.qualityScore ? Math.round(quality._avg.qualityScore * 10) / 10 : null, format: "rating" },
      { label: "Invoices awaiting finance", value: outstanding, format: "int", href: "/admin/finance/settlements" },
      { label: "Approved settlements awaiting payment", value: approved, format: "int" },
      { label: "High-risk vendors", value: highRisk, format: "int" },
      { label: "Offboarding", value: offboarding, format: "int" },
      { label: "Vendor SLA performance", value: null, note: "SLA targets are contract-specific and are not configured." },
    ],
    breakdowns: [],
  };
}

async function compliance(days: number): Promise<Board> {
  const staffIds = (await prisma.user.findMany({ where: { OR: [{ role: { in: ["OWNER", "ADMIN", "TRAINER"] } }, { staffRoles: { some: {} } }] }, select: { id: true } })).map((u) => u.id);
  const threshold = Number(await getSetting("export.approvalThreshold"));
  const [loginFailures, mfaFailures, roleChanges, unapproved, overdue, exports, refundExceptions, vendorAccess, privacy, incidents, denied, integrationFailures] = await Promise.all([
    prisma.auditLog.count({ where: { action: { in: ["login_failed", "lockout"] }, actorId: { in: staffIds }, createdAt: { gte: since(days) } } }),
    prisma.auditLog.count({ where: { action: "mfa_failed", createdAt: { gte: since(days) } } }),
    prisma.approvalRequest.count({ where: { kind: "ROLE_CHANGE", status: "EXECUTED", decidedAt: { gte: since(days) } } }),
    prisma.courseVersion.count({ where: { academicApproverId: null, version: { gt: 1 } } }),
    prisma.program.count({ where: { reviewDate: { lt: new Date() }, status: { not: "ARCHIVED" } } }),
    prisma.auditLog.findMany({ where: { action: "export", createdAt: { gte: since(days) } }, select: { diff: true } }),
    prisma.refund.count({ where: { exceptional: true, createdAt: { gte: since(days) } } }),
    prisma.vendor.count({ where: { accessExpiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400_000) } } }),
    prisma.privacyRequest.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.supportTicket.count({ where: { category: "PRIVACY_SECURITY", status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.auditLog.count({ where: { outcome: "denied", createdAt: { gte: since(days) } } }),
    prisma.webhookEvent.count({ where: { status: "failed", createdAt: { gte: since(days) } } }),
  ]);
  const largeExports = exports.filter((e) => Number((e.diff as { after?: { rows?: number } } | null)?.after?.rows ?? 0) > threshold).length;
  return {
    metrics: [
      { label: `Administrator login failures (${days}d)`, value: loginFailures, format: "int", href: "/admin/audit?action=login_failed" },
      { label: `MFA failures (${days}d)`, value: mfaFailures, format: "int" },
      { label: `Privileged-access changes (${days}d)`, value: roleChanges, format: "int", href: "/admin/approvals" },
      { label: "Releases without complete approval", value: unapproved, format: "int", note: "Excludes version 1 of courses migrated from the pre-review platform" },
      { label: "Overdue content reviews", value: overdue, format: "int", href: "/admin/content/review" },
      { label: `Large subscriber exports (${days}d)`, value: largeExports, format: "int", note: `Above ${threshold} rows` },
      { label: `Refund exceptions (${days}d)`, value: refundExceptions, format: "int" },
      { label: "Vendor access expiring in 30 days", value: vendorAccess, format: "int" },
      { label: "Open privacy requests", value: privacy, format: "int", href: "/admin/privacy" },
      { label: "Open security incidents", value: incidents, format: "int", note: "Privacy or security support cases" },
      { label: `Access denials logged (${days}d)`, value: denied, format: "int", href: "/admin/audit?outcome=denied" },
      { label: `Integration failures (${days}d)`, value: integrationFailures, format: "int", note: "Payment webhooks that failed processing" },
      { label: "Backup status", value: null, note: "Backups are run by the database provider and are not visible to the application. Record checks in the runbook (docs/OPERATIONS.md)." },
      { label: "Suspicious payment activity", value: null, note: "No automated fraud signal is configured; rely on the provider's risk tools." },
    ],
    breakdowns: [],
  };
}
