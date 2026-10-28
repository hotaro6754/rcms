import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Checkbox, FIELD, Panel, TEXTAREA, when } from "@/components/admin/kit";
import { CaseResult } from "@/components/sim/CaseResult";
import { reviewCaseAttemptAction } from "@/lib/actions/sims";
import { Answers, CaseDefinition } from "@/lib/sim/definition";
import type { SimResult } from "@/lib/sim/score";

export const metadata = { title: "Case attempt" };

export default async function CaseAttemptReview({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("assessment.grade");
  const { id } = await params;
  const a = await prisma.simAttempt.findUnique({ where: { id }, include: { user: { select: { name: true, email: true } }, version: true, outcomes: { where: { supersededAt: null }, include: { competency: true } } } });
  if (!a || a.state === "IN_PROGRESS") notFound();
  const d = CaseDefinition.parse(a.version.definition);
  const ans = Answers.parse(a.answers);
  const result = a.result as unknown as SimResult;
  const label = (list: { id: string; label: string; correct?: boolean }[], v?: string) => {
    const o = list.find((x) => x.id === v);
    return o ? `${o.label}${o.correct ? " ✓" : " ✗"}` : "—";
  };
  const own = a.userId === actor.id;
  const score = (k: string) => result.criteria.find((c) => c.key === k)?.score ?? 0;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href="/admin/grading/cases" className="text-micro text-muted-foreground hover:text-foreground">
        ← Case attempts
      </Link>
      <PageHead kicker={`${d.title} · v${a.version.version} · attempt ${a.attemptNo}`} title={a.user.name} lede={`Submitted ${when(a.submittedAt, true)}${a.reviewedAt ? ` · reviewed ${when(a.reviewedAt, true)}` : ""}`} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-8">
          <Panel title="The learner's answers, against the key">
            <dl className="grid gap-x-6 gap-y-2.5 text-[13.5px] sm:grid-cols-[11rem_minmax(0,1fr)]">
              <dt className="text-muted-foreground">Issue</dt>
              <dd>{label(d.issueOptions, ans.issue)}</dd>
              <dt className="text-muted-foreground">Evidence relied on</dt>
              <dd>{(ans.supportingEvidence ?? []).map((e) => { const x = d.evidence.find((y) => y.id === e); return x ? `${x.title}${x.relevant ? " ✓" : " ✗"}` : e; }).join("; ") || "—"}</dd>
              {d.missingInfoOptions.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Missing information</dt>
                  <dd>{(ans.missingInfo ?? []).map((m) => label(d.missingInfoOptions, m)).join("; ") || "—"}</dd>
                </>
              )}
              {d.policyOptions.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Rule</dt>
                  <dd>{label(d.policyOptions, ans.policy)}</dd>
                </>
              )}
              {d.deadline && (
                <>
                  <dt className="text-muted-foreground">Deadline</dt>
                  <dd>{label(d.deadline.options, ans.deadline)}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Action</dt>
              <dd>{label(d.actionOptions, ans.action)}</dd>
              <dt className="text-muted-foreground">Escalate</dt>
              <dd>
                {ans.escalate ? "Yes" : "No"} {ans.escalate === d.escalation.required ? "✓" : "✗"} {ans.escalationReason ? `— ${ans.escalationReason}` : ""}
              </dd>
              <dt className="text-muted-foreground">Rationale</dt>
              <dd className="whitespace-pre-line">{ans.rationale || "—"}</dd>
              <dt className="text-muted-foreground">Account note</dt>
              <dd className="whitespace-pre-line">{ans.notes || "—"}</dd>
            </dl>
          </Panel>
          <CaseResult result={result} outcomes={a.outcomes.map((o) => ({ code: o.competency.code, name: o.competency.name, level: o.competency.proficiencyLevel, demonstrated: o.demonstrated, evidenceScore: o.evidenceScore }))} instructorNote={a.instructorNote} />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Panel title="Review">
            {own ? (
              <p className="text-[13px] text-muted-foreground">This is your own attempt; another instructor must review it.</p>
            ) : (
              <ActionForm action={reviewCaseAttemptAction} success="Review saved; the learner has been notified." className="flex flex-col gap-3">
                <input type="hidden" name="attemptId" value={a.id} />
                <p className="text-[12.5px] text-muted-foreground">Replace the automated scores for the two written criteria if they misjudged the writing. Scores round to the nearest 25. The attempt is rescored and competency outcomes updated; earlier outcomes are kept in history.</p>
                <label className="flex flex-col gap-1.5 text-micro font-medium">
                  Documentation quality (now {score("documentation")})
                  <select name="documentation" defaultValue="" className={FIELD}>
                    <option value="">Keep the automated score</option>
                    {[0, 25, 50, 75, 100].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-micro font-medium">
                  Rationale quality (now {score("rationale")})
                  <select name="rationale" defaultValue="" className={FIELD}>
                    <option value="">Keep the automated score</option>
                    {[0, 25, 50, 75, 100].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                {result.identifiers.length > 0 && <Checkbox name="dismissIdentifierFlag" label="The identifier flag is a false positive" hint={`Flagged: ${result.identifiers.join(", ")}`} />}
                <label className="flex flex-col gap-1.5 text-micro font-medium">
                  Feedback to the learner
                  <textarea name="note" rows={5} required minLength={10} defaultValue={a.instructorNote ?? ""} className={TEXTAREA} />
                </label>
                <button className={`${BTN} w-fit`}>Save review</button>
              </ActionForm>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
