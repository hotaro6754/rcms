import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, Panel, TEXTAREA } from "@/components/admin/kit";
import { bankAction } from "@/lib/actions/cms";
import { QuestionList } from "@/components/cms/QuestionList";
import type { QuestionValue } from "@/components/cms/QuestionForm";

export const metadata = { title: "Question bank" };

export default async function BankPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("content.view");
  const { id } = await params;
  const bank = await prisma.questionBank.findUnique({
    where: { id },
    include: { questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }, quizzes: { where: { archivedAt: null }, select: { id: true, title: true, lesson: { select: { module: { select: { programId: true, program: { select: { name: true } } } } } } } } },
  });
  if (!bank) notFound();
  const canEdit = can(actor, "assessment.manage") && !bank.archivedAt;
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href="/admin/content/banks" className="text-micro text-muted-foreground hover:text-foreground">
        ← Question banks
      </Link>
      <PageHead kicker="Question bank" title={bank.title} lede={bank.description ?? undefined} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title={`Questions (${bank.questions.length})`}>
          <QuestionList owner={{ bankId: id }} canEdit={canEdit} questions={bank.questions.map((q) => ({ ...(q as unknown as QuestionValue), id: q.id, answerKey: (q.answerKey as Record<string, unknown>) ?? { index: q.correct } }))} />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Details">
            <ActionForm action={bankAction} className="flex flex-col gap-3" success="Saved.">
              <input type="hidden" name="op" value="update" />
              <input type="hidden" name="id" value={id} />
              <fieldset disabled={!canEdit} className="flex flex-col gap-3">
                <Field label="Title" htmlFor="t">
                  <input id="t" name="title" defaultValue={bank.title} required className={FIELD} />
                </Field>
                <Field label="Competency" htmlFor="c">
                  <input id="c" name="competency" defaultValue={bank.competency ?? ""} className={FIELD} />
                </Field>
                <Field label="Description" htmlFor="d">
                  <textarea id="d" name="description" rows={3} defaultValue={bank.description ?? ""} className={TEXTAREA} />
                </Field>
              </fieldset>
              {canEdit && <button className={`${BTN} w-fit`}>Save</button>}
            </ActionForm>
            {can(actor, "content.archive") && (
              <div className="mt-4">
                <ActionButton action={bankAction} fields={{ op: bank.archivedAt ? "restore" : "archive", id }}>
                  {bank.archivedAt ? "Restore bank" : "Archive bank"}
                </ActionButton>
              </div>
            )}
          </Panel>
          <Panel title="Assessments drawing from this bank">
            {bank.quizzes.length === 0 ? (
              <p className="text-micro text-muted-foreground">None.</p>
            ) : (
              <ul className="text-[13px]">
                {bank.quizzes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/content/courses/${q.lesson.module.programId}`} className="hover:underline">
                      {q.lesson.module.program.name}
                    </Link>{" "}
                    · {q.title}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
