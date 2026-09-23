"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  addActionItem,
  removeActionItem,
  saveCapacityRun,
  saveRca,
  submitAttempt,
} from "@/lib/actions/labs";
import { ScenarioTelemetry, type LearnerScenario } from "@/components/portal/ScenarioTelemetry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { count, money } from "@/lib/utils";

export interface CapacityResult {
  capacity: number;
  net: number;
  daysToClear: number | null;
  firstPass: number;
  arOver90: number;
  monthlyCost: number;
  costToCollect: number;
}

export interface RunRecord {
  id: string;
  analysts: number;
  qaBar: number;
  automation: number;
  result: CapacityResult;
}

export interface RcaStep {
  question: string;
  answer: string;
  evidence: string;
}

export interface ActionRecord {
  id: string;
  action: string;
  owner: string;
  dueDate: string;
  expectedImpact: string | null;
}

const WHY_PROMPTS = [
  "Which number moved, and by how much?",
  "What produced that movement?",
  "Why did that happen when it did?",
  "Which control should have caught it?",
  "Why was that control not in place?",
];

/**
 * The lab workspace. Five stages in the order a real review runs: read the account, decide
 * the staffing, find the cause, assign the work, write the note. Every stage saves on its
 * own so a half-finished review survives a closed tab, and submitting locks all of it.
 */
export function LabWorkspace({
  attemptId,
  scenario,
  runs: initialRuns,
  rca,
  actions: initialActions,
}: {
  attemptId: string;
  scenario: LearnerScenario;
  runs: RunRecord[];
  rca: { subject: string; steps: RcaStep[]; conclusion: string | null } | null;
  actions: ActionRecord[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("brief");
  const [runs, setRuns] = useState(initialRuns);
  const [actions, setActions] = useState(initialActions);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const latest = runs[0] ?? null;

  function run<T extends { ok: boolean }>(fn: () => Promise<T>, onOk: (res: T) => void) {
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) onOk(res);
      else setError((res as unknown as { error: string }).error);
    });
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="brief">1 · The account</TabsTrigger>
        <TabsTrigger value="capacity">2 · Capacity</TabsTrigger>
        <TabsTrigger value="rca">3 · Root cause</TabsTrigger>
        <TabsTrigger value="actions">4 · Actions</TabsTrigger>
        <TabsTrigger value="submit">5 · Executive note</TabsTrigger>
      </TabsList>

      {error && (
        <p role="alert" className="mt-4 rounded-[var(--radius)] bg-danger-bg px-4 py-3 text-micro text-danger">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-4 rounded-[var(--radius)] bg-success-bg px-4 py-3 text-micro text-success">
          {saved}
        </p>
      )}

      <TabsContent value="brief" className="mt-8">
        <ScenarioTelemetry scenario={scenario} />
      </TabsContent>

      {/* ------------------------------------------------------------------ capacity */}
      <TabsContent value="capacity" className="mt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <form
            action={(fd) =>
              run(
                () => saveCapacityRun(attemptId, fd),
                (res) => {
                  const data = (res as { data: CapacityResult }).data;
                  setRuns((prev) => [
                    {
                      id: `local-${prev.length}`,
                      analysts: Number(fd.get("analysts")),
                      qaBar: Number(fd.get("qaBar")),
                      automation: Number(fd.get("automation")),
                      result: data,
                    },
                    ...prev,
                  ]);
                  setSaved("Configuration recorded. Run as many as you need — the last one is the decision you are graded on.");
                },
              )
            }
            className="rounded-[var(--radius)] border border-border bg-card px-5 py-5"
          >
            <h2 className="text-[15px] font-semibold">Staffing model</h2>
            <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
              {count(scenario.capacity.openClaims)} open claims, {scenario.capacity.dailyInflow} new
              a day, {scenario.capacity.staffed} analysts on the account today at{" "}
              {money(scenario.capacity.costPerAnalyst)} each a month.
            </p>

            <div className="mt-5 flex flex-col gap-5">
              <NumberField
                name="analysts"
                label="Analysts"
                min={1}
                max={60}
                defaultValue={latest?.analysts ?? scenario.capacity.staffed}
              />
              <NumberField
                name="qaBar"
                label="QA bar %"
                min={80}
                max={100}
                defaultValue={latest?.qaBar ?? 93}
                hint="Raising the bar slows every analyst down."
              />
              <NumberField
                name="automation"
                label="Automation %"
                min={0}
                max={80}
                defaultValue={latest?.automation ?? 15}
                hint="Bots clear volume but cost money and cannot judge."
              />
            </div>

            <Button type="submit" disabled={pending} className="mt-6 min-h-11 w-full rounded-full">
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Run this configuration
            </Button>
          </form>

          <div>
            {latest ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Daily capacity" value={count(latest.result.capacity)} sub={`${latest.result.net > 0 ? "clears" : "misses"} inflow by ${count(Math.abs(latest.result.net))}`} tone={latest.result.net > 0 ? "good" : "bad"} />
                  <Stat
                    label="Backlog cleared in"
                    value={latest.result.daysToClear ? `${latest.result.daysToClear} days` : "never"}
                    sub={latest.result.daysToClear ? "at this configuration" : "capacity is below inflow"}
                    tone={latest.result.daysToClear && latest.result.daysToClear <= 45 ? "good" : "bad"}
                  />
                  <Stat label="Cost to collect" value={`${latest.result.costToCollect}%`} sub={`${money(latest.result.monthlyCost)} a month`} tone={latest.result.costToCollect <= 4.5 ? "good" : "bad"} />
                  <Stat label="First-pass resolution" value={`${latest.result.firstPass}%`} sub="projected" tone={latest.result.firstPass >= 88 ? "good" : "bad"} />
                  <Stat label="A/R over 90" value={`${latest.result.arOver90}%`} sub="projected" tone={latest.result.arOver90 <= 18 ? "good" : "bad"} />
                </div>

                <h3 className="mt-8 text-[13px] font-semibold">Runs, newest first</h3>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {runs.map((r) => (
                    <li
                      key={r.id}
                      className="text-data flex flex-wrap gap-x-4 rounded-[var(--radius)] border border-border bg-card px-4 py-2.5 text-micro"
                    >
                      <span>{r.analysts} analysts</span>
                      <span>QA {r.qaBar}%</span>
                      <span>auto {r.automation}%</span>
                      <span className="ml-auto text-muted-foreground">
                        {r.result.daysToClear ? `${r.result.daysToClear}d to clear` : "never clears"} ·{" "}
                        {r.result.costToCollect}% cost to collect
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="max-w-[54ch] text-[13.5px] leading-relaxed text-muted-foreground">
                Nothing run yet. Pick a configuration you would actually defend to a client:
                the cheapest one that clears the backlog inside the quarter without dropping
                quality. Every run is kept, and the last one is the decision on record.
              </p>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ----------------------------------------------------------------------- rca */}
      <TabsContent value="rca" className="mt-8">
        <form
          action={(fd) =>
            run(
              () => saveRca(attemptId, fd),
              () => setSaved("Root cause analysis saved."),
            )
          }
          className="max-w-[68rem]"
        >
          <h2 className="text-[15px] font-semibold">Five whys</h2>
          <p className="mt-2 max-w-[62ch] text-micro leading-relaxed text-muted-foreground">
            Start from the metric that moved and keep going until you reach something that
            can be owned. Evidence means a number from the telemetry, not an impression.
          </p>

          <div className="mt-5 flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-micro font-medium">
              What are you analysing?
            </label>
            <Input
              id="subject"
              name="subject"
              defaultValue={rca?.subject ?? ""}
              placeholder="e.g. the 9% collections shortfall"
              className="min-h-10 max-w-lg"
            />
          </div>

          <ol className="mt-6 flex flex-col gap-4">
            {WHY_PROMPTS.map((prompt, i) => (
              <li
                key={i}
                className="rounded-[var(--radius)] border border-border bg-card px-5 py-4"
              >
                <p className="label-caps">Level {i + 1}</p>
                <input type="hidden" name={`q${i}`} value={prompt} />
                <p className="mt-1 text-[13.5px] font-medium">{prompt}</p>
                <Textarea
                  name={`a${i}`}
                  defaultValue={rca?.steps?.[i]?.answer ?? ""}
                  rows={2}
                  className="mt-3"
                  placeholder="Your answer"
                />
                <Input
                  name={`e${i}`}
                  defaultValue={rca?.steps?.[i]?.evidence ?? ""}
                  className="mt-2 min-h-10"
                  placeholder="Evidence — the figure that supports it"
                />
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-col gap-1.5">
            <label htmlFor="conclusion" className="text-micro font-medium">
              Conclusion
            </label>
            <Textarea
              id="conclusion"
              name="conclusion"
              rows={3}
              defaultValue={rca?.conclusion ?? ""}
              placeholder="In one paragraph: what actually happened, and what it cost."
            />
          </div>

          <Button type="submit" disabled={pending} className="mt-5 min-h-11 rounded-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save analysis
          </Button>
        </form>
      </TabsContent>

      {/* ------------------------------------------------------------------- actions */}
      <TabsContent value="actions" className="mt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div>
            <h2 className="text-[15px] font-semibold">Action register</h2>
            {actions.length === 0 ? (
              <p className="mt-3 max-w-[56ch] text-[13.5px] leading-relaxed text-muted-foreground">
                Nothing assigned yet. A review that ends without owned, dated actions is a
                status update.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {actions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-4 rounded-[var(--radius)] border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-snug">{a.action}</p>
                      <p className="text-data mt-1.5 text-micro text-muted-foreground">
                        {a.owner} · due {a.dueDate}
                        {a.expectedImpact && ` · ${a.expectedImpact}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove action: ${a.action}`}
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => removeActionItem(a.id),
                          () => setActions((prev) => prev.filter((x) => x.id !== a.id)),
                        )
                      }
                      className="ml-auto shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-danger-bg hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            action={(fd) =>
              run(
                () => addActionItem(attemptId, fd),
                () => {
                  setActions((prev) => [
                    ...prev,
                    {
                      id: `local-${prev.length}`,
                      action: String(fd.get("action")),
                      owner: String(fd.get("owner")),
                      dueDate: String(fd.get("dueDate")),
                      expectedImpact: String(fd.get("expectedImpact") ?? "") || null,
                    },
                  ]);
                  setSaved("Action added.");
                  router.refresh();
                },
              )
            }
            className="rounded-[var(--radius)] border border-border bg-card px-5 py-5"
          >
            <h2 className="text-[15px] font-semibold">Assign one</h2>
            <div className="mt-4 flex flex-col gap-4">
              <Field name="action" label="What will be done" textarea />
              <Field name="owner" label="Owner" placeholder="A named role or person" />
              <Field name="dueDate" label="Due" placeholder="e.g. 24 October" />
              <Field name="expectedImpact" label="Expected impact" placeholder="Optional — the number it moves" />
            </div>
            <Button type="submit" disabled={pending} className="mt-5 min-h-11 w-full rounded-full">
              <Plus className="h-4 w-4" aria-hidden />
              Add action
            </Button>
          </form>
        </div>
      </TabsContent>

      {/* -------------------------------------------------------------------- submit */}
      <TabsContent value="submit" className="mt-8">
        <form
          action={(fd) =>
            run(
              () => submitAttempt(attemptId, fd),
              () => router.refresh(),
            )
          }
          className="max-w-[62rem]"
        >
          <h2 className="text-[15px] font-semibold">The note you would actually send</h2>
          <p className="mt-2 max-w-[62ch] text-micro leading-relaxed text-muted-foreground">
            Written for a practice executive, not for your trainer. Submitting locks the whole
            attempt — capacity, analysis and actions included — and sends it for marking.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Field name="whatChanged" label="What changed" textarea placeholder="The movement, with the figures." />
            <Field name="whyChanged" label="Why it changed" textarea placeholder="The mechanism, not the metric." />
            <Field name="rootCause" label="Root cause" textarea placeholder="Where the control was missing." />
            <Field name="recommendedAction" label="Recommended action" textarea placeholder="The decision you need from them." />
            <Field name="financialImpact" label="Financial impact" placeholder="e.g. $512K written off, $288K recoverable" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="owner" label="Accountable owner" />
              <Field name="deadline" label="By when" />
            </div>
          </div>

          <Button type="submit" disabled={pending} className="mt-6 min-h-11 rounded-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Submit for marking
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}

function Field({
  name,
  label,
  placeholder,
  textarea,
}: {
  name: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-micro font-medium">
        {label}
      </label>
      {textarea ? (
        <Textarea id={name} name={name} rows={3} placeholder={placeholder} />
      ) : (
        <Input id={name} name={name} placeholder={placeholder} className="min-h-10" />
      )}
    </div>
  );
}

function NumberField({
  name,
  label,
  min,
  max,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className="text-micro font-medium">
          {label}
        </label>
        <span className="text-data text-[15px]">{value}</span>
      </div>
      <input
        id={name}
        name={name}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
      />
      {hint && <p className="text-micro leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "bad";
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card px-4 py-4">
      <p className="label-caps">{label}</p>
      <p className={`text-data mt-2 text-[1.4rem] leading-none ${tone === "good" ? "text-success" : "text-danger"}`}>
        {value}
      </p>
      <p className="mt-2 text-micro leading-snug text-muted-foreground">{sub}</p>
    </div>
  );
}
