import Link from "next/link";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, FIELD, Pill, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { createCaseAction } from "@/lib/actions/sims";

export const metadata = { title: "Cases" };

export default async function CasesAdmin() {
  const actor = await requirePagePermission("content.view");
  const rows = await prisma.simCase.findMany({
    orderBy: [{ status: "asc" }, { title: "asc" }],
    include: { versions: { orderBy: { version: "desc" }, take: 1, select: { version: true, createdAt: true } }, _count: { select: { attempts: true } } },
  });
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead
        kicker="Learning"
        title="Case simulations"
        lede="Synthetic denied claims learners investigate and resolve. A case is approved by a reviewer other than its author, and each approval publishes a new numbered version; attempts keep the version they started on."
        actions={
          <Link href="/admin/competencies" className="text-[13px] underline underline-offset-4">
            Competency framework
          </Link>
        }
      />
      {can(actor, "content.create") && (
        <ActionForm action={createCaseAction} className="mt-8 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5 text-micro font-medium">
            New case title
            <input name="title" required minLength={4} className={`${FIELD} w-80`} />
          </label>
          <button className={BTN}>Create case</button>
          <p className="w-full text-[12px] text-muted-foreground">A new case starts from a complete example you then rewrite, so it is always valid.</p>
        </ActionForm>
      )}
      <div className="mt-8">
        {rows.length === 0 ? (
          <Empty title="No cases yet" />
        ) : (
          <Table head={["Case", "Status", "Live version", "Attempts", "Updated"]}>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/cases/${c.id}`} className="font-medium hover:underline">
                    {c.title}
                  </Link>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <StatusPill status={c.status} />
                    {c.hasDraftChanges && <Pill tone="amber">edits pending</Pill>}
                  </span>
                </Td>
                <Td>{c.versions[0] ? `v${c.versions[0].version} · ${when(c.versions[0].createdAt)}` : "—"}</Td>
                <Td>{c._count.attempts}</Td>
                <Td>{when(c.updatedAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
