"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { LearnerQuestion, Response } from "@/lib/assessment/questions";
import { saveAnswersAction, submitAttemptAction, uploadAnswerAction } from "@/lib/actions/learning";

/**
 * Taking an assessment. The page holds tokens, never answers. Answers autosave a moment after
 * each change; the clock shown here is a courtesy, because the server enforces the deadline
 * and grades only what it received in time.
 */
export function AttemptRunner({
  attemptId,
  questions,
  initial,
  uploads,
  expiresAt,
}: {
  attemptId: string;
  questions: LearnerQuestion[];
  initial: Record<string, Response>;
  uploads: Record<string, string>;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Response>>(() => {
    const a = { ...initial };
    // An ordering question starts as shown; the arrangement on screen is the answer.
    for (const q of questions) if (q.type === "SEQUENCE" && !Array.isArray(a[q.id])) a[q.id] = q.options.map((o) => o.token);
    return a;
  });
  const [files, setFiles] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const q of questions) {
      const v = initial[q.id];
      if (q.type === "FILE_UPLOAD" && typeof v === "string" && uploads[v]) out[q.id] = uploads[v];
    }
    return out;
  });
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [left, setLeft] = useState<number | null>(expiresAt ? new Date(expiresAt).getTime() - Date.now() : null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef(false);

  const save = useCallback(
    (next: Record<string, Response>) => {
      if (timer.current) clearTimeout(timer.current);
      setSaved("saving");
      timer.current = setTimeout(async () => {
        const res = await saveAnswersAction(attemptId, next);
        setSaved(res.ok ? "saved" : "error");
        if (!res.ok) setError(res.error);
      }, 1200);
    },
    [attemptId],
  );

  const set = (id: string, v: Response) =>
    setAnswers((a) => {
      const next = { ...a, [id]: v };
      save(next);
      return next;
    });

  const submit = useCallback(
    (auto = false) => {
      if (submitted.current) return;
      const unanswered = questions.filter((q) => {
        const v = answers[q.id];
        return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      }).length;
      if (!auto && unanswered > 0 && !window.confirm(`${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered. Submit anyway?`)) return;
      submitted.current = true;
      if (timer.current) clearTimeout(timer.current);
      start(async () => {
        const res = await submitAttemptAction(attemptId, answers);
        if (!res.ok) {
          submitted.current = false;
          setError(res.error);
          return;
        }
        router.refresh();
      });
    },
    [answers, attemptId, questions, router],
  );

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(t);
        submit(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, submit]);

  const answeredCount = useMemo(() => questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length, [answers, questions]);
  const mmss = left !== null ? `${Math.max(0, Math.floor(left / 60000))}:${String(Math.max(0, Math.floor((left % 60000) / 1000))).padStart(2, "0")}` : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-4 border-b border-border bg-background/95 py-3 backdrop-blur-sm">
        <span className="text-data text-micro text-muted-foreground">
          {answeredCount} of {questions.length} answered
        </span>
        <span className="text-data text-micro text-muted-foreground" aria-live="polite">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : saved === "error" ? "Not saved" : ""}
        </span>
        {mmss && (
          <span role="timer" aria-live="off" className={`text-data ml-auto text-[13px] ${left !== null && left < 60_000 ? "text-danger" : ""}`}>
            Time left {mmss}
          </span>
        )}
      </div>

      <ol className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
            <fieldset>
              <legend className="text-[14.5px] font-medium leading-snug">
                <span className="text-data mr-2 text-micro text-subtle">{i + 1}.</span>
                {q.prompt} <span className="text-data ml-1 text-[10.5px] text-subtle">({q.points} pt)</span>
              </legend>
              {q.scenario && <p className="mt-2 whitespace-pre-line rounded-[3px] bg-secondary/60 px-3 py-2 text-[13.5px]">{q.scenario}</p>}
              <div className="mt-3">
                {(q.type === "SINGLE" || q.type === "TRUE_FALSE") && (
                  <div className="flex flex-col gap-2">
                    {q.options.map((o) => (
                      <label key={o.token} className="flex cursor-pointer items-start gap-2.5 text-[14px]">
                        <input type="radio" name={q.id} checked={answers[q.id] === o.token} onChange={() => set(q.id, o.token)} className="mt-1 h-4 w-4" />
                        <span>{o.text}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "MULTI" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[12px] text-muted-foreground">Select every correct option.</p>
                    {q.options.map((o) => {
                      const cur = (answers[q.id] as string[] | undefined) ?? [];
                      return (
                        <label key={o.token} className="flex cursor-pointer items-start gap-2.5 text-[14px]">
                          <input type="checkbox" checked={cur.includes(o.token)} onChange={(e) => set(q.id, e.target.checked ? [...cur, o.token] : cur.filter((t) => t !== o.token))} className="mt-1 h-4 w-4" />
                          <span>{o.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {q.type === "SEQUENCE" && (
                  <ol className="flex flex-col gap-1.5">
                    <p className="text-[12px] text-muted-foreground">Put these in the correct order using the arrows.</p>
                    {((answers[q.id] as string[]) ?? []).map((t, j, arr) => (
                      <li key={t} className="flex items-center gap-2 rounded-[3px] border border-border px-3 py-2 text-[14px]">
                        <span className="text-data w-5 text-[11px] text-subtle">{j + 1}</span>
                        <span className="flex-1">{q.options.find((o) => o.token === t)?.text}</span>
                        <button type="button" disabled={j === 0} onClick={() => set(q.id, arr.map((x, k) => (k === j - 1 ? t : k === j ? arr[j - 1] : x)))} aria-label="Move up" className="rounded p-1 hover:bg-secondary disabled:opacity-30">
                          <ChevronUp className="h-4 w-4" aria-hidden />
                        </button>
                        <button type="button" disabled={j === arr.length - 1} onClick={() => set(q.id, arr.map((x, k) => (k === j + 1 ? t : k === j ? arr[j + 1] : x)))} aria-label="Move down" className="rounded p-1 hover:bg-secondary disabled:opacity-30">
                          <ChevronDown className="h-4 w-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                {q.type === "MATCHING" && (
                  <div className="flex flex-col gap-2">
                    {q.options.map((o) => {
                      const cur = (answers[q.id] as Record<string, string> | undefined) ?? {};
                      return (
                        <label key={o.token} className="grid items-center gap-2 text-[14px] sm:grid-cols-[1fr_1fr]">
                          <span>{o.text}</span>
                          <select value={cur[o.token] ?? ""} onChange={(e) => set(q.id, { ...cur, [o.token]: e.target.value })} className="min-h-10 rounded-[3px] border border-input bg-card px-2 text-[14px]">
                            <option value="">Choose…</option>
                            {q.targets.map((t) => (
                              <option key={t.token} value={t.token}>
                                {t.text}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                )}
                {q.type === "SHORT_ANSWER" && (
                  <div>
                    <textarea value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} rows={6} className="w-full rounded-[3px] border border-input bg-card px-3 py-2 text-[14px]" aria-label="Your answer" />
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {String((answers[q.id] as string) ?? "").trim().split(/\s+/).filter(Boolean).length} words{q.maxWords ? ` of ${q.maxWords}` : ""}. Marked by a reviewer. Do not include patient or client identifiers.
                    </p>
                  </div>
                )}
                {q.type === "FILE_UPLOAD" && (
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      fd.set("attemptId", attemptId);
                      fd.set("questionId", q.id);
                      start(async () => {
                        setError(null);
                        const res = await uploadAnswerAction(fd);
                        if (res.ok) {
                          setFiles((f) => ({ ...f, [q.id]: res.data.fileName }));
                          setAnswers((a) => ({ ...a, [q.id]: res.data.id }));
                        } else setError(res.error);
                      });
                    }}
                  >
                    <input type="file" name="file" required accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt,image/png,image/jpeg" className="text-[13px]" />
                    <button className="min-h-9 rounded-[3px] border border-input px-3 text-[13px] hover:bg-secondary">Upload</button>
                    {files[q.id] && <span className="text-[13px] text-success">Uploaded: {files[q.id]}</span>}
                    <p className="w-full text-[12px] text-muted-foreground">PDF, Office, CSV, text or image, up to 25 MB. Synthetic data only.</p>
                  </form>
                )}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="border-l-2 border-danger pl-3 text-[13.5px] text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending} onClick={() => submit(false)} className="inline-flex min-h-11 items-center gap-2 rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Submit answers
        </button>
        <span className="text-[12.5px] text-muted-foreground">You cannot change answers after submitting.</span>
      </div>
    </div>
  );
}
