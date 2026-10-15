"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Answers, LearnerCase } from "@/lib/sim/definition";
import type { SimResult } from "@/lib/sim/score";
import { EVIDENCE_LABEL } from "@/lib/sim/labels";
import { BTN, BTN_OUTLINE, Pill, TEXTAREA } from "@/components/admin/kit";
import { WorkflowStrip } from "./WorkflowStrip";
import { CaseResult } from "./CaseResult";
import { PRIORITY_TONE, usd } from "./format";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; field?: string };

/**
 * The case workbench: the case file on one side, the decision on the other. Learners' answers
 * autosave a moment after each change and on leaving; submitting sends them to the server,
 * which scores them. In preview mode (authors) nothing is saved and the score comes back inline.
 */
export function CaseWorkbench({
  view,
  initial,
  save,
  submit,
  preview,
}: {
  view: LearnerCase;
  initial: Answers;
  save?: (answers: Answers) => Promise<Result<{ savedAt: string }>>;
  submit: (answers: Answers) => Promise<Result<unknown>>;
  preview?: boolean;
}) {
  const router = useRouter();
  const [a, setA] = useState<Answers>(initial);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [previewResult, setPreviewResult] = useState<SimResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = useRef(false);
  const latest = useRef(a);
  latest.current = a;

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => {
    dirty.current = true;
    setA((prev) => ({ ...prev, [k]: v }));
  };
  const toggle = (k: "missingInfo" | "supportingEvidence", id: string) => {
    const cur = new Set(a[k] ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    set(k, [...cur]);
  };

  // Autosave 1.5 s after the last change.
  useEffect(() => {
    if (!save || !dirty.current) return;
    const t = setTimeout(async () => {
      const r = await save(latest.current);
      if (r.ok) {
        dirty.current = false;
        setSaved(new Date(r.data.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } else setError({ text: r.error });
    }, 1500);
    return () => clearTimeout(t);
  }, [a, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!save) return;
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save]);

  const steps = useMemo(
    () => [
      { label: "Review", done: (a.supportingEvidence?.length ?? 0) > 0 },
      { label: "Identify", done: !!a.issue },
      { label: "Missing info", done: view.missingInfoOptions.length === 0 || (a.missingInfo?.length ?? 0) > 0 },
      { label: "Rule", done: (view.policyOptions.length === 0 || !!a.policy) && (!view.deadline || !!a.deadline) },
      { label: "Action", done: !!a.action },
      { label: "Escalation", done: a.escalate !== undefined && a.escalate !== null },
      { label: "Rationale", done: (a.rationale?.trim().length ?? 0) >= view.rationaleMinLength },
      { label: "Notes", done: (a.notes?.trim().length ?? 0) >= view.documentationMinLength },
      { label: "Submit", done: false },
    ],
    [a, view],
  );
  const current = steps.findIndex((s) => !s.done);

  const onSubmit = () => {
    setError(null);
    if (!preview && !window.confirm("Submit this attempt for scoring? You cannot change your answers afterwards.")) return;
    start(async () => {
      const r = await submit(a);
      if (!r.ok) {
        setError({ text: r.error, field: r.field });
        if (r.field) document.getElementById(`q-${r.field}`)?.focus();
        return;
      }
      dirty.current = false;
      if (preview) setPreviewResult(r.data as SimResult);
      else {
        const href = (r.data as { href?: string }).href;
        if (href) router.push(href);
        router.refresh();
      }
    });
  };

  const radio = (name: keyof Answers, options: { id: string; label: string }[], legend: string, hint?: string) => (
    <fieldset id={`q-${name}`} tabIndex={-1} className="flex flex-col gap-2 outline-none">
      <legend className="text-[14.5px] font-semibold">{legend}</legend>
      {hint && <p className="text-[12.5px] text-muted-foreground">{hint}</p>}
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-start gap-2.5 rounded-[3px] border border-border bg-card px-3 py-2.5 text-[13.5px] leading-snug has-[:checked]:border-foreground">
          <input type="radio" name={name} value={o.id} checked={a[name] === o.id} onChange={() => set(name, o.id as never)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
          {o.label}
        </label>
      ))}
    </fieldset>
  );

  return (
    <div className="flex flex-col gap-8">
      <WorkflowStrip steps={steps} current={current === -1 ? steps.length - 1 : current} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Case file */}
        <section aria-labelledby="file-h" className="flex flex-col gap-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <h2 id="file-h" className="sr-only">
            Case file
          </h2>
          <div className="rounded-[var(--radius)] border border-border bg-card p-5">
            <p className="text-[14px] leading-relaxed">{view.brief}</p>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
              <p className="text-data text-[13px]">
                Claim {view.claim.claimNumber} · {view.payer.name}, {view.payer.plan}
              </p>
              <Pill tone={PRIORITY_TONE[view.financial.priority]}>{view.financial.priority} priority</Pill>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 text-[13px] sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Account</dt>
                <dd className="text-data">{view.claim.patientRef}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Provider</dt>
                <dd>{view.claim.providerRef}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date of service</dt>
                <dd className="text-data">{view.claim.dateOfService}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-data">{view.claim.submittedOn}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Billed / paid</dt>
                <dd className="text-data">
                  {usd(view.claim.billed)} / {usd(view.claim.paid)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">At risk</dt>
                <dd className="text-data">{usd(view.financial.atRisk)}</dd>
              </div>
            </dl>
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[28rem] text-left text-[13px]">
                <caption className="sr-only">Claim lines</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="px-5 py-2 font-medium">Code</th>
                    <th scope="col" className="px-2 py-2 font-medium">Description</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Units</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {view.claim.lines.map((l, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="text-data px-5 py-2">{l.code}</td>
                      <td className="px-2 py-2">{l.description}</td>
                      <td className="text-data px-2 py-2 text-right">{l.units}</td>
                      <td className="text-data px-5 py-2 text-right">{usd(l.charge)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {view.claim.diagnosis.length > 0 && <p className="border-t border-border px-5 py-2.5 text-[12.5px] text-muted-foreground">Diagnosis: {view.claim.diagnosis.join("; ")}</p>}
            <div className="border-t border-border bg-danger-bg/60 px-5 py-3 text-[13px]">
              <span className="text-data font-semibold">
                {view.denial.groupCode}-{view.denial.carc}
                {view.denial.rarc ? ` / ${view.denial.rarc}` : ""}
              </span>{" "}
              {view.denial.description} · denied {view.denial.deniedOn}
            </div>
          </div>

          <div>
            <h3 className="text-[14.5px] font-semibold">Timeline</h3>
            <ol className="mt-3 flex flex-col border-l border-border">
              {view.timeline.map((t, i) => (
                <li key={i} className="relative pb-3 pl-5 text-[13.5px] leading-snug">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-foreground" aria-hidden="true" />
                  <span className="text-data text-micro text-muted-foreground">{t.date}</span>
                  <span className="block">{t.event}</span>
                </li>
              ))}
            </ol>
          </div>

          <fieldset id="q-supportingEvidence" tabIndex={-1} className="flex flex-col gap-3 outline-none">
            <legend className="text-[14.5px] font-semibold">Evidence</legend>
            <p className="text-[12.5px] text-muted-foreground">Read each item. Tick the ones your decision relies on; ticking items that do not bear on the decision counts against you.</p>
            {view.evidence.map((e) => {
              const on = a.supportingEvidence?.includes(e.id) ?? false;
              return (
                <article key={e.id} className={`rounded-[var(--radius)] border bg-card ${on ? "border-foreground" : "border-border"}`}>
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                    <span>
                      <span className="text-data text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                        {EVIDENCE_LABEL[e.kind]}
                        {e.date ? ` · ${e.date}` : ""}
                      </span>
                      <span className="block text-[13.5px] font-medium">{e.title}</span>
                    </span>
                    <label className="flex items-center gap-2 text-[12.5px]">
                      <input type="checkbox" checked={on} onChange={() => toggle("supportingEvidence", e.id)} className="h-4 w-4 accent-[var(--primary)]" />
                      Relied on
                    </label>
                  </header>
                  <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-[13px] leading-relaxed">{e.body}</pre>
                </article>
              );
            })}
          </fieldset>
        </section>

        {/* Decision */}
        <section aria-labelledby="decide-h" className="flex flex-col gap-7">
          <h2 id="decide-h" className="text-[1.25rem] font-semibold">
            Your decision
          </h2>
          {radio("issue", view.issueOptions, "1. What is the problem?")}
          {view.missingInfoOptions.length > 0 && (
            <fieldset id="q-missingInfo" tabIndex={-1} className="flex flex-col gap-2 outline-none">
              <legend className="text-[14.5px] font-semibold">2. What do you still need to find out?</legend>
              <p className="text-[12.5px] text-muted-foreground">Tick everything that applies.</p>
              {view.missingInfoOptions.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-start gap-2.5 rounded-[3px] border border-border bg-card px-3 py-2.5 text-[13.5px] leading-snug has-[:checked]:border-foreground">
                  <input type="checkbox" checked={a.missingInfo?.includes(o.id) ?? false} onChange={() => toggle("missingInfo", o.id)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                  {o.label}
                </label>
              ))}
            </fieldset>
          )}
          {view.policyOptions.length > 0 && radio("policy", view.policyOptions, "3. Which rule applies?")}
          {view.deadline && radio("deadline", view.deadline.options, `4. ${view.deadline.question}`)}
          {radio("action", view.actionOptions, "5. What do you do next?")}

          <fieldset id="q-escalate" tabIndex={-1} className="flex flex-col gap-2 outline-none">
            <legend className="text-[14.5px] font-semibold">6. Does this need escalation?</legend>
            <div className="flex gap-2">
              {[
                { v: true, l: "Yes, escalate" },
                { v: false, l: "No, I can resolve it" },
              ].map((o) => (
                <label key={String(o.v)} className="flex cursor-pointer items-center gap-2 rounded-[3px] border border-border bg-card px-3 py-2 text-[13.5px] has-[:checked]:border-foreground">
                  <input type="radio" name="escalate" checked={a.escalate === o.v} onChange={() => set("escalate", o.v)} className="h-4 w-4 accent-[var(--primary)]" />
                  {o.l}
                </label>
              ))}
            </div>
            {a.escalate && (
              <label className="flex flex-col gap-1.5 text-micro font-medium">
                Who should it go to, and what do they need to decide?
                <textarea rows={2} value={a.escalationReason ?? ""} onChange={(e) => set("escalationReason", e.target.value)} className={TEXTAREA} />
              </label>
            )}
          </fieldset>

          <label id="q-rationale" className="flex flex-col gap-1.5">
            <span className="text-[14.5px] font-semibold">7. Why? Connect the evidence to your decision.</span>
            <textarea rows={4} value={a.rationale ?? ""} onChange={(e) => set("rationale", e.target.value)} className={TEXTAREA} />
            <span className="text-[12px] text-muted-foreground">At least {view.rationaleMinLength} characters.</span>
          </label>

          <label id="q-notes" className="flex flex-col gap-1.5">
            <span className="text-[14.5px] font-semibold">8. Account note</span>
            <span className="text-[12.5px] text-muted-foreground">Write it for the next person who opens this account. It should cover: {view.documentationGuide.join("; ")}. Use account and claim references only.</span>
            <textarea rows={6} value={a.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={TEXTAREA} />
            <span className="text-[12px] text-muted-foreground">At least {view.documentationMinLength} characters.</span>
          </label>

          <details className="rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-[13px]">
            <summary className="cursor-pointer font-medium">How this is scored</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {view.rubric.criteria.map((c) => (
                <li key={c.key} className="flex justify-between gap-4">
                  <span>{c.label}</span>
                  <span className="text-data text-muted-foreground">weight {c.weight}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Pass mark {view.rubric.passMark} out of 100{view.rubric.requireCorrectAction ? ", with the action that resolves the case" : ""}, and none of these critical errors:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {view.rubric.criticalErrors.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-3 text-muted-foreground">Sources: {view.sources.join(" · ")}</p>
          </details>

          {error && (
            <p role="alert" className="border-l-2 border-danger pl-3 text-[13.5px] text-danger">
              {error.text}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onSubmit} disabled={pending} className={BTN}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {preview ? "Score this draft" : "Submit for scoring"}
            </button>
            {save && (
              <button
                type="button"
                className={BTN_OUTLINE}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await save(a);
                    if (r.ok) {
                      dirty.current = false;
                      setSaved(new Date(r.data.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
                    } else setError({ text: r.error });
                  })
                }
              >
                Save and finish later
              </button>
            )}
            <span aria-live="polite" className="text-micro text-muted-foreground">
              {save ? (saved ? `Saved at ${saved}` : "Your answers save automatically.") : "Preview: nothing is saved."}
            </span>
          </div>
        </section>
      </div>

      {previewResult && (
        <section aria-label="Preview result" className="border-t border-border pt-8">
          <CaseResult result={previewResult} />
        </section>
      )}
    </div>
  );
}
