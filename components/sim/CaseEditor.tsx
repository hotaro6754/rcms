"use client";

import { useState, type ReactNode } from "react";
import type { CaseDefinition } from "@/lib/sim/definition";
import { CRITERIA, CRITERION_LABEL, EVIDENCE_KINDS, EVIDENCE_LABEL } from "@/lib/sim/labels";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, FIELD, TEXTAREA } from "@/components/admin/kit";
import { updateCaseAction } from "@/lib/actions/sims";

type Def = CaseDefinition;
type Opt = Def["issueOptions"][number];
type Upd<T> = (patch: Partial<T>) => void;

let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36).slice(-4)}${(seq++).toString(36)}`;

/**
 * The case editor. Every part of a case (file, questions, answer key, rubric, critical errors,
 * competencies, sources) is edited through form fields; the server validates the whole case on
 * save and says exactly what is wrong. "Edit as JSON" is there for bulk changes.
 */
export function CaseEditor({
  id,
  lockVersion,
  initial,
  programId,
  courses,
  competencies,
  editable,
}: {
  id: string;
  lockVersion: number;
  initial: Def;
  programId: string | null;
  courses: { id: string; name: string }[];
  competencies: { code: string; name: string; status: string }[];
  editable: boolean;
}) {
  const [d, setD] = useState<Def>(initial);
  const [raw, setRaw] = useState<string | null>(null);
  const up = (patch: Partial<Def>) => setD((p) => ({ ...p, ...patch }));
  const json = raw ?? JSON.stringify(d);

  return (
    <ActionForm action={updateCaseAction} success="Saved." className="flex flex-col gap-8">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="lockVersion" value={lockVersion} />
      <input type="hidden" name="definition" value={json} />
      <fieldset disabled={!editable} className="flex flex-col gap-8">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_OUTLINE} onClick={() => setRaw(raw === null ? JSON.stringify(d, null, 2) : null)}>
            {raw === null ? "Edit as JSON" : "Back to the form"}
          </button>
          {raw !== null && (
            <button
              type="button"
              className={BTN_OUTLINE}
              onClick={() => {
                try {
                  setD(JSON.parse(raw));
                  setRaw(null);
                } catch {
                  alert("That is not valid JSON.");
                }
              }}
            >
              Apply JSON to the form
            </button>
          )}
        </div>

        {raw !== null ? (
          <textarea aria-label="Case definition as JSON" value={raw} onChange={(e) => setRaw(e.target.value)} rows={40} className={`${TEXTAREA} font-mono text-[12px]`} />
        ) : (
          <>
            <Section title="Basics">
              <Text label="Title" value={d.title} onChange={(title) => up({ title })} />
              <Text label="Summary" value={d.summary} onChange={(summary) => up({ summary })} rows={2} hint="Shown on the case list." />
              <Text label="Assignment brief" value={d.brief} onChange={(brief) => up({ brief })} rows={3} hint="What the learner is asked to do, including today's date in the scenario." />
              <div className="grid gap-3 sm:grid-cols-3">
                <Num label="Difficulty (1–5)" value={d.difficulty} onChange={(difficulty) => up({ difficulty })} />
                <Num label="Minutes" value={d.estimatedMinutes} onChange={(estimatedMinutes) => up({ estimatedMinutes })} />
                <label className="flex flex-col gap-1.5 text-micro font-medium">
                  Limit to learners of course
                  <select name="programId" defaultValue={programId ?? ""} className={FIELD}>
                    <option value="">Any signed-in learner</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </Section>

            <Section title="Claim, payer and denial" hint="Synthetic only. Label invented payers and providers as fictional. Amounts are in cents.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Payer" value={d.payer.name} onChange={(name) => up({ payer: { ...d.payer, name } })} />
                <Text label="Plan" value={d.payer.plan} onChange={(plan) => up({ payer: { ...d.payer, plan } })} />
                <Text label="Claim number" value={d.claim.claimNumber} onChange={(claimNumber) => up({ claim: { ...d.claim, claimNumber } })} />
                <Text label="Account reference" value={d.claim.patientRef} onChange={(patientRef) => up({ claim: { ...d.claim, patientRef } })} />
                <Text label="Provider" value={d.claim.providerRef} onChange={(providerRef) => up({ claim: { ...d.claim, providerRef } })} />
                <Text label="Date of service" value={d.claim.dateOfService} onChange={(dateOfService) => up({ claim: { ...d.claim, dateOfService } })} />
                <Text label="Submitted on" value={d.claim.submittedOn} onChange={(submittedOn) => up({ claim: { ...d.claim, submittedOn } })} />
                <Num label="Billed (cents)" value={d.claim.billed} onChange={(billed) => up({ claim: { ...d.claim, billed } })} />
                <Num label="Paid (cents)" value={d.claim.paid} onChange={(paid) => up({ claim: { ...d.claim, paid } })} />
              </div>
              <List
                label="Claim lines"
                items={d.claim.lines}
                onChange={(lines) => up({ claim: { ...d.claim, lines } })}
                make={() => ({ code: "", description: "", units: 1, charge: 0 })}
                render={(l, u) => (
                  <div className="grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_5rem_8rem]">
                    <Text label="Code" value={l.code} onChange={(code) => u({ code })} />
                    <Text label="Description" value={l.description} onChange={(description) => u({ description })} />
                    <Num label="Units" value={l.units} onChange={(units) => u({ units })} />
                    <Num label="Charge (cents)" value={l.charge} onChange={(charge) => u({ charge })} />
                  </div>
                )}
              />
              <Text label="Diagnoses" value={d.claim.diagnosis.join("\n")} onChange={(v) => up({ claim: { ...d.claim, diagnosis: v.split("\n").map((x) => x.trim()).filter(Boolean) } })} rows={2} hint="One per line." />
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="flex flex-col gap-1.5 text-micro font-medium">
                  Group code
                  <select value={d.denial.groupCode} onChange={(e) => up({ denial: { ...d.denial, groupCode: e.target.value as Def["denial"]["groupCode"] } })} className={FIELD}>
                    {["CO", "PR", "OA", "PI"].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <Text label="CARC" value={d.denial.carc} onChange={(carc) => up({ denial: { ...d.denial, carc } })} />
                <Text label="RARC (optional)" value={d.denial.rarc ?? ""} onChange={(rarc) => up({ denial: { ...d.denial, rarc: rarc || undefined } })} />
                <Text label="Denied on" value={d.denial.deniedOn} onChange={(deniedOn) => up({ denial: { ...d.denial, deniedOn } })} />
              </div>
              <Text label="Denial description" value={d.denial.description} onChange={(description) => up({ denial: { ...d.denial, description } })} hint="Paraphrase the code list and cite it in Sources." />
              <div className="grid gap-3 sm:grid-cols-2">
                <Num label="Amount at risk (cents)" value={d.financial.atRisk} onChange={(atRisk) => up({ financial: { ...d.financial, atRisk } })} />
                <label className="flex flex-col gap-1.5 text-micro font-medium">
                  Priority
                  <select value={d.financial.priority} onChange={(e) => up({ financial: { ...d.financial, priority: e.target.value as Def["financial"]["priority"] } })} className={FIELD}>
                    {["LOW", "MEDIUM", "HIGH"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
            </Section>

            <Section title="Timeline">
              <List
                label="Events"
                items={d.timeline}
                onChange={(timeline) => up({ timeline })}
                make={() => ({ date: "", event: "" })}
                render={(t, u) => (
                  <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                    <Text label="Date" value={t.date} onChange={(date) => u({ date })} />
                    <Text label="Event" value={t.event} onChange={(event) => u({ event })} />
                  </div>
                )}
              />
            </Section>

            <Section title="Evidence" hint="Tick “supports the decision” for the items the answer key relies on. Learners never see that flag.">
              <List
                label="Evidence items"
                items={d.evidence}
                onChange={(evidence) => up({ evidence })}
                make={() => ({ id: newId("ev"), kind: "NOTE" as const, title: "", body: "", relevant: false })}
                render={(e, u) => (
                  <div className="flex flex-col gap-2">
                    <div className="grid gap-2 sm:grid-cols-[8rem_10rem_minmax(0,1fr)_8rem]">
                      <Text label="Id" value={e.id} onChange={(id) => u({ id })} />
                      <label className="flex flex-col gap-1.5 text-micro font-medium">
                        Kind
                        <select value={e.kind} onChange={(ev) => u({ kind: ev.target.value as typeof e.kind })} className={FIELD}>
                          {EVIDENCE_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {EVIDENCE_LABEL[k]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Text label="Title" value={e.title} onChange={(title) => u({ title })} />
                      <Text label="Date" value={e.date ?? ""} onChange={(date) => u({ date: date || undefined })} />
                    </div>
                    <Text label="Content" value={e.body} onChange={(body) => u({ body })} rows={4} />
                    <Check label="Supports the expected decision" checked={e.relevant} onChange={(relevant) => u({ relevant })} />
                  </div>
                )}
              />
            </Section>

            <Section title="Questions and answer key">
              <Options label="1. What is the problem? (one correct)" items={d.issueOptions} onChange={(issueOptions) => up({ issueOptions })} prefix="issue" />
              <Options label="2. Missing information (any number correct; may be empty)" items={d.missingInfoOptions} onChange={(missingInfoOptions) => up({ missingInfoOptions })} prefix="mi" multi />
              <Options label="3. Which rule applies? (one correct; leave empty to skip)" items={d.policyOptions} onChange={(policyOptions) => up({ policyOptions })} prefix="rule" />
              <div className="flex flex-col gap-2 rounded-[3px] border border-border p-3">
                <Check label="Ask a deadline question" checked={!!d.deadline} onChange={(on) => up({ deadline: on ? { question: "By when must this be resolved?", options: [] } : undefined })} />
                {d.deadline && (
                  <>
                    <Text label="Deadline question" value={d.deadline.question} onChange={(question) => up({ deadline: { ...d.deadline!, question } })} />
                    <Options label="Deadline options (one correct)" items={d.deadline.options} onChange={(options) => up({ deadline: { ...d.deadline!, options } })} prefix="d" />
                  </>
                )}
              </div>
              <Options label="5. Next action (one correct). Fill in the risk for wrong actions." items={d.actionOptions} onChange={(actionOptions) => up({ actionOptions })} prefix="act" withRisk />
              <div className="flex flex-col gap-2 rounded-[3px] border border-border p-3">
                <Check label="This case must be escalated" checked={d.escalation.required} onChange={(required) => up({ escalation: { ...d.escalation, required } })} />
                <Text label="Why (shown when the answer is revealed)" value={d.escalation.explanation} onChange={(explanation) => up({ escalation: { ...d.escalation, explanation } })} rows={2} />
              </div>
            </Section>

            <Section title="Documentation and rationale checks" hint="Each element is covered when the learner's text contains any one of its terms. This is a coarse automated check; instructors can adjust it in review.">
              <Elements label="Account note must cover" value={d.documentation} onChange={(documentation) => up({ documentation })} />
              <Elements label="Rationale must address" value={d.rationale} onChange={(rationale) => up({ rationale })} />
            </Section>

            <Section title="Expected decision" hint="Shown after a pass, or after the reveal threshold.">
              <Text label="Decision" value={d.expected.decision} onChange={(decision) => up({ expected: { ...d.expected, decision } })} rows={4} />
              <Text label="How to get it right next time" value={d.expected.howToCorrect} onChange={(howToCorrect) => up({ expected: { ...d.expected, howToCorrect } })} rows={3} />
            </Section>

            <Section title="Rubric" hint="Weights are relative (0 removes a criterion). Each published version keeps its own rubric.">
              <div className="grid gap-3 sm:grid-cols-3">
                {CRITERIA.map((c) => (
                  <Num key={c} label={CRITERION_LABEL[c]} value={d.rubric.weights[c]} onChange={(w) => up({ rubric: { ...d.rubric, weights: { ...d.rubric.weights, [c]: w } } })} />
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Num label="Pass mark (50–100)" value={d.rubric.passMark} onChange={(passMark) => up({ rubric: { ...d.rubric, passMark } })} />
                <Num label="Reveal answer after attempt (0 = only after a pass)" value={d.rubric.revealAfterAttempts} onChange={(revealAfterAttempts) => up({ rubric: { ...d.rubric, revealAfterAttempts } })} />
                <Num label="Maximum attempts (0 = unlimited)" value={d.rubric.maxAttempts} onChange={(maxAttempts) => up({ rubric: { ...d.rubric, maxAttempts } })} />
              </div>
              <Check label="Passing requires the correct action" checked={d.rubric.requireCorrectAction} onChange={(requireCorrectAction) => up({ rubric: { ...d.rubric, requireCorrectAction } })} />
              <List
                label="Critical errors (any one fails the attempt)"
                items={d.rubric.criticalErrors}
                onChange={(criticalErrors) => up({ rubric: { ...d.rubric, criticalErrors } })}
                make={() => ({ id: newId("ce"), label: "", explanation: "", trigger: { type: "identifier_in_notes" as const } })}
                render={(ce, u) => (
                  <div className="flex flex-col gap-2">
                    <Text label="Label (shown to learners before they start)" value={ce.label} onChange={(label) => u({ label })} />
                    <Text label="Explanation (shown when it happens)" value={ce.explanation} onChange={(explanation) => u({ explanation })} rows={2} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5 text-micro font-medium">
                        Triggered when
                        <select
                          value={ce.trigger.type}
                          onChange={(e) => {
                            const type = e.target.value as typeof ce.trigger.type;
                            u({ trigger: type === "action" ? { type, optionId: d.actionOptions.find((o) => !o.correct)?.id ?? "" } : { type } });
                          }}
                          className={FIELD}
                        >
                          <option value="action">The learner chooses a specific action</option>
                          <option value="issue_wrong">The issue is misidentified</option>
                          <option value="deadline_wrong">The deadline is wrong</option>
                          <option value="escalation_missed">Required escalation is missed</option>
                          <option value="identifier_in_notes">Identifiers appear in notes</option>
                        </select>
                      </label>
                      {ce.trigger.type === "action" && (
                        <label className="flex flex-col gap-1.5 text-micro font-medium">
                          Action
                          <select value={ce.trigger.optionId} onChange={(e) => u({ trigger: { type: "action", optionId: e.target.value } })} className={FIELD}>
                            {d.actionOptions
                              .filter((o) => !o.correct)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              />
            </Section>

            <Section title="Competencies and sources">
              <fieldset className="flex flex-col gap-1.5">
                <legend className="text-micro font-medium">Competencies this case evidences (must be active to publish)</legend>
                {competencies.map((c) => (
                  <Check
                    key={c.code}
                    label={`${c.code} · ${c.name}${c.status !== "ACTIVE" ? ` (${c.status.toLowerCase()})` : ""}`}
                    checked={d.competencyCodes.includes(c.code)}
                    onChange={(on) => up({ competencyCodes: on ? [...d.competencyCodes, c.code] : d.competencyCodes.filter((x) => x !== c.code) })}
                  />
                ))}
              </fieldset>
              <Text label="Sources" value={d.sources.join("\n")} onChange={(v) => up({ sources: v.split("\n").map((x) => x.trim()).filter(Boolean) })} rows={3} hint="One per line: the code list, rule or manual relied on, with a URL and date where possible. Say when a payer or policy is fictional." />
            </Section>
          </>
        )}
      </fieldset>
      {editable && <button className={`${BTN} w-fit`}>Save case</button>}
    </ActionForm>
  );
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-5">
      <h2 className="text-[1rem] font-semibold">{title}</h2>
      {hint && <p className="-mt-1 text-[12.5px] text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

function Text({ label, value, onChange, rows, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-micro font-medium">
      {label}
      {rows ? <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className={`${TEXTAREA} font-normal`} /> : <input value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD} font-normal`} />}
      {hint && <span className="text-[12px] font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-micro font-medium">
      {label}
      <input type="number" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className={`${FIELD} font-normal`} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-[13.5px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

function List<T>({ label, items, onChange, make, render }: { label: string; items: T[]; onChange: (v: T[]) => void; make: () => T; render: (item: T, update: Upd<T>) => ReactNode }) {
  const set = (i: number, patch: Partial<T>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-micro font-medium">{label}</legend>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-[3px] border border-border p-3">
          {render(item, (p) => set(i, p))}
          <div className="flex gap-3 text-[12px]">
            <button type="button" onClick={() => move(i, -1)} className="underline underline-offset-2" aria-label={`Move item ${i + 1} up`}>
              Up
            </button>
            <button type="button" onClick={() => move(i, 1)} className="underline underline-offset-2" aria-label={`Move item ${i + 1} down`}>
              Down
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-danger underline underline-offset-2" aria-label={`Remove item ${i + 1}`}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, make()])} className={`${BTN_OUTLINE} w-fit`}>
        Add
      </button>
    </fieldset>
  );
}

function Options({ label, items, onChange, prefix, multi, withRisk }: { label: string; items: Opt[]; onChange: (v: Opt[]) => void; prefix: string; multi?: boolean; withRisk?: boolean }) {
  return (
    <List
      label={label}
      items={items}
      onChange={onChange}
      make={() => ({ id: newId(prefix), label: "", correct: false, explanation: "", risk: "" })}
      render={(o, u) => (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <Text label="Id" value={o.id} onChange={(id) => u({ id })} />
            <Text label="Option" value={o.label} onChange={(l) => u({ label: l })} />
          </div>
          <Check
            label="Correct"
            checked={o.correct}
            onChange={(correct) => {
              if (!multi && correct) onChange(items.map((x) => ({ ...x, correct: x.id === o.id })));
              else u({ correct });
            }}
          />
          <Text label="Explanation (shown when the answer is revealed)" value={o.explanation} onChange={(explanation) => u({ explanation })} rows={2} />
          {withRisk && !o.correct && <Text label="Risk if chosen (always shown when picked)" value={o.risk} onChange={(risk) => u({ risk })} rows={2} />}
        </div>
      )}
    />
  );
}

function Elements({ label, value, onChange }: { label: string; value: Def["documentation"]; onChange: (v: Def["documentation"]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <List
        label={label}
        items={value.elements}
        onChange={(elements) => onChange({ ...value, elements })}
        make={() => ({ label: "", terms: [] })}
        render={(e, u) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Text label="Element" value={e.label} onChange={(l) => u({ label: l })} />
            <Text label="Matching terms (comma-separated)" value={e.terms.join(", ")} onChange={(t) => u({ terms: t.split(",").map((x) => x.trim()).filter(Boolean) })} />
          </div>
        )}
      />
      <Num label="Minimum length (characters)" value={value.minLength} onChange={(minLength) => onChange({ ...value, minLength })} />
    </div>
  );
}
