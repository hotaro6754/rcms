import Link from "next/link";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, FIELD, Panel, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { competencyWorkflowAction, createCompetencyAction, updateCompetencyAction } from "@/lib/actions/sims";
import { PROFICIENCY } from "@/lib/services/sims/competencies";
import { CRITERIA, CRITERION_LABEL } from "@/lib/sim/labels";
import { strings } from "@/lib/json-list";

export const metadata = { title: "Competencies" };

type Row = Awaited<ReturnType<typeof load>>[number];
const load = () => prisma.competency.findMany({ orderBy: [{ status: "asc" }, { code: "asc" }], include: { _count: { select: { outcomes: { where: { demonstrated: true, supersededAt: null } } } } } });

function CompetencyFields({ c, disabled }: { c?: Row; disabled?: boolean }) {
  const p = c?.id ?? "new";
  return (
    <fieldset disabled={disabled} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_14rem]">
        <label className="flex flex-col gap-1.5 text-micro font-medium">
          Code
          <input name="code" defaultValue={c?.code} required className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-micro font-medium">
          Name
          <input name="name" defaultValue={c?.name} required className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-micro font-medium">
          Proficiency level
          <select name="proficiencyLevel" defaultValue={c?.proficiencyLevel ?? 2} className={FIELD}>
            {PROFICIENCY.map((n, i) => (
              <option key={n} value={i + 1}>
                {i + 1}. {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-micro font-medium">
        Description
        <textarea name="description" rows={2} defaultValue={c?.description} required className={TEXTAREA} />
      </label>
      <label className="flex flex-col gap-1.5 text-micro font-medium">
        Expected behaviour
        <textarea name="expectedBehavior" rows={2} defaultValue={c?.expectedBehavior} required className={TEXTAREA} />
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-micro font-medium">Evidence: rubric criteria</legend>
        <div className="grid gap-1.5 sm:grid-cols-3">
          {CRITERIA.map((k) => (
            <label key={k} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="criteria" value={k} defaultChecked={strings(c?.criteria).includes(k)} id={`${p}-${k}`} className="h-4 w-4 accent-[var(--primary)]" />
              {CRITERION_LABEL[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-micro font-medium">
          Threshold on each criterion (0–100)
          <input name="threshold" type="number" min={0} max={100} defaultValue={c?.threshold ?? 75} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-micro font-medium">
          Reassess after (months, blank for never)
          <input name="reassessMonths" type="number" min={1} max={60} defaultValue={c?.reassessMonths ?? ""} className={FIELD} />
        </label>
      </div>
    </fieldset>
  );
}

/**
 * The competency framework. Proficiency comes only from scored case attempts: a learner
 * demonstrates a competency by passing a case, with no critical error, at the threshold on every
 * criterion the competency names.
 */
export default async function CompetenciesAdmin() {
  const actor = await requirePagePermission(["content.view", "assessment.manage"]);
  const rows = await load();
  const people = await prisma.user.findMany({ where: { id: { in: rows.flatMap((r) => [r.authorId, r.reviewerId]).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const name = (uid: string | null) => (uid === "seed" ? "Seed data" : (people.find((p) => p.id === uid)?.name ?? "—"));
  const manage = can(actor, "assessment.manage");
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <Link href="/admin/cases" className="text-micro text-muted-foreground hover:text-foreground">
        ← Cases
      </Link>
      <PageHead
        kicker="Learning"
        title="Competency framework"
        lede="Each competency names an expected behaviour at a proficiency level and the rubric criteria that evidence it. Not everyone needs every level. A reviewer other than the author activates it; editing sends it back to draft."
      />
      {manage && (
        <Panel title="New competency" className="mt-8">
          <ActionForm action={createCompetencyAction} resetOnSuccess success="Created as a draft.">
            <CompetencyFields />
            <button className={`${BTN} mt-3 w-fit`}>Create</button>
          </ActionForm>
        </Panel>
      )}
      <div className="mt-8 flex flex-col gap-4">
        {rows.length === 0 && <Empty title="No competencies yet" />}
        {rows.map((c) => (
          <details key={c.id} className="rounded-[var(--radius)] border border-border bg-card">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4">
              <span className="text-data text-[13px]">{c.code}</span>
              <span className="text-[14.5px] font-medium">{c.name}</span>
              <StatusPill status={c.status} />
              <span className="text-micro text-muted-foreground">
                Level {c.proficiencyLevel} {PROFICIENCY[c.proficiencyLevel - 1]} · {strings(c.criteria).map((k) => CRITERION_LABEL[k as keyof typeof CRITERION_LABEL] ?? k).join(", ")} ≥ {c.threshold} · {c._count.outcomes} learners demonstrated
              </span>
            </summary>
            <div className="border-t border-border px-5 py-4">
              <p className="mb-3 text-micro text-muted-foreground">
                Author {name(c.authorId)} · {c.reviewedAt ? `reviewed by ${name(c.reviewerId)} on ${when(c.reviewedAt)}` : "not reviewed"}
                {c.reassessMonths ? ` · reassess every ${c.reassessMonths} months` : ""}
              </p>
              <ActionForm action={updateCompetencyAction} success="Saved; it is a draft again until reviewed.">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="lockVersion" value={c.lockVersion} />
                <CompetencyFields c={c} disabled={!manage || c.status === "RETIRED"} />
                {manage && c.status !== "RETIRED" && <button className={`${BTN} mt-3 w-fit`}>Save</button>}
              </ActionForm>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {c.status === "DRAFT" && can(actor, "content.review.academic") && c.authorId !== actor.id && (
                  <ActionButton action={competencyWorkflowAction} fields={{ id: c.id, op: "activate" }} variant="default">
                    Review and activate
                  </ActionButton>
                )}
                {manage && c.status !== "RETIRED" && (
                  <ActionButton action={competencyWorkflowAction} fields={{ id: c.id, op: "retire" }} variant="danger" confirm="Retire this competency? It stops appearing in learners' standings.">
                    Retire
                  </ActionButton>
                )}
                {manage && c.status === "RETIRED" && (
                  <ActionButton action={competencyWorkflowAction} fields={{ id: c.id, op: "restore" }}>
                    Restore to draft
                  </ActionButton>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
