import Link from "next/link";
import type { AccountStatus } from "@prisma/client";
import { requirePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN_OUTLINE, Empty, FIELD, Panel, Pill, StatusPill, Table, Td, TEXTAREA, when } from "@/components/admin/kit";
import { inviteAction, requestExportApprovalAction } from "@/lib/actions/subscribers";
import { directory } from "@/lib/services/people/subscribers";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Subscribers" };

const STATUSES: AccountStatus[] = ["PENDING_VERIFICATION", "ACTIVE", "TRIAL", "PAYMENT_PENDING", "PAYMENT_FAILED", "GRACE_PERIOD", "SUSPENDED", "CANCELLED", "COMPLETED", "DEACTIVATED", "ARCHIVED"];

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("subscriber.view");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as AccountStatus) ? (sp.status as AccountStatus) : undefined;
  const filter = { q: sp.q?.trim() || undefined, status, courseId: sp.course || undefined, page: Number(sp.page) || 1 };
  const [d, courses, threshold] = await Promise.all([directory(actor, filter), prisma.program.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }), getSetting("export.approvalThreshold")]);
  const qs = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: filter.q, status, course: filter.courseId, ...extra })) if (v !== undefined && v !== "") p.set(k, String(v));
    return p.toString();
  };

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Subscribers" title="Subscriber directory" lede={`${d.total} learner account${d.total === 1 ? "" : "s"} match. Open a profile to manage status, access, notes and support history.`} />

      <form className="mt-8 flex flex-wrap items-end gap-2" role="search">
        <input name="q" defaultValue={filter.q} placeholder="Name, email or account ID" aria-label="Search" className={`${FIELD} max-w-xs`} />
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={`${FIELD} w-auto`}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </select>
        <select name="course" defaultValue={filter.courseId ?? ""} aria-label="Course" className={`${FIELD} w-auto`}>
          <option value="">Any course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className={BTN_OUTLINE}>Filter</button>
        {can(actor, "subscriber.export") && (
          <a href={`/api/exports/subscribers?${qs({})}`} className={`${BTN_OUTLINE} ml-auto`}>
            Export CSV
          </a>
        )}
      </form>

      <div className="mt-6">
        {d.rows.length === 0 ? (
          <Empty title="No one matches these filters." />
        ) : (
          <Table head={["Learner", "Status", "Plan", "Courses", "Certificates", "Registered", "Last sign-in", "Flags"]} minWidth="68rem">
            {d.rows.map((u) => (
              <tr key={u.id}>
                <Td>
                  <Link href={`/admin/subscribers/${u.id}`} className="font-medium hover:underline">
                    {u.name}
                  </Link>
                  <span className="block text-[12px] text-muted-foreground">{u.email}</span>
                </Td>
                <Td>
                  <StatusPill status={u.status} />
                </Td>
                <Td>{u.subscriptions[0]?.product.name ?? "—"}</Td>
                <Td>{u.enrolments.filter((e) => e.state === "ACTIVE" || e.state === "COMPLETED").length}</Td>
                <Td>{u.certificates.length}</Td>
                <Td>{when(u.createdAt)}</Td>
                <Td>{when(u.lastLoginAt)}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    {!u.emailVerified && <Pill tone="amber">unverified</Pill>}
                    {u.tickets.length > 0 && <Pill tone="blue">{u.tickets.length} open case</Pill>}
                    {u.orders.length > 0 && <Pill tone="red">payment issue</Pill>}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {d.pages > 1 && (
          <nav className="mt-4 flex items-center gap-3 text-micro" aria-label="Pages">
            {d.page > 1 && <Link href={`?${qs({ page: d.page - 1 })}`}>← Previous</Link>}
            <span>
              Page {d.page} of {d.pages}
            </span>
            {d.page < d.pages && <Link href={`?${qs({ page: d.page + 1 })}`}>Next →</Link>}
          </nav>
        )}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {can(actor, "subscriber.edit") && (
          <Panel title="Invite learners">
            <ActionForm action={inviteAction} className="flex flex-col gap-2" resetOnSuccess success="Invitations sent.">
              <textarea name="emails" rows={3} required placeholder="One or more email addresses" aria-label="Email addresses" className={TEXTAREA} />
              <button className={`${BTN_OUTLINE} w-fit`}>Send invitations</button>
            </ActionForm>
          </Panel>
        )}
        {can(actor, "subscriber.export") && (
          <Panel title="Large exports">
            <p className="text-[13px] text-muted-foreground">Exports above {threshold} rows need approval from someone with privacy authority. An approval lets the requester run the export for 24 hours.</p>
            <ActionForm action={requestExportApprovalAction} className="mt-2 flex flex-col gap-2" resetOnSuccess success="Requested.">
              <input type="hidden" name="rowCount" value={d.total} />
              <input name="reason" required placeholder="Purpose of the export" aria-label="Purpose" className={FIELD} />
              <button className={`${BTN_OUTLINE} w-fit`}>Request approval for {d.total} rows</button>
            </ActionForm>
          </Panel>
        )}
      </div>
    </div>
  );
}
