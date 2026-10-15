import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, dateInput, Field, FIELD, Panel, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { deleteLevelAction, duplicateLevelAction, rollbackRevisionAction, setLevelStatusAction, updateLevelAction } from "@/lib/actions/cms";
import { STATUS_LABEL } from "@/lib/services/cms/core";

export const metadata = { title: "Learning level" };

/** Level editor: every field in the blueprint's §4.2 level data list, status, and history. */
export default async function LevelPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("content.view");
  const { id } = await params;
  const level = await prisma.learningLevel.findUnique({
    where: { id },
    include: { courses: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true } }, _count: { select: { badges: true } } },
  });
  if (!level) notFound();
  const revisions = await prisma.contentRevision.findMany({ where: { entityType: "Level", entityId: id }, orderBy: { version: "desc" }, take: 20 });
  const canEdit = can(actor, "content.structure") && level.status !== "ARCHIVED";

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href="/admin/content" className="text-micro text-muted-foreground hover:text-foreground">
        ← Levels and courses
      </Link>
      <PageHead kicker={`Level ${level.sequence}`} title={level.displayTitle} lede={<StatusPill status={level.status} label={STATUS_LABEL[level.status]} />} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Level details">
          <ActionForm action={updateLevelAction} className="grid gap-4 sm:grid-cols-2" success="Saved.">
            <input type="hidden" name="id" value={level.id} />
            <fieldset disabled={!canEdit} className="contents">
              <Field label="Level name" htmlFor="name">
                <input id="name" name="name" defaultValue={level.name} required className={FIELD} />
              </Field>
              <Field label="Display title" htmlFor="displayTitle">
                <input id="displayTitle" name="displayTitle" defaultValue={level.displayTitle} required className={FIELD} />
              </Field>
              <Field label="Short description" htmlFor="shortDescription" className="sm:col-span-2">
                <textarea id="shortDescription" name="shortDescription" rows={2} defaultValue={level.shortDescription} required className={TEXTAREA} />
              </Field>
              <Field label="Detailed description" htmlFor="description" className="sm:col-span-2">
                <textarea id="description" name="description" rows={4} defaultValue={level.description ?? ""} className={TEXTAREA} />
              </Field>
              <Field label="Intended audience" htmlFor="audience" className="sm:col-span-2">
                <input id="audience" name="audience" defaultValue={level.audience ?? ""} className={FIELD} />
              </Field>
              <Field label="Entry prerequisites" htmlFor="prerequisites" hint="One per line.">
                <textarea id="prerequisites" name="prerequisites" rows={3} defaultValue={level.prerequisites.join("\n")} className={TEXTAREA} />
              </Field>
              <Field label="Learning outcomes" htmlFor="outcomes" hint="One per line.">
                <textarea id="outcomes" name="outcomes" rows={3} defaultValue={level.outcomes.join("\n")} className={TEXTAREA} />
              </Field>
              <Field label="Core topics" htmlFor="coreTopics" hint="One per line." className="sm:col-span-2">
                <textarea id="coreTopics" name="coreTopics" rows={4} defaultValue={level.coreTopics.join("\n")} className={TEXTAREA} />
              </Field>
              <Field label="Estimated effort" htmlFor="estimatedEffort">
                <input id="estimatedEffort" name="estimatedEffort" defaultValue={level.estimatedEffort ?? ""} className={FIELD} />
              </Field>
              <Field label="Badge awarded on completion" htmlFor="badgeName">
                <input id="badgeName" name="badgeName" defaultValue={level.badgeName ?? ""} className={FIELD} placeholder="Foundation badge" />
              </Field>
              <Field label="Assessment requirement" htmlFor="assessmentRequirement">
                <input id="assessmentRequirement" name="assessmentRequirement" defaultValue={level.assessmentRequirement ?? ""} className={FIELD} />
              </Field>
              <Field label="Passing criteria" htmlFor="passingCriteria">
                <input id="passingCriteria" name="passingCriteria" defaultValue={level.passingCriteria ?? ""} className={FIELD} />
              </Field>
              <Field label="Completion requirement" htmlFor="completionRequirement" className="sm:col-span-2">
                <input id="completionRequirement" name="completionRequirement" defaultValue={level.completionRequirement ?? ""} className={FIELD} />
              </Field>
              <Field label="Accent" htmlFor="accent">
                <select id="accent" name="accent" defaultValue={level.accent} className={FIELD}>
                  <option value="teal">Teal (foundation)</option>
                  <option value="blue">Blue (execution)</option>
                  <option value="navy">Navy and gold (governance)</option>
                </select>
              </Field>
              <div />
              <Field label="Effective date" htmlFor="effectiveDate">
                <input id="effectiveDate" name="effectiveDate" type="date" defaultValue={dateInput(level.effectiveDate)} className={FIELD} />
              </Field>
              <Field label="Review date" htmlFor="reviewDate">
                <input id="reviewDate" name="reviewDate" type="date" defaultValue={dateInput(level.reviewDate)} className={FIELD} />
              </Field>
              <Field label="Applicable disclaimer" htmlFor="disclaimer" className="sm:col-span-2">
                <textarea id="disclaimer" name="disclaimer" rows={2} defaultValue={level.disclaimer ?? ""} className={TEXTAREA} />
              </Field>
              <Field label="Reason for change" htmlFor="reason" className="sm:col-span-2">
                <input id="reason" name="reason" className={FIELD} />
              </Field>
            </fieldset>
            {canEdit && <button className={`${BTN} w-fit`}>Save level</button>}
          </ActionForm>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Status">
            <div className="flex flex-wrap gap-2">
              {can(actor, "content.publish") && level.status !== "PUBLISHED" && level.status !== "ARCHIVED" && (
                <ActionButton action={setLevelStatusAction} fields={{ id, status: "PUBLISHED" }}>
                  Show in catalogue
                </ActionButton>
              )}
              {can(actor, "content.publish") && level.status === "PUBLISHED" && (
                <ActionButton action={setLevelStatusAction} fields={{ id, status: "DRAFT" }}>
                  Hide from catalogue
                </ActionButton>
              )}
              {can(actor, "content.archive") && level.status !== "ARCHIVED" && (
                <ActionButton action={setLevelStatusAction} fields={{ id, status: "ARCHIVED" }} confirm="Archive this level?">
                  Archive
                </ActionButton>
              )}
              {can(actor, "content.archive") && level.status === "ARCHIVED" && (
                <ActionButton action={setLevelStatusAction} fields={{ id, status: "DRAFT" }}>
                  Restore
                </ActionButton>
              )}
              {can(actor, "content.structure") && (
                <ActionButton action={duplicateLevelAction} fields={{ id }} success="A draft copy was created.">
                  Duplicate
                </ActionButton>
              )}
              {can(actor, "content.delete") && level.status !== "PUBLISHED" && level.courses.length === 0 && level._count.badges === 0 && (
                <ActionButton action={deleteLevelAction} fields={{ id }} variant="danger" confirm="Delete this unpublished level?">
                  Delete
                </ActionButton>
              )}
            </div>
          </Panel>
          <Panel title={`Courses in this level (${level.courses.length})`}>
            <ul className="divide-y divide-border">
              {level.courses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/content/courses/${c.id}`} className="text-[13.5px] hover:underline">
                    {c.name}
                  </Link>
                  <StatusPill status={c.status} label={STATUS_LABEL[c.status]} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground">Assign courses to this level from each course’s details. Preview the level as learners see it on the public catalogue.</p>
            <Link href={`/catalog?level=${level.slug}`} className="mt-1 inline-block text-[13px] underline underline-offset-4">
              Open in the catalogue
            </Link>
          </Panel>
          <Panel title="Version history">
            <ul className="divide-y divide-border">
              {revisions.map((r, i) => (
                <li key={r.id} className="py-2 text-[12.5px]">
                  v{r.version} · {r.reason ?? "Edited"} · {when(r.createdAt, true)}
                  <span className="block text-muted-foreground">{Object.keys(r.changes as object).join(", ")}</span>
                  {canEdit && i > 0 && (
                    <ActionForm action={rollbackRevisionAction} className="mt-1 flex gap-1.5">
                      <input type="hidden" name="revisionId" value={r.id} />
                      <input name="reason" required placeholder="Reason" aria-label="Reason for restoring" className="min-h-8 w-40 rounded-[3px] border border-input bg-card px-2 text-[12px]" />
                      <button className="min-h-8 rounded-[3px] border border-input px-2 text-[12px] hover:bg-secondary">Restore</button>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
