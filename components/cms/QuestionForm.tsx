"use client";

import { useState } from "react";
import type { QuestionType } from "@prisma/client";
import { Plus, X } from "lucide-react";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveQuestionAction } from "@/lib/actions/cms";
import { QUESTION_LABEL } from "@/lib/assessment/labels";

export interface QuestionValue {
  id?: string;
  type: QuestionType;
  scenario?: string | null;
  prompt: string;
  options: string[];
  targets: string[];
  answerKey: Record<string, unknown>;
  rationale?: string | null;
  points: number;
  difficulty: number;
  competency?: string | null;
  remediationLessonId?: string | null;
}

const IN = "min-h-9 w-full rounded-[3px] border border-input bg-card px-2.5 text-[13.5px]";
const TA = "w-full rounded-[3px] border border-input bg-card px-2.5 py-2 text-[13.5px] leading-relaxed";

const BLANK: QuestionValue = { type: "SINGLE", prompt: "", options: ["", "", "", ""], targets: [], answerKey: { index: 0 }, points: 1, difficulty: 2 };

/**
 * Authoring for every question type. The form keeps a structured value in state and posts it
 * as JSON; the server validates it again (lib/assessment/questions.ts normaliseQuestion).
 * Scenarios must be synthetic: the server screens the text before saving.
 */
export function QuestionForm({
  owner,
  courseId,
  initial,
  lessons,
  onDone,
}: {
  owner: { quizId?: string; bankId?: string };
  courseId?: string;
  initial?: QuestionValue;
  lessons?: { id: string; title: string }[];
  onDone?: () => void;
}) {
  const [q, setQ] = useState<QuestionValue>(initial ?? BLANK);
  const set = (patch: Partial<QuestionValue>) => setQ((v) => ({ ...v, ...patch }));

  const changeType = (type: QuestionType) => {
    if (type === "TRUE_FALSE") return set({ type, options: ["True", "False"], answerKey: { index: 0 } });
    if (type === "MULTI") return set({ type, options: q.options.length >= 3 ? q.options : ["", "", ""], answerKey: { indices: [] } });
    if (type === "MATCHING") return set({ type, options: ["", ""], targets: ["", ""], answerKey: { pairs: [0, 1] } });
    if (type === "SEQUENCE") return set({ type, options: ["", "", ""], answerKey: {} });
    if (type === "SHORT_ANSWER" || type === "FILE_UPLOAD") return set({ type, options: [], targets: [], answerKey: {} });
    return set({ type, options: q.options.length >= 2 ? q.options : ["", ""], answerKey: { index: 0 } });
  };

  const setOption = (i: number, v: string, list: "options" | "targets" = "options") => set({ [list]: q[list].map((o, j) => (j === i ? v : o)) } as Partial<QuestionValue>);
  const addOption = (list: "options" | "targets" = "options") => set({ [list]: [...q[list], ""] } as Partial<QuestionValue>);
  const removeOption = (i: number) => {
    const options = q.options.filter((_, j) => j !== i);
    const key = { ...q.answerKey };
    if (q.type === "SINGLE") key.index = Math.min(Number(key.index ?? 0), options.length - 1);
    if (q.type === "MULTI") key.indices = ((key.indices as number[]) ?? []).filter((x) => x !== i).map((x) => (x > i ? x - 1 : x));
    if (q.type === "MATCHING") key.pairs = ((key.pairs as number[]) ?? []).filter((_, j) => j !== i);
    set({ options, answerKey: key });
  };

  const payload = {
    type: q.type,
    scenario: q.scenario || null,
    prompt: q.prompt,
    options: q.options.map((o) => o.trim()),
    targets: q.targets.map((o) => o.trim()),
    answerKey: q.type === "MATCHING" ? { pairs: q.options.map((_, i) => Number(((q.answerKey.pairs as number[]) ?? [])[i] ?? 0)) } : q.answerKey,
    rationale: q.rationale || null,
    points: q.points,
    difficulty: q.difficulty,
    competency: q.competency || null,
    remediationLessonId: q.remediationLessonId || null,
  };

  return (
    <ActionForm action={saveQuestionAction} className="flex flex-col gap-3" onSuccess={() => onDone?.()} resetOnSuccess={!initial}>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {q.id && <input type="hidden" name="id" value={q.id} />}
      {owner.quizId && <input type="hidden" name="quizId" value={owner.quizId} />}
      {owner.bankId && <input type="hidden" name="bankId" value={owner.bankId} />}
      {courseId && <input type="hidden" name="courseId" value={courseId} />}

      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem]">
        <label className="flex flex-col gap-1 text-[12.5px] font-medium">
          Type
          <select value={q.type} onChange={(e) => changeType(e.target.value as QuestionType)} className={IN} disabled={!!q.id && false}>
            {(Object.keys(QUESTION_LABEL) as QuestionType[]).map((t) => (
              <option key={t} value={t}>
                {QUESTION_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-medium">
          Points
          <input type="number" min={1} max={100} value={q.points} onChange={(e) => set({ points: Number(e.target.value) })} className={IN} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-medium">
          Difficulty
          <select value={q.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })} className={IN}>
            <option value={1}>Easy</option>
            <option value={2}>Medium</option>
            <option value={3}>Hard</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-[12.5px] font-medium">
        Scenario or case (optional, synthetic data only)
        <textarea rows={3} value={q.scenario ?? ""} onChange={(e) => set({ scenario: e.target.value })} className={TA} />
      </label>
      <label className="flex flex-col gap-1 text-[12.5px] font-medium">
        Question
        <textarea rows={2} required value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} className={TA} />
      </label>

      {(q.type === "SINGLE" || q.type === "MULTI" || q.type === "TRUE_FALSE") && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-[12.5px] font-medium">{q.type === "MULTI" ? "Options — tick every correct one" : "Options — choose the correct one"}</legend>
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              {q.type === "MULTI" ? (
                <input
                  type="checkbox"
                  aria-label={`Option ${i + 1} is correct`}
                  checked={((q.answerKey.indices as number[]) ?? []).includes(i)}
                  onChange={(e) => {
                    const cur = new Set((q.answerKey.indices as number[]) ?? []);
                    if (e.target.checked) cur.add(i);
                    else cur.delete(i);
                    set({ answerKey: { indices: [...cur].sort((a, b) => a - b) } });
                  }}
                />
              ) : (
                <input type="radio" name="correct-ui" aria-label={`Option ${i + 1} is correct`} checked={Number(q.answerKey.index) === i} onChange={() => set({ answerKey: { index: i } })} />
              )}
              <input value={o} onChange={(e) => setOption(i, e.target.value)} disabled={q.type === "TRUE_FALSE"} required className={IN} placeholder={`Option ${i + 1}`} />
              {q.type !== "TRUE_FALSE" && q.options.length > (q.type === "MULTI" ? 3 : 2) && (
                <button type="button" onClick={() => removeOption(i)} aria-label={`Remove option ${i + 1}`} className="rounded p-1 hover:bg-secondary">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          ))}
          {q.type !== "TRUE_FALSE" && q.options.length < 10 && (
            <button type="button" onClick={() => addOption()} className="inline-flex w-fit items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
              <Plus className="h-3 w-3" aria-hidden /> Another option
            </button>
          )}
        </fieldset>
      )}

      {q.type === "SEQUENCE" && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-[12.5px] font-medium">Steps in the correct order (learners see them shuffled)</legend>
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-data w-5 text-[11px] text-subtle">{i + 1}</span>
              <input value={o} onChange={(e) => setOption(i, e.target.value)} required className={IN} />
              {q.options.length > 3 && (
                <button type="button" onClick={() => removeOption(i)} aria-label={`Remove step ${i + 1}`} className="rounded p-1 hover:bg-secondary">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          ))}
          {q.options.length < 10 && (
            <button type="button" onClick={() => addOption()} className="inline-flex w-fit items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
              <Plus className="h-3 w-3" aria-hidden /> Another step
            </button>
          )}
        </fieldset>
      )}

      {q.type === "MATCHING" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[12.5px] font-medium">Targets (right column, may include distractors)</legend>
            {q.targets.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-data w-5 text-[11px] text-subtle">{String.fromCharCode(65 + i)}</span>
                <input value={t} onChange={(e) => setOption(i, e.target.value, "targets")} required className={IN} />
              </div>
            ))}
            {q.targets.length < 12 && (
              <button type="button" onClick={() => addOption("targets")} className="inline-flex w-fit items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" aria-hidden /> Another target
              </button>
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[12.5px] font-medium">Items and their correct match</legend>
            {q.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={o} onChange={(e) => setOption(i, e.target.value)} required className={IN} placeholder={`Item ${i + 1}`} />
                <select
                  aria-label={`Correct target for item ${i + 1}`}
                  value={((q.answerKey.pairs as number[]) ?? [])[i] ?? 0}
                  onChange={(e) => {
                    const pairs = [...(((q.answerKey.pairs as number[]) ?? q.options.map((_, j) => j)))];
                    pairs[i] = Number(e.target.value);
                    set({ answerKey: { pairs } });
                  }}
                  className="min-h-9 rounded-[3px] border border-input bg-card px-1.5 text-[13px]"
                >
                  {q.targets.map((_, t) => (
                    <option key={t} value={t}>
                      {String.fromCharCode(65 + t)}
                    </option>
                  ))}
                </select>
                {q.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} aria-label={`Remove item ${i + 1}`} className="rounded p-1 hover:bg-secondary">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
            ))}
            {q.options.length < 10 && (
              <button type="button" onClick={() => set({ options: [...q.options, ""], answerKey: { pairs: [...((q.answerKey.pairs as number[]) ?? []), 0] } })} className="inline-flex w-fit items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" aria-hidden /> Another item
              </button>
            )}
          </fieldset>
        </div>
      )}

      {(q.type === "SHORT_ANSWER" || q.type === "FILE_UPLOAD") && (
        <label className="flex flex-col gap-1 text-[12.5px] font-medium">
          Marking rubric (shown to graders only)
          <textarea rows={3} value={String(q.answerKey.rubric ?? "")} onChange={(e) => set({ answerKey: { ...q.answerKey, rubric: e.target.value } })} className={TA} />
        </label>
      )}

      <label className="flex flex-col gap-1 text-[12.5px] font-medium">
        Explanation shown after the attempt
        <textarea rows={2} value={q.rationale ?? ""} onChange={(e) => set({ rationale: e.target.value })} className={TA} />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12.5px] font-medium">
          Competency category
          <input value={q.competency ?? ""} onChange={(e) => set({ competency: e.target.value })} className={IN} placeholder="e.g. Denial management" list="competencies" />
        </label>
        {lessons && (
          <label className="flex flex-col gap-1 text-[12.5px] font-medium">
            Remediation lesson if answered wrongly
            <select value={q.remediationLessonId ?? ""} onChange={(e) => set({ remediationLessonId: e.target.value })} className={IN}>
              <option value="">None</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <datalist id="competencies">
        {["Patient access", "Eligibility and authorization", "Charge capture", "Coding awareness", "Claims", "Payment posting", "Denial management", "AR follow-up", "Compliance and privacy", "KPIs and reporting", "Governance", "Leadership"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex gap-2">
        <button className="min-h-9 rounded-[3px] bg-primary px-3 text-[13px] font-medium text-primary-foreground">{q.id ? "Save question" : "Add question"}</button>
        {onDone && (
          <button type="button" onClick={onDone} className="min-h-9 rounded-[3px] px-3 text-[13px] hover:bg-secondary">
            Cancel
          </button>
        )}
      </div>
    </ActionForm>
  );
}
