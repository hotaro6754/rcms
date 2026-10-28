import Link from "next/link";
import type { ContentStatus, Prisma } from "@prisma/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, StatusPill, TEXTAREA } from "@/components/admin/kit";
import { createCourseAction, createLevelAction, duplicateCourseAction, importCourseAction, moveLevelAction, reorderCoursesAction, setLevelStatusAction } from "@/lib/actions/cms";
import { STATUS_LABEL } from "@/lib/services/cms/core";

export const metadata = { title: "Levels and courses" };

const STATUSES = Object.keys(STATUS_LABEL) as ContentStatus[];

function swap(ids: string[], i: number, j: number) {
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return JSON.stringify(out);
}

/**
 * Learning management home: the academy's levels in order, the courses inside each, their
 * workflow status, and the entry point to every course workspace.
 */
export default async function ContentHome({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; owner?: string }> }) {
  const actor = await requirePagePermission("content.view");
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = STATUSES.includes(sp.status as ContentStatus) ? (sp.status as ContentStatus) : undefined;

  const where: Prisma.ProgramWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.owner === "me" ? { ownerId: actor.id } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { modules: { some: { OR: [{ title: { contains: q } }, { lessons: { some: { title: { contains: q } } } }] } } },
          ],
        }
      : {}),
  };

  const [levels, courses] = await Promise.all([
    prisma.learningLevel.findMany({ orderBy: { sequence: "asc" } }),
    prisma.program.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        levelId: true,
        status: true,
        state: true,
        updatedAt: true,
        scheduledFor: true,
        complianceSensitive: true,
        isTemplate: true,
        publishedVersion: { select: { version: true } },
        _count: { select: { modules: true, enrolments: true } },
      },
    }),
  ]);

  const canStructure = can(actor, "content.structure");
  const canCreate = can(actor, "content.create");
  const canPublish = can(actor, "content.publish");
  const filtered = !!(q || status || sp.owner);
  const unassigned = courses.filter((c) => !c.levelId || !levels.some((l) => l.id === c.levelId));
  const levelIds = levels.map((l) => l.id);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead
        kicker="Learning management"
        title="Levels and courses"
        lede="Academy → level → course → module → lesson → blocks, resources and assessments. Learners only ever see a course's released version; everything here is the working draft until it is reviewed and published."
      />

      <form className="mt-8 flex flex-wrap items-end gap-3" role="search">
        <Field label="Search titles and lessons" htmlFor="q" className="min-w-[16rem] flex-1">
          <input id="q" name="q" defaultValue={q} className={FIELD} placeholder="e.g. denial, eligibility" />
        </Field>
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={status ?? ""} className={FIELD}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner" htmlFor="owner">
          <select id="owner" name="owner" defaultValue={sp.owner ?? ""} className={FIELD}>
            <option value="">Anyone</option>
            <option value="me">Me</option>
          </select>
        </Field>
        <button className={BTN}>Filter</button>
        {filtered && (
          <Link href="/admin/content" className="min-h-10 py-2.5 text-[13px] underline underline-offset-4">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-10 flex flex-col gap-10">
        {levels.length === 0 && (
          <Empty title="No learning levels yet">Create the first level below. The blueprint’s three are Trainee (Foundation), Professional (Execution) and Leadership (Governance).</Empty>
        )}
        {levels.map((level, i) => {
          const inLevel = courses.filter((c) => c.levelId === level.id);
          const ids = inLevel.map((c) => c.id);
          return (
            <section key={level.id} aria-labelledby={`lvl-${level.id}`} className="rounded-[var(--radius)] border border-border bg-card">
              <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
                <span className="text-data text-micro text-subtle">LEVEL {level.sequence}</span>
                <h2 id={`lvl-${level.id}`} className="text-[1.15rem] leading-snug">
                  <Link href={`/admin/content/levels/${level.id}`} className="hover:underline hover:underline-offset-4">
                    {level.displayTitle}
                  </Link>
                </h2>
                <StatusPill status={level.status} />
                <span className="text-micro text-muted-foreground">{inLevel.length} courses</span>
                <div className="ml-auto flex items-center gap-1">
                  {canStructure && !filtered && (
                    <>
                      {i > 0 ? <ActionButton action={moveLevelAction} fields={{ order: swap(levelIds, i, i - 1) }} size="icon" variant="ghost" title={`Move ${level.name} up`}>
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </ActionButton> : <span className="w-8" />}
                      {i < levelIds.length - 1 ? <ActionButton action={moveLevelAction} fields={{ order: swap(levelIds, i, i + 1) }} size="icon" variant="ghost" title={`Move ${level.name} down`}>
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </ActionButton> : <span className="w-8" />}
                    </>
                  )}
                  {canPublish && level.status !== "PUBLISHED" && level.status !== "ARCHIVED" && (
                    <ActionButton action={setLevelStatusAction} fields={{ id: level.id, status: "PUBLISHED" }}>
                      Show in catalogue
                    </ActionButton>
                  )}
                  <Link href={`/admin/content/levels/${level.id}`} className="min-h-8 rounded-[3px] border border-input bg-card px-3 py-1.5 text-[13px] hover:bg-secondary">
                    Edit level
                  </Link>
                </div>
              </header>
              {inLevel.length === 0 ? (
                <p className="px-5 py-4 text-micro text-muted-foreground">{filtered ? "No courses in this level match." : "No courses in this level yet."}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {inLevel.map((c, ci) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Link href={`/admin/content/courses/${c.id}`} className="min-w-0 flex-1 text-[14px] font-medium hover:underline hover:underline-offset-4">
                        {c.name}
                      </Link>
                      <StatusPill status={c.status} label={STATUS_LABEL[c.status]} />
                      {c.publishedVersion && <span className="text-data text-micro text-subtle">LIVE v{c.publishedVersion.version}</span>}
                      {c.complianceSensitive && <span className="text-data text-micro text-subtle">COMPLIANCE</span>}
                      <span className="text-data text-micro text-muted-foreground">
                        {c._count.modules} modules · {c._count.enrolments} enrolled
                      </span>
                      {canStructure && !filtered && (
                        <span className="flex items-center gap-1">
                          {ci > 0 ? <ActionButton action={reorderCoursesAction} fields={{ levelId: level.id, order: swap(ids, ci, ci - 1) }} size="icon" variant="ghost" title={`Move ${c.name} up`}>
                            <ChevronUp className="h-4 w-4" aria-hidden />
                          </ActionButton> : <span className="w-8" />}
                          {ci < ids.length - 1 ? <ActionButton action={reorderCoursesAction} fields={{ levelId: level.id, order: swap(ids, ci, ci + 1) }} size="icon" variant="ghost" title={`Move ${c.name} down`}>
                            <ChevronDown className="h-4 w-4" aria-hidden />
                          </ActionButton> : <span className="w-8" />}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canCreate && level.status !== "ARCHIVED" && (
                <div className="border-t border-border px-5 py-3">
                  <ActionForm action={createCourseAction} className="flex flex-wrap items-end gap-2" resetOnSuccess>
                    <input type="hidden" name="levelId" value={level.id} />
                    <Field label="New course in this level" htmlFor={`new-${level.id}`} className="min-w-[18rem] flex-1">
                      <input id={`new-${level.id}`} name="name" required minLength={3} className={FIELD} placeholder="Course title" />
                    </Field>
                    <button className={BTN}>Create course</button>
                  </ActionForm>
                </div>
              )}
            </section>
          );
        })}

        {unassigned.length > 0 && (
          <section className="rounded-[var(--radius)] border border-dashed border-input bg-card">
            <header className="border-b border-border px-5 py-3">
              <h2 className="text-[14px] font-semibold">Not assigned to a level</h2>
            </header>
            <ul className="divide-y divide-border">
              {unassigned.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <Link href={`/admin/content/courses/${c.id}`} className="flex-1 text-[14px] hover:underline">
                    {c.name}
                  </Link>
                  <StatusPill status={c.status} label={STATUS_LABEL[c.status]} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {canStructure && (
          <details className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
            <summary className="cursor-pointer text-[14px] font-semibold">Add a learning level</summary>
            <ActionForm action={createLevelAction} className="mt-4 grid gap-4 sm:grid-cols-2" resetOnSuccess success="Level created.">
              <Field label="Name" htmlFor="lv-name">
                <input id="lv-name" name="name" required className={FIELD} placeholder="Trainee" />
              </Field>
              <Field label="Display title" htmlFor="lv-title">
                <input id="lv-title" name="displayTitle" required className={FIELD} placeholder="Trainee — Foundation" />
              </Field>
              <Field label="Short description" htmlFor="lv-short" className="sm:col-span-2">
                <textarea id="lv-short" name="shortDescription" required rows={2} className={TEXTAREA} />
              </Field>
              <Field label="Accent" htmlFor="lv-accent">
                <select id="lv-accent" name="accent" className={FIELD}>
                  <option value="teal">Teal (foundation)</option>
                  <option value="blue">Blue (execution)</option>
                  <option value="navy">Navy and gold (governance)</option>
                </select>
              </Field>
              <div className="flex items-end">
                <button className={BTN}>Create level</button>
              </div>
            </ActionForm>
          </details>
        )}

        {canCreate && courses.some((c) => c.isTemplate) && (
          <section className="rounded-[var(--radius)] border border-border bg-card px-5 py-4" aria-labelledby="templates">
            <h2 id="templates" className="text-[14px] font-semibold">
              Start from a template
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">A copy of the template becomes a new draft course with its modules, lessons, blocks and assessments.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {courses
                .filter((c) => c.isTemplate)
                .map((t) => (
                  <li key={t.id}>
                    <ActionButton action={duplicateCourseAction} fields={{ id: t.id, open: "1" }}>
                      New course from “{t.name}”
                    </ActionButton>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {can(actor, "content.import") && can(actor, "content.create") && (
          <details className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
            <summary className="cursor-pointer text-[14px] font-semibold">Import a course</summary>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Upload a course export (.json) from this or another RCMExcel installation. It becomes a new draft and goes through review like any other course. Files and media are not included; re-attach them after import.
            </p>
            <ActionForm action={importCourseAction} className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Into level" htmlFor="imp-level">
                <select id="imp-level" name="levelId" required className={FIELD}>
                  {levels
                    .filter((l) => l.status !== "ARCHIVED")
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </Field>
              <input name="file" type="file" accept="application/json,.json" required aria-label="Course export file" className="text-[13px]" />
              <button className={BTN}>Import as draft</button>
            </ActionForm>
          </details>
        )}
      </div>
    </div>
  );
}
