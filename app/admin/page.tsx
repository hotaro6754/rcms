import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHead, Ruled } from "@/components/platform/PlatformShell";

export const metadata = { title: "Admin overview" };

const WHEN = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

/**
 * The owner's overview, set as the first page of a report.
 *
 * Every figure is a real count against the database. Revenue is absent rather than zero:
 * payments are not live yet, and a zero would read as a business problem instead of an
 * unbuilt feature. It says so in one line, in the page's own voice.
 */
export default async function AdminOverviewPage() {
  await requireAdmin();

  const [students, activeEnrolments, completedEnrolments, leads, newLeads, publishedLessons, certificates, completions, recentLeads, recentAudit] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.enrolment.count({ where: { state: "ACTIVE" } }),
      prisma.enrolment.count({ where: { state: "COMPLETED" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { stage: "NEW" } }),
      prisma.lesson.count({ where: { state: "PUBLISHED" } }),
      prisma.certificate.count({ where: { revokedAt: null } }),
      prisma.progress.count({ where: { completedAt: { not: null } } }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, email: true, stage: true, score: true, interestedIn: true, source: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, action: true, entity: true, createdAt: true, actor: { select: { name: true } } },
      }),
    ]);

  const figures = [
    { label: "Students", value: students, note: "verified accounts", href: "/admin/students" },
    { label: "Enrolled now", value: activeEnrolments, note: `${completedEnrolments} completed`, href: "/admin/students" },
    { label: "Certificates", value: certificates, note: "valid, issued", href: "/admin/certificates" },
    { label: "Leads", value: leads, note: `${newLeads} not yet worked`, href: "/admin/leads" },
    { label: "Lessons live", value: publishedLessons, note: `${completions} completions`, href: "/admin/programs" },
  ];

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <PageHead
        kicker="Admin"
        title="Overview"
        lede="The Academy as it stands. Revenue appears here once payments are live; until then it is left out rather than shown as zero."
      />

      <dl className="mt-10 grid grid-cols-2 border-b border-border sm:grid-cols-3 lg:grid-cols-5">
        {figures.map((f) => (
          <div key={f.label} className="border-t-2 border-foreground pb-6 pr-6 pt-3">
            <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">{f.label.toUpperCase()}</dt>
            <dd>
              <Link href={f.href} className="font-serif-display mt-3 block text-[clamp(2.6rem,4vw,3.6rem)] leading-none hover:underline hover:decoration-1 hover:underline-offset-8">
                {f.value}
              </Link>
              <span className="mt-2 block text-[13px] text-muted-foreground">{f.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-14 lg:grid-cols-2">
        <Ruled
          label="Latest enquiries"
          aside={
            <Link href="/admin/leads" className="text-data text-[10.5px] tracking-[0.1em] text-subtle hover:text-foreground">
              ALL LEADS →
            </Link>
          }
        >
          {recentLeads.length === 0 ? (
            <p className="py-5 text-[14px] text-muted-foreground">No enquiries yet. The contact form and the monthly letter write here.</p>
          ) : (
            <ul>
              {recentLeads.map((l) => (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border py-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px]">{l.name}</span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {l.email}
                      {l.interestedIn ? ` · ${l.interestedIn}` : ""}
                    </span>
                  </span>
                  <span className="text-data text-right text-[10.5px] tracking-[0.08em] text-subtle">
                    {l.source.replace("_", " ").toUpperCase()} · {l.stage} · {l.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Ruled>

        <Ruled label="Audit trail">
          <ul>
            {recentAudit.map((a) => (
              <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border py-3">
                <span className="text-[13.5px]">
                  <span className="text-data mr-2 text-[10.5px] uppercase tracking-[0.08em] text-subtle">{a.action}</span>
                  {a.entity}
                  {a.actor?.name && <span className="text-muted-foreground"> · {a.actor.name}</span>}
                </span>
                <span className="text-data text-[11px] text-subtle">{WHEN.format(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Ruled>
      </div>
    </div>
  );
}
