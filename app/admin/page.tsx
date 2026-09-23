import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { inr } from "@/lib/data/catalog";

export const metadata = { title: "Admin overview" };

/**
 * Executive overview.
 *
 * Every figure here is a real count against the database. Where a number cannot be real yet
 * — revenue, which needs Phase 1 — it says so rather than showing a plausible zero, because
 * a zero and "not wired up" look identical and only one of them is a problem.
 */
export default async function AdminOverviewPage() {
  await requireAdmin();

  const [
    students,
    activeEnrolments,
    leads,
    newLeads,
    programs,
    publishedLessons,
    completions,
    recentLeads,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.enrolment.count({ where: { state: "ACTIVE" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { stage: "NEW" } }),
    prisma.program.count({ where: { state: "PUBLISHED" } }),
    prisma.lesson.count({ where: { state: "PUBLISHED" } }),
    prisma.progress.count({ where: { completedAt: { not: null } } }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, stage: true, score: true, interestedIn: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entity: true, createdAt: true, actor: { select: { name: true } } },
    }),
  ]);

  const kpis = [
    { label: "Students", value: String(students), note: "verified accounts" },
    { label: "Active enrolments", value: String(activeEnrolments), note: "across all programs" },
    { label: "Leads", value: String(leads), note: `${newLeads} not yet worked` },
    { label: "Lessons published", value: String(publishedLessons), note: `${programs} programs live` },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header>
        <p className="label-caps">Admin</p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Overview</h1>
      </header>

      <dl className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card p-5">
            <dt className="label-caps text-[11px]">{k.label}</dt>
            <dd className="text-data mt-2.5 text-[30px] font-medium leading-none">{k.value}</dd>
            <p className="mt-2 text-micro text-muted-foreground">{k.note}</p>
          </div>
        ))}
      </dl>

      <div className="rounded-[var(--radius)] border border-warning/30 bg-warning-bg px-4 py-3">
        <p className="text-micro leading-relaxed text-warning">
          Revenue, MRR and conversion are not on this page yet. Payments land in Phase 1 and
          the finance surface in Phase 6. A zero here would look like a business problem
          rather than an unbuilt feature, so the tiles are absent instead. Programs currently
          price from {inr(2999)}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="gap-0 border-b border-border px-5 py-4 [.border-b]:pb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[13.5px] font-semibold">Latest enquiries</h2>
              <Link href="/admin/leads" className="text-micro text-primary hover:underline">
                All leads →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {recentLeads.length === 0 ? (
              <p className="px-5 py-6 text-micro text-muted-foreground">
                No enquiries yet. The contact form writes here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentLeads.map((l) => (
                  <li key={l.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{l.name}</span>
                      <span className="text-data block truncate text-micro text-muted-foreground">
                        {l.email}
                        {l.interestedIn ? ` · ${l.interestedIn}` : ""}
                      </span>
                    </span>
                    <span className="text-data shrink-0 text-micro text-muted-foreground">
                      {l.stage.toLowerCase()} · {l.score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="gap-0 border-b border-border px-5 py-4 [.border-b]:pb-4">
            <h2 className="text-[13.5px] font-semibold">Audit trail</h2>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <ul className="divide-y divide-border">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 px-5 py-3">
                  <span className="text-[13px]">
                    {a.action} <span className="text-muted-foreground">{a.entity}</span>
                    {a.actor?.name && (
                      <span className="text-micro text-subtle"> · {a.actor.name}</span>
                    )}
                  </span>
                  <span className="text-data shrink-0 text-micro text-muted-foreground">
                    {a.createdAt.toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="text-micro text-muted-foreground">
        {completions} lesson completions recorded.
      </p>
    </div>
  );
}
