import Link from "next/link";
import type { SupportCategory, SupportStatus } from "@prisma/client";
import { requirePagePermission, can } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, Pill, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { queue, CATEGORY_LABEL } from "@/lib/services/support/tickets";
import { assignAction } from "@/lib/actions/support";

export const metadata = { title: "Support queue" };

const STATUSES: SupportStatus[] = ["WAITING", "ASSIGNED", "IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "ESCALATED", "REOPENED", "RESOLVED", "CLOSED"];

/** The live queue: unassigned and urgent first. Agents see their own and unassigned cases. */
export default async function SupportQueue({ searchParams }: { searchParams: Promise<{ status?: string; category?: string; mine?: string; unassigned?: string }> }) {
  const actor = await requirePagePermission(["support.view_assigned", "support.view_all"]);
  const sp = await searchParams;
  const rows = await queue(actor, {
    status: STATUSES.includes(sp.status as SupportStatus) ? (sp.status as SupportStatus) : undefined,
    category: sp.category && sp.category in CATEGORY_LABEL ? (sp.category as SupportCategory) : undefined,
    mine: !!sp.mine,
    unassigned: !!sp.unassigned,
  });
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Chat and support" title="Support queue" lede="Open cases, most urgent first. Accept a case to work it; escalate academic, billing, technical or security questions rather than answering them yourself." />
      <form className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={sp.status ?? ""} className={FIELD}>
            <option value="">All open</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Topic" htmlFor="category">
          <select id="category" name="category" defaultValue={sp.category ?? ""} className={FIELD}>
            <option value="">Any</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-[13.5px]">
          <input type="checkbox" name="mine" value="1" defaultChecked={!!sp.mine} /> Mine
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-[13.5px]">
          <input type="checkbox" name="unassigned" value="1" defaultChecked={!!sp.unassigned} /> Unassigned
        </label>
        <button className={BTN}>Filter</button>
      </form>
      <div className="mt-6">
        {rows.length === 0 ? (
          <Empty title="The queue is clear." />
        ) : (
          <Table head={["Case", "Learner", "Topic", "Priority", "Status", "Assigned", "Waiting since", ""]} minWidth="68rem">
            {rows.map((t) => (
              <tr key={t.id}>
                <Td>
                  <Link href={`/admin/support/${t.id}`} className="font-medium hover:underline">
                    {t.subject}
                  </Link>
                  <span className="text-data block text-[11px] text-subtle">
                    {t.reference} · {t.channel.toLowerCase()} · {t._count.messages} messages
                  </span>
                </Td>
                <Td>{t.requester.name}</Td>
                <Td>
                  {CATEGORY_LABEL[t.category]}
                  {t.isComplaint && (
                    <span className="ml-1">
                      <Pill tone="red">complaint</Pill>
                    </span>
                  )}
                </Td>
                <Td>
                  <Pill tone={t.priority === "URGENT" ? "red" : t.priority === "HIGH" ? "amber" : "grey"}>{t.priority.toLowerCase()}</Pill>
                </Td>
                <Td>
                  <StatusPill status={t.status} />
                  {t.escalatedTo && <span className="block text-[11.5px] text-muted-foreground">→ {t.escalatedTo}</span>}
                </Td>
                <Td>{t.assignee?.name ?? "—"}</Td>
                <Td>{when(t.createdAt, true)}</Td>
                <Td>
                  {!t.assigneeId && can(actor, "support.respond") && (
                    <ActionButton action={assignAction} fields={{ ticketId: t.id, assigneeId: actor.id }}>
                      Accept
                    </ActionButton>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
