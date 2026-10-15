import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { BTN_OUTLINE, Empty, FIELD, Pill, Table, Td, when } from "@/components/admin/kit";

export const metadata = { title: "Audit log" };

/** Read-only view of the append-only audit log. Changes to it are refused by the database. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const actor = sp.actor?.trim() ? await prisma.user.findUnique({ where: { email: sp.actor.trim().toLowerCase() }, select: { id: true } }) : null;
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.outcome ? { outcome: sp.outcome } : {}),
    ...(sp.entity ? { entity: sp.entity } : {}),
    ...(sp.entityId ? { entityId: sp.entityId } : {}),
    ...(sp.actor?.trim() ? { actorId: actor?.id ?? "__none__" } : {}),
    ...(sp.from || sp.to ? { createdAt: { ...(sp.from ? { gte: new Date(sp.from) } : {}), ...(sp.to ? { lte: new Date(sp.to + "T23:59:59") } : {}) } } : {}),
  };
  const [rows, total, actions, entities] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 100, take: 100, include: { actor: { select: { name: true, email: true } } } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
  ]);
  const qs = (extra: Record<string, string | number>) => new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) }).toString();

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Administration" title="Audit log" lede={`${total} entries match. Entries cannot be edited or deleted; denied attempts are recorded too.`} />
      <form className="mt-8 flex flex-wrap items-end gap-2" role="search">
        <select name="action" defaultValue={sp.action ?? ""} aria-label="Action" className={`${FIELD} w-auto`}>
          <option value="">Any action</option>
          {actions.map((a) => (
            <option key={a.action}>{a.action}</option>
          ))}
        </select>
        <select name="entity" defaultValue={sp.entity ?? ""} aria-label="Record type" className={`${FIELD} w-auto`}>
          <option value="">Any record</option>
          {entities.map((e) => (
            <option key={e.entity}>{e.entity}</option>
          ))}
        </select>
        <select name="outcome" defaultValue={sp.outcome ?? ""} aria-label="Outcome" className={`${FIELD} w-auto`}>
          <option value="">Any outcome</option>
          <option value="success">success</option>
          <option value="failure">failure</option>
          <option value="denied">denied</option>
        </select>
        <input name="actor" defaultValue={sp.actor} placeholder="Actor email" aria-label="Actor email" className={`${FIELD} w-56`} />
        <input name="entityId" defaultValue={sp.entityId} placeholder="Record ID" aria-label="Record ID" className={`${FIELD} w-44`} />
        <input name="from" type="date" defaultValue={sp.from} aria-label="From" className={`${FIELD} w-auto`} />
        <input name="to" type="date" defaultValue={sp.to} aria-label="To" className={`${FIELD} w-auto`} />
        <button className={BTN_OUTLINE}>Filter</button>
      </form>
      <div className="mt-6">
        {rows.length === 0 ? (
          <Empty title="No entries match." />
        ) : (
          <Table head={["When", "Actor", "Action", "Record", "Outcome", "Detail"]} minWidth="70rem">
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-[12.5px]">{when(r.createdAt, true)}</Td>
                <Td className="text-[12.5px]">
                  {r.actor ? r.actor.name : r.actorId ? "deleted account" : "system"}
                  {r.actorRoles.length > 0 && <span className="block text-[11px] text-muted-foreground">{r.actorRoles.join(", ").toLowerCase().replace(/_/g, " ")}</span>}
                </Td>
                <Td className="text-data text-[12px]">{r.action}</Td>
                <Td className="text-[12.5px]">
                  {r.entity}
                  {r.entityId && (
                    <Link href={`?${qs({ entityId: r.entityId, page: 1 })}`} className="text-data block text-[11px] text-muted-foreground hover:underline">
                      {r.entityId}
                    </Link>
                  )}
                </Td>
                <Td>
                  <Pill tone={r.outcome === "success" ? "green" : r.outcome === "denied" ? "red" : "amber"}>{r.outcome}</Pill>
                </Td>
                <Td className="max-w-[28rem]">
                  {r.diff !== null && (
                    <details>
                      <summary className="cursor-pointer text-[12px] underline">View</summary>
                      <pre className="text-data mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all text-[11px]">{JSON.stringify(r.diff, null, 2)}</pre>
                    </details>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <nav className="mt-4 flex gap-3 text-micro" aria-label="Pages">
          {page > 1 && <Link href={`?${qs({ page: page - 1 })}`}>← Newer</Link>}
          {page * 100 < total && <Link href={`?${qs({ page: page + 1 })}`}>Older →</Link>}
        </nav>
      </div>
    </div>
  );
}
