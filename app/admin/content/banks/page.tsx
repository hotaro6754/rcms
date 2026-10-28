import Link from "next/link";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, Table, Td, Pill } from "@/components/admin/kit";
import { bankAction } from "@/lib/actions/cms";

export const metadata = { title: "Question banks" };

export default async function BanksPage() {
  const actor = await requirePagePermission("content.view");
  const banks = await prisma.questionBank.findMany({
    orderBy: [{ archivedAt: "asc" }, { title: "asc" }],
    include: { _count: { select: { questions: { where: { archivedAt: null } }, quizzes: { where: { archivedAt: null } } } } },
  });
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Assessment" title="Question banks" lede="Shared pools of questions. An assessment can draw a set number at random from a bank for every attempt, so two learners rarely see the same paper." />
      <div className="mt-8 flex flex-col gap-8">
        {banks.length === 0 ? (
          <Empty title="No banks yet" />
        ) : (
          <Table head={["Bank", "Competency", "Questions", "Used by", ""]}>
            {banks.map((b) => (
              <tr key={b.id}>
                <Td>
                  <Link href={`/admin/content/banks/${b.id}`} className="font-medium hover:underline">
                    {b.title}
                  </Link>
                </Td>
                <Td>{b.competency ?? "—"}</Td>
                <Td>{b._count.questions}</Td>
                <Td>{b._count.quizzes} assessments</Td>
                <Td>{b.archivedAt && <Pill>archived</Pill>}</Td>
              </tr>
            ))}
          </Table>
        )}
        {can(actor, "assessment.manage") && (
          <ActionForm action={bankAction} className="flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4" resetOnSuccess success="Bank created.">
            <input type="hidden" name="op" value="create" />
            <Field label="New bank title" htmlFor="b-title" className="min-w-[16rem] flex-1">
              <input id="b-title" name="title" required className={FIELD} />
            </Field>
            <Field label="Competency" htmlFor="b-comp">
              <input id="b-comp" name="competency" className={FIELD} placeholder="Denial management" />
            </Field>
            <button className={BTN}>Create bank</button>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
