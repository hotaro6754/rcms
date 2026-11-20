"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Clock, Flag, Loader2, Upload } from "lucide-react";
import type { LearnerQuestion, Response } from "@/lib/assessment/questions";
import { saveAnswersAction, submitAttemptAction, uploadAnswerAction } from "@/lib/actions/learning";
import { Rexi } from "@/components/mascot/Rexi";
import s from "./attempt-runner.module.css";

const LETTERS = "ABCDEFGHIJ";

const answered = (v: Response | undefined) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0) && !(typeof v === "object" && !Array.isArray(v) && v !== null && Object.keys(v).length === 0);

/**
 * Taking an assessment, one question at a time. The page holds tokens, never answers. Answers
 * autosave a moment after each change; the clock is a courtesy, because the server enforces the
 * deadline and grades only what it received in time. Keys: A–J (or 1–9) choose, ← → move.
 */
export function AttemptRunner({
  attemptId,
  questions,
  initial,
  uploads,
  expiresAt,
  totalMinutes,
}: {
  attemptId: string;
  questions: LearnerQuestion[];
  initial: Record<string, Response>;
  uploads: Record<string, string>;
  expiresAt: string | null;
  totalMinutes?: number | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<Record<string, Response>>(() => {
    const a = { ...initial };
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
  const [idx, setIdx] = useState(0); // questions.length = the review step
  const [dir, setDir] = useState(1);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
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
      }, 900);
    },
    [attemptId],
  );

  const set = useCallback(
    (id: string, v: Response) =>
      setAnswers((a) => {
        const next = { ...a, [id]: v };
        save(next);
        return next;
      }),
    [save],
  );

  const submit = useCallback(
    (auto = false) => {
      if (submitted.current) return;
      if (!auto && idx < questions.length) {
        setDir(1);
        setIdx(questions.length);
        return;
      }
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
    [answers, attemptId, idx, questions.length, router],
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

  const go = useCallback(
    (to: number) => {
      const n = Math.max(0, Math.min(questions.length, to));
      setDir(n >= idx ? 1 : -1);
      setIdx(n);
    },
    [idx, questions.length],
  );

  const q = questions[idx];

  // Keyboard: letters or numbers choose an option, arrows move between questions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (/input|textarea|select/i.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (q && (q.type === "SINGLE" || q.type === "TRUE_FALSE" || q.type === "MULTI")) {
        const k = e.key.toUpperCase();
        const i = /^[1-9]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
        const o = q.options[i];
        if (!o) return;
        if (q.type === "MULTI") {
          const cur = (answers[q.id] as string[] | undefined) ?? [];
          set(q.id, cur.includes(o.token) ? cur.filter((t) => t !== o.token) : [...cur, o.token]);
        } else set(q.id, o.token);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answers, go, idx, q, set]);

  const answeredCount = useMemo(() => questions.filter((x) => answered(answers[x.id])).length, [answers, questions]);
  const unanswered = questions.length - answeredCount;
  const mmss = left !== null ? `${Math.max(0, Math.floor(left / 60000))}:${String(Math.max(0, Math.floor((left % 60000) / 1000))).padStart(2, "0")}` : null;
  const timePct = left !== null && totalMinutes ? Math.max(0, Math.min(1, left / (totalMinutes * 60000))) : null;
  const C = 2 * Math.PI * 9;
  const mood = idx >= questions.length ? (unanswered ? "think" : "happy") : q && answered(answers[q.id]) ? "happy" : "think";

  const toggleFlag = (id: string) =>
    setFlagged((f) => {
      const n = new Set(f);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className={s.runner}>
      {/* ---------- top bar ---------- */}
      <div className={s.bar}>
        <div className={s.segments} aria-label={`${answeredCount} of ${questions.length} answered`}>
          {questions.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className={s.seg}
              data-state={i === idx ? "now" : answered(answers[x.id]) ? "done" : undefined}
              data-flag={flagged.has(x.id) || undefined}
              onClick={() => go(i)}
              aria-label={`Question ${i + 1}${answered(answers[x.id]) ? ", answered" : ""}`}
            />
          ))}
        </div>
        <div className={s.barRow}>
          <span className={s.count}>
            {idx < questions.length ? (
              <>
                Question <b>{idx + 1}</b> of {questions.length}
              </>
            ) : (
              "Review and submit"
            )}
          </span>
          <span className={s.saved} aria-live="polite" data-state={saved}>
            {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : saved === "error" ? "Not saved" : ""}
          </span>
          {mmss && (
            <span role="timer" aria-live="off" className={s.timer} data-low={left !== null && left < 60_000 ? "" : undefined}>
              {timePct !== null ? (
                <svg viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" className={s.tTrack} />
                  <circle cx="12" cy="12" r="9" className={s.tFill} strokeDasharray={`${timePct * C} ${C}`} transform="rotate(-90 12 12)" />
                </svg>
              ) : (
                <Clock aria-hidden />
              )}
              {mmss}
            </span>
          )}
        </div>
      </div>

      <div className={s.layout}>
        {/* ---------- question ---------- */}
        <div className={s.stage}>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            {q ? (
              <motion.fieldset
                key={q.id}
                className={s.card}
                custom={dir}
                initial={reduce ? false : { opacity: 0, x: 40 * dir }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -40 * dir }}
                transition={{ duration: 0.28, ease: [0.2, 0, 0.1, 1] }}
              >
                <div className={s.qTop}>
                  <span className={s.qNum}>Q{idx + 1}</span>
                  <span className={s.qPts}>
                    {q.points} point{q.points === 1 ? "" : "s"}
                  </span>
                  <button type="button" className={s.flag} aria-pressed={flagged.has(q.id)} onClick={() => toggleFlag(q.id)}>
                    <Flag aria-hidden /> {flagged.has(q.id) ? "Flagged" : "Flag for review"}
                  </button>
                </div>
                <legend className={s.prompt}>{q.prompt}</legend>
                {q.scenario && <p className={s.scenario}>{q.scenario}</p>}

                {(q.type === "SINGLE" || q.type === "TRUE_FALSE") && (
                  <div className={s.options} role="radiogroup">
                    {q.options.map((o, i) => {
                      const on = answers[q.id] === o.token;
                      return (
                        <button key={o.token} type="button" role="radio" aria-checked={on} className={s.option} onClick={() => set(q.id, o.token)}>
                          <span className={s.key}>{on ? <Check aria-hidden /> : LETTERS[i]}</span>
                          <span className={s.optText}>{o.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === "MULTI" && (
                  <div className={s.options} role="group">
                    <p className={s.hint}>Select every correct option.</p>
                    {q.options.map((o, i) => {
                      const cur = (answers[q.id] as string[] | undefined) ?? [];
                      const on = cur.includes(o.token);
                      return (
                        <button key={o.token} type="button" role="checkbox" aria-checked={on} className={s.option} data-multi onClick={() => set(q.id, on ? cur.filter((t) => t !== o.token) : [...cur, o.token])}>
                          <span className={s.key}>{on ? <Check aria-hidden /> : LETTERS[i]}</span>
                          <span className={s.optText}>{o.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === "SEQUENCE" && (
                  <div className={s.options}>
                    <p className={s.hint}>Put these in the correct order.</p>
                    <motion.ol layout className={s.seq}>
                      {((answers[q.id] as string[]) ?? []).map((t, j, arr) => (
                        <motion.li layout key={t} className={s.seqItem} transition={{ type: "spring", stiffness: 500, damping: 36 }}>
                          <span className={s.seqN}>{j + 1}</span>
                          <span className={s.optText}>{q.options.find((o) => o.token === t)?.text}</span>
                          <button type="button" disabled={j === 0} onClick={() => set(q.id, arr.map((x, k) => (k === j - 1 ? t : k === j ? arr[j - 1] : x)))} aria-label="Move up" className={s.move}>
                            <ChevronUp aria-hidden />
                          </button>
                          <button type="button" disabled={j === arr.length - 1} onClick={() => set(q.id, arr.map((x, k) => (k === j + 1 ? t : k === j ? arr[j + 1] : x)))} aria-label="Move down" className={s.move}>
                            <ChevronDown aria-hidden />
                          </button>
                        </motion.li>
                      ))}
                    </motion.ol>
                  </div>
                )}

                {q.type === "MATCHING" && (
                  <div className={s.options}>
                    <p className={s.hint}>Match each item on the left to one on the right.</p>
                    {q.options.map((o) => {
                      const cur = (answers[q.id] as Record<string, string> | undefined) ?? {};
                      return (
                        <label key={o.token} className={s.match} data-on={cur[o.token] ? "" : undefined}>
                          <span className={s.optText}>{o.text}</span>
                          <select value={cur[o.token] ?? ""} onChange={(e) => set(q.id, { ...cur, [o.token]: e.target.value })}>
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
                  <div className={s.options}>
                    <textarea value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} rows={7} className={s.text} aria-label="Your answer" placeholder="Write your answer…" />
                    <p className={s.hint}>
                      {String((answers[q.id] as string) ?? "").trim().split(/\s+/).filter(Boolean).length} words{q.maxWords ? ` of ${q.maxWords}` : ""}. Marked by a reviewer. Do not include patient or client identifiers.
                    </p>
                  </div>
                )}

                {q.type === "FILE_UPLOAD" && (
                  <form
                    className={s.upload}
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
                    <label className={s.drop}>
                      <Upload aria-hidden />
                      <span>{files[q.id] ? `Uploaded: ${files[q.id]}` : "Choose a file to upload"}</span>
                      <input type="file" name="file" required accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt,image/png,image/jpeg" />
                    </label>
                    <button className={s.ghost}>Upload</button>
                    <p className={s.hint}>PDF, Office, CSV, text or image, up to 25 MB. Synthetic data only.</p>
                  </form>
                )}
              </motion.fieldset>
            ) : (
              <motion.div key="review" className={s.card} initial={reduce ? false : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0 }}>
                <div className={s.reviewHead}>
                  <Rexi mood={unanswered ? "think" : "happy"} size={120} />
                  <div>
                    <p className={s.prompt}>{unanswered ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} still unanswered` : "Every question is answered"}</p>
                    <p className={s.hint}>You cannot change answers after submitting. Select a question below to go back to it.</p>
                  </div>
                </div>
                <ol className={s.reviewGrid}>
                  {questions.map((x, i) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => go(i)} data-state={answered(answers[x.id]) ? "done" : "open"} data-flag={flagged.has(x.id) || undefined}>
                        <b>{i + 1}</b>
                        <span>{answered(answers[x.id]) ? "Answered" : "Open"}</span>
                        {flagged.has(x.id) && <Flag aria-label="Flagged" />}
                      </button>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}

          <div className={s.nav}>
            <button type="button" className={s.ghost} onClick={() => go(idx - 1)} disabled={idx === 0}>
              <ArrowLeft aria-hidden /> Previous
            </button>
            {idx < questions.length ? (
              <button type="button" className={s.next} onClick={() => go(idx + 1)}>
                {idx === questions.length - 1 ? "Review answers" : "Next"} <ArrowRight aria-hidden />
              </button>
            ) : (
              <button type="button" className={s.submit} disabled={pending} onClick={() => submit(true)}>
                {pending ? <Loader2 className={s.spin} aria-hidden /> : <Check aria-hidden />} Submit {answeredCount}/{questions.length} answers
              </button>
            )}
          </div>
        </div>

        {/* ---------- side ---------- */}
        <aside className={s.side}>
          <div className={s.coach}>
            <Rexi mood={mood} size={110} />
            <p>{idx >= questions.length ? "Check the map, then submit when you are ready." : q && answered(answers[q.id]) ? "Saved. Move on when you are ready." : "Take your time. Your answers save as you go."}</p>
          </div>
          <div className={s.map}>
            <p className={s.mapTitle}>Questions</p>
            <ol>
              {questions.map((x, i) => (
                <li key={x.id}>
                  <button type="button" onClick={() => go(i)} data-state={i === idx ? "now" : answered(answers[x.id]) ? "done" : undefined} data-flag={flagged.has(x.id) || undefined} aria-label={`Question ${i + 1}`}>
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
            <p className={s.keys}>
              <kbd>A</kbd>–<kbd>D</kbd> choose · <kbd>←</kbd>
              <kbd>→</kbd> move
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
