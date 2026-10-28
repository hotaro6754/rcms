"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Pencil, Trash2 } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { questionOpAction } from "@/lib/actions/cms";
import { QUESTION_LABEL } from "@/lib/assessment/labels";
import { QuestionForm, type QuestionValue } from "./QuestionForm";

/** Existing questions on an assessment or in a bank, each editable in place. */
export function QuestionList({
  questions,
  owner,
  courseId,
  lessons,
  banks,
  canEdit,
}: {
  questions: (QuestionValue & { id: string })[];
  owner: { quizId?: string; bankId?: string };
  courseId?: string;
  lessons?: { id: string; title: string }[];
  banks?: { id: string; title: string }[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {questions.length === 0 && <p className="text-micro text-muted-foreground">No questions yet.</p>}
      <ol className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-[3px] border border-border bg-card">
            <div className="flex items-start gap-2 px-3 py-2.5">
              <span className="text-data mt-0.5 text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-snug">{q.prompt}</p>
                <p className="text-data mt-1 text-[10.5px] tracking-[0.06em] text-subtle">
                  {QUESTION_LABEL[q.type].toUpperCase()} · {q.points} PT · {["", "EASY", "MEDIUM", "HARD"][q.difficulty]}
                  {q.competency ? ` · ${q.competency.toUpperCase()}` : ""}
                </p>
              </div>
              {canEdit && (
                <span className="flex shrink-0 items-center gap-0.5">
                  <button type="button" onClick={() => setEditing(editing === q.id ? null : q.id)} className="rounded p-1.5 hover:bg-secondary" aria-label={`Edit question ${i + 1}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {i > 0 && (
                    <ActionButton action={questionOpAction} fields={{ id: q.id, op: "up", courseId }} size="icon" variant="ghost" title={`Move question ${i + 1} up`}>
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    </ActionButton>
                  )}
                  {i < questions.length - 1 && (
                    <ActionButton action={questionOpAction} fields={{ id: q.id, op: "down", courseId }} size="icon" variant="ghost" title={`Move question ${i + 1} down`}>
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </ActionButton>
                  )}
                  <ActionButton action={questionOpAction} fields={{ id: q.id, op: "duplicate", courseId }} size="icon" variant="ghost" title={`Duplicate question ${i + 1}`}>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </ActionButton>
                  <ActionButton action={questionOpAction} fields={{ id: q.id, op: "remove", courseId }} size="icon" variant="ghost" title={`Remove question ${i + 1}`} confirm="Remove this question from future attempts? Past attempts keep their copy.">
                    <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
                  </ActionButton>
                </span>
              )}
            </div>
            {editing === q.id && (
              <div className="border-t border-border px-3 py-3">
                <QuestionForm owner={owner} courseId={courseId} initial={q} lessons={lessons} onDone={() => setEditing(null)} />
                {banks && banks.length > 0 && owner.quizId && (
                  <ActionForm action={questionOpAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="op" value="to-bank" />
                    <label className="text-[12.5px]" htmlFor={`bank-${q.id}`}>
                      Copy into bank
                    </label>
                    <select id={`bank-${q.id}`} name="bankId" className="min-h-8 rounded-[3px] border border-input bg-card px-2 text-[12.5px]">
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                    <button className="min-h-8 rounded-[3px] border border-input px-2.5 text-[12.5px] hover:bg-secondary">Copy</button>
                  </ActionForm>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {canEdit &&
        (adding ? (
          <div className="rounded-[3px] border border-dashed border-input px-3 py-3">
            <QuestionForm owner={owner} courseId={courseId} lessons={lessons} onDone={() => setAdding(false)} />
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="w-fit rounded-[3px] border border-input bg-card px-3 py-1.5 text-[13px] hover:bg-secondary">
            Add a question
          </button>
        ))}
    </div>
  );
}
