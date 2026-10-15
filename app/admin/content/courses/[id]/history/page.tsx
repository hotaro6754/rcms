import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN_OUTLINE, Empty, FIELD, Panel, when } from "@/components/admin/kit";
import { rollbackRevisionAction, workflowAction } from "@/lib/actions/cms";
import { compareRevisions } from "@/lib/services/cms/history";

export const metadata = { title: "Versions and history" };

function show(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v.length > 300 ? v.slice(0, 300) + "…" : v;
  const s = JSON.stringify(v);
  return s.length > 300 ? s.slice(0, 300) + "…" : s;
}

/**
 * Released versions (rollback re-releases one) and the field-level change history of every
 * item in the course (compare any two versions of an item, restore any earlier one).
 */
export default async function HistoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ a?: string; b?: string; entity?: string }> }) {
  const actor = await requirePagePermission("content.view");
  const { id } = await params;
  const sp = await searchParams;
  const course = await prisma.program.findUnique({ where: { id }, select: { id: true, name: true, publishedVersionId: true, status: true } });
  if (!course) notFound();

  const [versions, revisions] = await Promise.all([
    prisma.courseVersion.findMany({ where: { courseId: id }, orderBy: { version: "desc" }, select: { id: true, version: true, publishedAt: true, changeSummary: true, publishedById: true, academicApproverId: true, complianceApproverId: true, effectiveDate: true } }),
    prisma.contentRevision.findMany({ where: { courseId: id, ...(sp.entity ? { entityId: sp.entity } : {}) }, orderBy: { createdAt: "desc" }, take: 150 }),
  ]);
  const people = await prisma.user.findMany({
    where: { id: { in: [...versions.flatMap((v) => [v.publishedById, v.academicApproverId, v.complianceApproverId]), ...revisions.map((r) => r.editorId)].filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });
  const name = (uid: string | null) => (uid ? (people.find((p) => p.id === uid)?.name ?? "Unknown") : "System");

  const comparison = sp.a && sp.b ? await compareRevisions(sp.a, sp.b).catch(() => null) : null;
  const canRollback = can(actor, "content.edit") && !["ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED", "ARCHIVED"].includes(course.status);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href={`/admin/content/courses/${id}`} className="text-micro text-muted-foreground hover:text-foreground">
        ← {course.name}
      </Link>
      <PageHead kicker="Versions and history" title={course.name} lede="Every release is immutable. Every edit is recorded with who made it, why, and what changed." />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title="Released versions">
          {versions.length === 0 ? (
            <p className="text-micro text-muted-foreground">Not released yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {versions.map((v) => (
                <li key={v.id} className="py-3">
                  <p className="text-[14px] font-medium">
                    Version {v.version} {v.id === course.publishedVersionId && <span className="text-data ml-2 text-[10.5px] text-success">LIVE</span>}
                  </p>
                  <p className="text-micro text-muted-foreground">
                    {when(v.publishedAt, true)} · published by {name(v.publishedById)} · academic: {name(v.academicApproverId)}
                    {v.complianceApproverId ? ` · compliance: ${name(v.complianceApproverId)}` : ""}
                  </p>
                  {v.changeSummary && <p className="mt-1 text-[13px]">{v.changeSummary}</p>}
                  {can(actor, "content.publish") && v.id !== course.publishedVersionId && course.status !== "ARCHIVED" && (
                    <ActionForm action={workflowAction} className="mt-2 flex flex-wrap items-end gap-2" confirm={`Make version ${v.version} live again for every learner?`}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="op" value="rollback" />
                      <input type="hidden" name="versionId" value={v.id} />
                      <input name="comment" required placeholder="Reason for rolling back" aria-label="Reason for rolling back" className={`${FIELD} max-w-xs`} />
                      <button className={BTN_OUTLINE}>Roll back to this version</button>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={sp.entity ? "Changes to one item" : "All changes"} aside={sp.entity ? <Link href="?" className="text-micro underline">Show all</Link> : undefined}>
          {comparison && (
            <div className="mb-5 rounded-[3px] border border-border bg-secondary/40 px-3 py-3">
              <p className="text-[13px] font-semibold">
                {comparison.older.entityType} v{comparison.older.version} → v{comparison.newer.version}
              </p>
              {Object.keys(comparison.changes).length === 0 ? (
                <p className="text-micro text-muted-foreground">No differences.</p>
              ) : (
                <table className="mt-2 w-full text-left text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="label-caps py-1 pr-3 font-normal">Field</th>
                      <th className="label-caps py-1 pr-3 font-normal">Before</th>
                      <th className="label-caps py-1 font-normal">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(comparison.changes).map(([f, c]) => (
                      <tr key={f}>
                        <td className="py-1.5 pr-3 align-top font-medium">{f}</td>
                        <td className="py-1.5 pr-3 align-top text-danger">{show(c.from)}</td>
                        <td className="py-1.5 align-top text-success">{show(c.to)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {revisions.length === 0 ? (
            <Empty title="No changes recorded" />
          ) : (
            <ul className="divide-y divide-border">
              {revisions.map((r, i) => {
                const prev = revisions.slice(i + 1).find((x) => x.entityId === r.entityId);
                return (
                  <li key={r.id} className="py-3">
                    <p className="text-[13px]">
                      <span className="text-data mr-2 text-[10.5px] text-subtle">{r.entityType.toUpperCase()} v{r.version}</span>
                      {r.reason ?? "Edited"} · {name(r.editorId)} · <span className="text-muted-foreground">{when(r.createdAt, true)}</span>
                    </p>
                    <p className="mt-0.5 text-micro text-muted-foreground">Fields: {Object.keys(r.changes as object).join(", ") || "—"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-micro">
                      <Link href={`?entity=${r.entityId}`} className="underline underline-offset-4">
                        History of this item
                      </Link>
                      {prev && (
                        <Link href={`?a=${prev.id}&b=${r.id}${sp.entity ? `&entity=${sp.entity}` : ""}`} className="underline underline-offset-4">
                          Compare with v{prev.version}
                        </Link>
                      )}
                      {canRollback && revisions.slice(0, i).some((x) => x.entityId === r.entityId) && (
                        <ActionForm action={rollbackRevisionAction} className="flex items-center gap-1.5" confirm={`Restore ${r.entityType.toLowerCase()} to version ${r.version}? This becomes a new version; nothing is erased.`}>
                          <input type="hidden" name="revisionId" value={r.id} />
                          <input type="hidden" name="courseId" value={id} />
                          <input name="reason" required placeholder="Reason" aria-label="Reason for restoring" className="min-h-8 w-40 rounded-[3px] border border-input bg-card px-2 text-[12px]" />
                          <button className="min-h-8 rounded-[3px] border border-input px-2 text-[12px] hover:bg-secondary">Restore this version</button>
                        </ActionForm>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
