import Link from "next/link";
import type { ContentStatus } from "@prisma/client";
import type { Actor } from "@/lib/actor";
import { can } from "@/lib/actor";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Checkbox, dateInput, Field, FIELD, Pill, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import {
  archiveAssessmentAction,
  createAssessmentAction,
  deleteLessonAction,
  deleteModuleAction,
  duplicateCourseAction,
  duplicateLessonAction,
  duplicateModuleAction,
  moveLessonAction,
  moveModuleToCourseAction,
  requestCourseDeletionAction,
  setLessonStateAction,
  setModuleStateAction,
  updateAssessmentAction,
  updateCourseAction,
  updateLessonAction,
  updateModuleAction,
  workflowAction,
} from "@/lib/actions/cms";
import { STATUS_LABEL } from "@/lib/services/cms/core";

const STEPS: ContentStatus[] = ["DRAFT", "IN_DEVELOPMENT", "ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"];

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export function WorkflowPanel({
  actor,
  course,
  problems,
  reviews,
  impact,
  versions,
}: {
  actor: Actor;
  course: { id: string; status: ContentStatus; state: string; complianceSensitive: boolean; scheduledFor: Date | null; publishedVersionId: string | null };
  problems: string[];
  reviews: { id: string; stage: string; decision: string; comment: string | null; createdAt: Date; reviewer: string }[];
  impact: { enrolled: number; certificates: number; learnersWithProgress: number };
  versions: number;
}) {
  const s = course.status;
  const editable = s === "DRAFT" || s === "IN_DEVELOPMENT" || s === "UNDER_REVISION";
  const stepIndex = STEPS.indexOf(s === "UNDER_REVISION" ? "IN_DEVELOPMENT" : s);
  return (
    <section className="rounded-[var(--radius)] border border-border bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <h2 className="text-[14px] font-semibold">Review and release</h2>
        <StatusPill status={s} label={STATUS_LABEL[s]} />
        {course.complianceSensitive ? <Pill tone="ink">Compliance review required</Pill> : <Pill>Academic review only</Pill>}
      </header>
      <div className="flex flex-col gap-4 px-5 py-4">
        <ol aria-label="Workflow" className="flex flex-wrap gap-1.5">
          {STEPS.filter((x) => course.complianceSensitive || x !== "COMPLIANCE_REVIEW").map((x) => {
            const i = STEPS.indexOf(x);
            return (
              <li key={x} className={`text-data rounded-[2px] px-2 py-1 text-[10.5px] tracking-[0.06em] ${i === stepIndex ? "bg-foreground text-background" : i < stepIndex ? "bg-success-bg text-success" : "bg-secondary text-subtle"}`} aria-current={i === stepIndex ? "step" : undefined}>
                {STATUS_LABEL[x].toUpperCase()}
              </li>
            );
          })}
        </ol>
        {s === "UNDER_REVISION" && <p className="text-micro text-muted-foreground">Learners are reading the released version while this draft is revised.</p>}
        {s === "SCHEDULED" && course.scheduledFor && <p className="text-[13.5px]">Scheduled to go live {when(course.scheduledFor, true)} IST.</p>}

        {editable && problems.length > 0 && (
          <div className="rounded-[3px] border border-warning/40 bg-warning-bg px-3 py-2.5">
            <p className="text-micro font-semibold text-warning">Before this can be submitted</p>
            <ul className="mt-1 list-disc pl-5 text-micro text-warning">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {editable && can(actor, "content.submit") && (
            <ActionForm action={workflowAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={course.id} />
              <input type="hidden" name="op" value="submit" />
              <Field label="What changed (shown to reviewers and kept in the release notes)" htmlFor="submit-note" className="min-w-[16rem] flex-1">
                <input id="submit-note" name="comment" className={FIELD} />
              </Field>
              <button className={BTN} disabled={problems.length > 0}>
                Submit for review
              </button>
            </ActionForm>
          )}

          {(s === "ACADEMIC_REVIEW" || s === "COMPLIANCE_REVIEW") && can(actor, s === "ACADEMIC_REVIEW" ? "content.review.academic" : "content.review.compliance") && (
            <ActionForm action={workflowAction} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={course.id} />
              <Field label={s === "ACADEMIC_REVIEW" ? "Academic review comment" : "Compliance review comment"} htmlFor="review-comment" hint="Required when requesting changes. Preview the course before deciding.">
                <textarea id="review-comment" name="comment" rows={2} className={TEXTAREA} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <button name="op" value={s === "ACADEMIC_REVIEW" ? "academic-approve" : "compliance-approve"} className={BTN}>
                  Approve
                </button>
                <button name="op" value={s === "ACADEMIC_REVIEW" ? "academic-reject" : "compliance-reject"} className={BTN_OUTLINE}>
                  Request changes
                </button>
                <Link href={`/admin/content/courses/${course.id}/preview`} className={BTN_OUTLINE}>
                  Preview as learner
                </Link>
              </div>
            </ActionForm>
          )}

          {(s === "APPROVED" || s === "SCHEDULED") && can(actor, "content.publish") && (
            <ActionForm action={workflowAction} className="flex flex-wrap items-end gap-2" confirm="Publish this version to learners?">
              <input type="hidden" name="id" value={course.id} />
              <input type="hidden" name="op" value="publish" />
              <Field label="Schedule for (leave empty to publish now)" htmlFor="schedule">
                <input id="schedule" name="scheduleFor" type="datetime-local" className={FIELD} />
              </Field>
              <button className={BTN}>Publish</button>
            </ActionForm>
          )}

          {["ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED"].includes(s) && (can(actor, "content.submit") || can(actor, "content.publish")) && (
            <ActionButton action={workflowAction} fields={{ id: course.id, op: "withdraw" }} confirm="Withdraw from review so it can be edited? Approvals given so far will need to be repeated.">
              Withdraw from review to edit
            </ActionButton>
          )}

          {course.state === "PUBLISHED" && can(actor, "content.publish") && (
            <details className="rounded-[3px] border border-border px-3 py-2">
              <summary className="cursor-pointer text-[13px]">Take offline (unpublish)</summary>
              <ActionForm action={workflowAction} className="mt-2 flex flex-wrap items-end gap-2" confirm="Remove this course from the catalogue and from learners' access?">
                <input type="hidden" name="id" value={course.id} />
                <input type="hidden" name="op" value="unpublish" />
                <Field label="Reason" htmlFor="unpub" className="min-w-[16rem] flex-1">
                  <input id="unpub" name="comment" required className={FIELD} />
                </Field>
                <button className={BTN_OUTLINE}>Unpublish</button>
              </ActionForm>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {impact.enrolled} enrolled learners would lose access. Their progress, attempts and {impact.certificates} certificates are kept.
              </p>
            </details>
          )}

          {s === "ARCHIVED"
            ? can(actor, "content.archive") && (
                <ActionButton action={workflowAction} fields={{ id: course.id, op: "restore" }}>
                  Restore course
                </ActionButton>
              )
            : can(actor, "content.archive") && (
                <details className="rounded-[3px] border border-border px-3 py-2">
                  <summary className="cursor-pointer text-[13px]">Archive course</summary>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Archiving removes the course from the catalogue and makes it read-only. Nothing is deleted. {impact.enrolled} enrolled, {impact.learnersWithProgress} with progress, {impact.certificates} certificates issued.
                  </p>
                  <ActionForm action={workflowAction} className="mt-2 flex flex-wrap items-end gap-2" confirm="Archive this course?">
                    <input type="hidden" name="id" value={course.id} />
                    <input type="hidden" name="op" value="archive" />
                    <Field label="Reason" htmlFor="arch" className="min-w-[16rem] flex-1">
                      <input id="arch" name="comment" required className={FIELD} />
                    </Field>
                    <button className={BTN_OUTLINE}>Archive</button>
                  </ActionForm>
                </details>
              )}

          {versions === 0 && impact.enrolled === 0 && can(actor, "content.delete") && (
            <details className="rounded-[3px] border border-danger/30 px-3 py-2">
              <summary className="cursor-pointer text-[13px] text-danger">Request permanent deletion</summary>
              <p className="mt-2 text-[12px] text-muted-foreground">Only never-released drafts with no learners can be deleted, and a Super Administrator must approve it.</p>
              <ActionForm action={requestCourseDeletionAction} className="mt-2 flex flex-wrap items-end gap-2" success="Deletion requested. A Super Administrator will decide.">
                <input type="hidden" name="id" value={course.id} />
                <Field label="Reason" htmlFor="del" className="min-w-[16rem] flex-1">
                  <input id="del" name="reason" required minLength={5} className={FIELD} />
                </Field>
                <button className={BTN_OUTLINE}>Request deletion</button>
              </ActionForm>
            </details>
          )}
        </div>

        {reviews.length > 0 && (
          <div>
            <p className="text-data text-[10.5px] tracking-[0.12em] text-subtle">DECISIONS</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {reviews.map((r) => (
                <li key={r.id} className="text-[12.5px] leading-snug">
                  <span className="text-data text-[10.5px] text-subtle">{when(r.createdAt, true)}</span> · {r.stage.toLowerCase()} {r.decision} by {r.reviewer}
                  {r.comment && <span className="block text-muted-foreground">“{r.comment}”</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Course details
// ---------------------------------------------------------------------------

export function CourseForm({
  course,
  otherCourses = [],
  levels,
  reviewers,
  thumbnails,
  canEdit,
}: {
  course: {
    id: string;
    name: string;
    levelId: string | null;
    description: string | null;
    who: string;
    artefact: string;
    weeks: string;
    tier: string;
    flag: string | null;
    outcomes: string[];
    prerequisites: string[];
    durationMinutes: number | null;
    difficulty: string | null;
    isFree: boolean;
    includedInSubscription: boolean;
    complianceSensitive: boolean;
    disclaimer: string | null;
    academicReviewerId: string | null;
    complianceReviewerId: string | null;
    effectiveDate: Date | null;
    reviewDate: Date | null;
    thumbnailId: string | null;
    expiresAt: Date | null;
    isTemplate: boolean;
    requiresCourseId: string | null;
    lockVersion: number;
  };
  otherCourses?: { id: string; name: string }[];
  levels: { id: string; displayTitle: string }[];
  reviewers: { academic: { id: string; name: string }[]; compliance: { id: string; name: string }[] };
  thumbnails: { id: string; title: string }[];
  canEdit: boolean;
}) {
  return (
    <ActionForm action={updateCourseAction} className="flex flex-col gap-4" success="Saved.">
      <input type="hidden" name="id" value={course.id} />
      <input type="hidden" name="lockVersion" value={course.lockVersion} />
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="c-name" className="sm:col-span-2">
          <input id="c-name" name="name" defaultValue={course.name} required className={FIELD} />
        </Field>
        <Field label="Learning level" htmlFor="c-level">
          <select id="c-level" name="levelId" defaultValue={course.levelId ?? ""} required className={FIELD}>
            <option value="">Choose…</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.displayTitle}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty" htmlFor="c-diff">
          <select id="c-diff" name="difficulty" defaultValue={course.difficulty ?? ""} className={FIELD}>
            <option value="">Not set</option>
            <option>Introductory</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </Field>
        <Field label="Description" htmlFor="c-desc" className="sm:col-span-2" hint="Shown on the catalogue page.">
          <textarea id="c-desc" name="description" rows={4} defaultValue={course.description ?? ""} className={TEXTAREA} />
        </Field>
        <Field label="Who it is for" htmlFor="c-who">
          <input id="c-who" name="who" defaultValue={course.who} className={FIELD} />
        </Field>
        <Field label="What the learner finishes with" htmlFor="c-art">
          <input id="c-art" name="artefact" defaultValue={course.artefact} className={FIELD} />
        </Field>
        <Field label="Learning outcomes" htmlFor="c-out" hint="One per line.">
          <textarea id="c-out" name="outcomes" rows={5} defaultValue={course.outcomes.join("\n")} className={TEXTAREA} />
        </Field>
        <Field label="Prerequisites" htmlFor="c-pre" hint="One per line.">
          <textarea id="c-pre" name="prerequisites" rows={5} defaultValue={course.prerequisites.join("\n")} className={TEXTAREA} />
        </Field>
        <Field label="Estimated effort (minutes)" htmlFor="c-min" hint="Leave empty to total the lessons.">
          <input id="c-min" name="durationMinutes" type="number" min={0} defaultValue={course.durationMinutes ?? ""} className={FIELD} />
        </Field>
        <Field label="Schedule label" htmlFor="c-weeks">
          <input id="c-weeks" name="weeks" defaultValue={course.weeks} className={FIELD} placeholder="6 weeks" />
        </Field>
        <Field label="Tier label" htmlFor="c-tier">
          <input id="c-tier" name="tier" defaultValue={course.tier} className={FIELD} />
        </Field>
        <Field label="Highlight flag" htmlFor="c-flag">
          <input id="c-flag" name="flag" defaultValue={course.flag ?? ""} className={FIELD} placeholder="Most requested" />
        </Field>
        <Field label="Effective date" htmlFor="c-eff" hint="When the guidance this course reflects took effect.">
          <input id="c-eff" name="effectiveDate" type="date" defaultValue={dateInput(course.effectiveDate)} className={FIELD} />
        </Field>
        <Field label="Next review date" htmlFor="c-rev">
          <input id="c-rev" name="reviewDate" type="date" defaultValue={dateInput(course.reviewDate)} className={FIELD} />
        </Field>
        <Field label="Withdraw from learners on" htmlFor="c-exp" hint="Optional. Learners keep their history and certificates.">
          <input id="c-exp" name="expiresAt" type="date" defaultValue={dateInput(course.expiresAt)} className={FIELD} />
        </Field>
        <Field label="Requires a certificate in" htmlFor="c-req" hint="Optional prerequisite course for enrolment and purchase.">
          <select id="c-req" name="requiresCourseId" defaultValue={course.requiresCourseId ?? ""} className={FIELD}>
            <option value="">No prerequisite</option>
            {otherCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Template" htmlFor="c-tpl" hint="Templates are copied to start new courses and are never released.">
          <select id="c-tpl" name="isTemplate" defaultValue={course.isTemplate ? "true" : "false"} className={FIELD}>
            <option value="false">No, a normal course</option>
            <option value="true">Yes, use as a template</option>
          </select>
        </Field>
        <Field label="Assigned academic reviewer" htmlFor="c-ar">
          <select id="c-ar" name="academicReviewerId" defaultValue={course.academicReviewerId ?? ""} className={FIELD}>
            <option value="">Any academic reviewer</option>
            {reviewers.academic.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assigned compliance reviewer" htmlFor="c-cr">
          <select id="c-cr" name="complianceReviewerId" defaultValue={course.complianceReviewerId ?? ""} className={FIELD}>
            <option value="">Any compliance reviewer</option>
            {reviewers.compliance.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Catalogue image" htmlFor="c-thumb" hint="Public images from the media library.">
          <select id="c-thumb" name="thumbnailId" defaultValue={course.thumbnailId ?? ""} className={FIELD}>
            <option value="">None</option>
            {thumbnails.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Course disclaimer (in addition to the academy-wide one)" htmlFor="c-disc" className="sm:col-span-2">
          <textarea id="c-disc" name="disclaimer" rows={2} defaultValue={course.disclaimer ?? ""} className={TEXTAREA} />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Checkbox name="isFree" label="Free course" defaultChecked={course.isFree} hint="Anyone signed in can enrol without paying." />
          <Checkbox name="includedInSubscription" label="Included in subscriptions" defaultChecked={course.includedInSubscription} />
          <Checkbox name="complianceSensitive" label="Compliance-sensitive (requires compliance review)" defaultChecked={course.complianceSensitive} hint="Payer, coding, regulatory, privacy or security content. Leave ticked unless you are sure." />
        </div>
        <Field label="Reason for this change (kept in the version history)" htmlFor="c-reason" className="sm:col-span-2">
          <input id="c-reason" name="reason" className={FIELD} />
        </Field>
      </fieldset>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button className={BTN}>Save course details</button>
        </div>
      )}
    </ActionForm>
  );
}

export function DuplicateCourse({ id }: { id: string }) {
  return (
    <ActionButton action={duplicateCourseAction} fields={{ id }} success="Copy created as a new draft course." confirm="Create an independent draft copy of this course?">
      Duplicate course
    </ActionButton>
  );
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export function ModulePanel({
  actor,
  courseId,
  mod,
  courses,
  siblings = [],
}: {
  actor: Actor;
  courseId: string;
  mod: { id: string; title: string; summary: string | null; objectives: string[]; estimatedMinutes: number | null; prerequisiteModuleId: string | null; state: string; lockVersion: number; lessons: number; resources: number; assessments: number; blocks: number };
  courses: { id: string; name: string }[];
  siblings?: { id: string; title: string }[];
}) {
  const canEdit = can(actor, "content.edit");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[1.3rem] leading-snug">{mod.title}</h2>
        <StatusPill status={mod.state} label={mod.state === "PUBLISHED" ? "ready" : mod.state.toLowerCase()} />
        <span className="text-data text-micro text-muted-foreground">
          {mod.lessons} lessons · {mod.blocks} blocks · {mod.resources} resources · {mod.assessments} assessments
        </span>
      </div>
      <ActionForm action={updateModuleAction} className="grid gap-3" success="Saved.">
        <input type="hidden" name="id" value={mod.id} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lockVersion" value={mod.lockVersion} />
        <fieldset disabled={!canEdit} className="grid gap-3">
          <Field label="Title" htmlFor="m-title">
            <input id="m-title" name="title" defaultValue={mod.title} required className={FIELD} />
          </Field>
          <Field label="Summary" htmlFor="m-sum">
            <textarea id="m-sum" name="summary" rows={3} defaultValue={mod.summary ?? ""} className={TEXTAREA} />
          </Field>
          <Field label="Learning objectives" htmlFor="m-obj" hint="One per line.">
            <textarea id="m-obj" name="objectives" rows={4} defaultValue={mod.objectives.join("\n")} className={TEXTAREA} />
          </Field>
          <Field label="Estimated time (minutes)" htmlFor="m-min">
            <input id="m-min" name="estimatedMinutes" type="number" min={0} defaultValue={mod.estimatedMinutes ?? ""} className={FIELD} />
          </Field>
          <Field label="Prerequisite module" htmlFor="m-pre" hint="Learners must complete it before this module opens.">
            <select id="m-pre" name="prerequisiteModuleId" defaultValue={mod.prerequisiteModuleId ?? ""} className={FIELD}>
              <option value="">None</option>
              {siblings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reason for change" htmlFor="m-reason">
            <input id="m-reason" name="reason" className={FIELD} />
          </Field>
        </fieldset>
        {canEdit && <button className={`${BTN} w-fit`}>Save module</button>}
      </ActionForm>

      {canEdit && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {mod.state !== "PUBLISHED" && mod.state !== "ARCHIVED" && (
            <ActionButton action={setModuleStateAction} fields={{ id: mod.id, state: "PUBLISHED", courseId }}>
              Mark ready for release
            </ActionButton>
          )}
          {mod.state === "PUBLISHED" && (
            <ActionButton action={setModuleStateAction} fields={{ id: mod.id, state: "DRAFT", courseId }}>
              Back to draft
            </ActionButton>
          )}
          {mod.state !== "ARCHIVED" && can(actor, "content.archive") && (
            <ActionButton action={setModuleStateAction} fields={{ id: mod.id, state: "ARCHIVED", courseId }} confirm="Archive this module? It leaves the next release but is kept and can be restored.">
              Archive
            </ActionButton>
          )}
          {mod.state === "ARCHIVED" && can(actor, "content.archive") && (
            <ActionButton action={setModuleStateAction} fields={{ id: mod.id, state: "DRAFT", courseId }}>
              Restore
            </ActionButton>
          )}
          <ActionButton action={duplicateModuleAction} fields={{ id: mod.id, courseId }}>
            Duplicate
          </ActionButton>
          {can(actor, "content.delete") && (
            <ActionButton action={deleteModuleAction} fields={{ id: mod.id, courseId }} variant="danger" confirm="Delete this module and its lessons permanently? This is only allowed when no learner has worked in it.">
              Delete
            </ActionButton>
          )}
        </div>
      )}

      {can(actor, "content.structure") && courses.length > 0 && (
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <ActionForm action={moveModuleToCourseAction} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={mod.id} />
            <input type="hidden" name="courseId" value={courseId} />
            <Field label="Move to another course" htmlFor="m-move">
              <select id="m-move" name="targetCourseId" className={FIELD}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Checkbox name="confirm" label="I understand learner history moves with the lessons" />
            <button className={`${BTN_OUTLINE} w-fit`}>Move module</button>
          </ActionForm>
          <ActionForm action={duplicateModuleAction} className="flex flex-col gap-2" success="Copied.">
            <input type="hidden" name="id" value={mod.id} />
            <Field label="Copy into another course" htmlFor="m-copy">
              <select id="m-copy" name="targetCourseId" className={FIELD}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <button className={`${BTN_OUTLINE} w-fit`}>Copy module</button>
          </ActionForm>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

export function LessonPanel({
  actor,
  courseId,
  lesson,
  modules,
  courseSlug,
  owners = [],
}: {
  actor: Actor;
  courseId: string;
  lesson: { id: string; title: string; objectives: string[]; durationSec: number | null; state: string; freePreview: boolean; completionRule: string; effectiveDate: Date | null; lastReviewedAt: Date | null; nextReviewAt: Date | null; sources: string[]; contentOwnerId: string | null; lockVersion: number; moduleId: string; hasAssessment: boolean };
  modules: { id: string; title: string; course: string; sameCourse: boolean }[];
  courseSlug: string;
  owners?: { id: string; name: string }[];
}) {
  const canEdit = can(actor, "content.edit");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[1.3rem] leading-snug">{lesson.title}</h2>
        <StatusPill status={lesson.state} label={lesson.state === "PUBLISHED" ? "ready" : lesson.state.toLowerCase()} />
        <Link href={`/admin/content/courses/${courseId}/preview?lesson=${lesson.id}`} className="text-[13px] underline underline-offset-4">
          Preview
        </Link>
        <span className="text-data text-micro text-subtle">/academy/{courseSlug}/{lesson.id.slice(0, 8)}…</span>
      </div>
      <ActionForm action={updateLessonAction} className="grid gap-3 sm:grid-cols-2" success="Saved.">
        <input type="hidden" name="id" value={lesson.id} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lockVersion" value={lesson.lockVersion} />
        <fieldset disabled={!canEdit} className="contents">
          <Field label="Title" htmlFor="l-title" className="sm:col-span-2">
            <input id="l-title" name="title" defaultValue={lesson.title} required className={FIELD} />
          </Field>
          <Field label="Learning objectives" htmlFor="l-obj" hint="One per line." className="sm:col-span-2">
            <textarea id="l-obj" name="objectives" rows={3} defaultValue={lesson.objectives.join("\n")} className={TEXTAREA} />
          </Field>
          <Field label="Estimated minutes" htmlFor="l-min">
            <input id="l-min" name="minutes" type="number" min={0} max={600} defaultValue={lesson.durationSec ? Math.round(lesson.durationSec / 60) : ""} className={FIELD} />
          </Field>
          <Field label="Completion rule" htmlFor="l-rule">
            <select id="l-rule" name="completionRule" defaultValue={lesson.completionRule} className={FIELD}>
              <option value="MANUAL">Learner marks it complete</option>
              <option value="ASSESSMENT_PASS" disabled={!lesson.hasAssessment}>
                Completes on passing its assessment
              </option>
            </select>
          </Field>
          <Field label="Effective date" htmlFor="l-eff">
            <input id="l-eff" name="effectiveDate" type="date" defaultValue={dateInput(lesson.effectiveDate)} className={FIELD} />
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox name="freePreview" label="Free preview" defaultChecked={lesson.freePreview} hint="Viewable by signed-in visitors before enrolling." />
          </div>
          <fieldset className="grid gap-3 rounded-[var(--radius)] border border-border px-4 py-3 sm:col-span-2 sm:grid-cols-3">
            <legend className="label-caps px-1">Review and sources</legend>
            <Field label="Content owner" htmlFor="l-own">
              <select id="l-own" name="contentOwnerId" defaultValue={lesson.contentOwnerId ?? ""} className={FIELD}>
                <option value="">Course owner</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Last reviewed" htmlFor="l-lrev">
              <input id="l-lrev" name="lastReviewedAt" type="date" defaultValue={dateInput(lesson.lastReviewedAt)} className={FIELD} />
            </Field>
            <Field label="Next review" htmlFor="l-nrev" hint="A compliance-sensitive course cannot be released past this date.">
              <input id="l-nrev" name="nextReviewAt" type="date" defaultValue={dateInput(lesson.nextReviewAt)} className={FIELD} />
            </Field>
            <Field label="Supporting sources" htmlFor="l-src" hint="One per line: regulation, payer manual section or standard, with its date." className="sm:col-span-3">
              <textarea id="l-src" name="sources" rows={3} defaultValue={lesson.sources.join("\n")} className={TEXTAREA} />
            </Field>
          </fieldset>
          <Field label="Reason for change" htmlFor="l-reason" className="sm:col-span-2">
            <input id="l-reason" name="reason" className={FIELD} />
          </Field>
        </fieldset>
        {canEdit && <button className={`${BTN} w-fit`}>Save lesson details</button>}
      </ActionForm>

      {canEdit && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {lesson.state === "DRAFT" && (
            <ActionButton action={setLessonStateAction} fields={{ id: lesson.id, state: "PUBLISHED", courseId }}>
              Mark ready for release
            </ActionButton>
          )}
          {lesson.state === "PUBLISHED" && (
            <ActionButton action={setLessonStateAction} fields={{ id: lesson.id, state: "DRAFT", courseId }}>
              Back to draft
            </ActionButton>
          )}
          {lesson.state !== "ARCHIVED" && can(actor, "content.archive") && (
            <ActionButton action={setLessonStateAction} fields={{ id: lesson.id, state: "ARCHIVED", courseId }} confirm="Archive this lesson? Learners keep their history; it leaves the next release.">
              Archive
            </ActionButton>
          )}
          {lesson.state === "ARCHIVED" && can(actor, "content.archive") && (
            <ActionButton action={setLessonStateAction} fields={{ id: lesson.id, state: "DRAFT", courseId }}>
              Restore
            </ActionButton>
          )}
          <ActionButton action={duplicateLessonAction} fields={{ id: lesson.id, courseId }}>
            Duplicate
          </ActionButton>
          {can(actor, "content.delete") && (
            <ActionButton action={deleteLessonAction} fields={{ id: lesson.id, courseId }} variant="danger" confirm="Delete this lesson permanently? Only possible when no learner has opened or been assessed on it.">
              Delete
            </ActionButton>
          )}
        </div>
      )}

      {canEdit && (
        <ActionForm action={moveLessonAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <input type="hidden" name="id" value={lesson.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <Field label="Move to" htmlFor="l-move" className="min-w-[16rem] flex-1">
            <select id="l-move" name="targetModuleId" defaultValue="" required className={FIELD}>
              <option value="" disabled>
                Choose a module…
              </option>
              {modules
                .filter((m) => m.id !== lesson.moduleId && (m.sameCourse || can(actor, "content.structure")))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.sameCourse ? m.title : `${m.course} › ${m.title}`}
                  </option>
                ))}
            </select>
          </Field>
          <Checkbox name="confirm" label="Confirm cross-course move" />
          <button className={BTN_OUTLINE}>Move lesson</button>
        </ActionForm>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assessment settings
// ---------------------------------------------------------------------------

export function AssessmentSettings({
  courseId,
  lessonId,
  quiz,
  banks,
  canEdit,
}: {
  courseId: string;
  lessonId: string;
  quiz: {
    id: string;
    title: string;
    kind: string;
    instructions: string | null;
    passingScore: number;
    timeLimitMinutes: number | null;
    maxAttempts: number | null;
    retakeWaitMinutes: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    bankId: string | null;
    drawCount: number;
    showAnswers: boolean;
  } | null;
  banks: { id: string; title: string; count: number }[];
  canEdit: boolean;
}) {
  const q = quiz;
  return (
    <ActionForm action={q ? updateAssessmentAction : createAssessmentAction} className="flex flex-col gap-3" success={q ? "Saved." : undefined}>
      {q && <input type="hidden" name="id" value={q.id} />}
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="courseId" value={courseId} />
      <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-3">
        <Field label="Title" htmlFor="a-title" className="sm:col-span-2">
          <input id="a-title" name="title" defaultValue={q?.title ?? "Check yourself"} required className={FIELD} />
        </Field>
        <Field label="Kind" htmlFor="a-kind">
          <select id="a-kind" name="kind" defaultValue={q?.kind ?? "KNOWLEDGE_CHECK"} className={FIELD}>
            <option value="KNOWLEDGE_CHECK">Knowledge check</option>
            <option value="MODULE_TEST">Module test</option>
            <option value="FINAL">Final assessment</option>
            <option value="ASSIGNMENT">Assignment</option>
          </select>
        </Field>
        <Field label="Instructions" htmlFor="a-ins" className="sm:col-span-3">
          <textarea id="a-ins" name="instructions" rows={2} defaultValue={q?.instructions ?? ""} className={TEXTAREA} />
        </Field>
        <Field label="Pass mark (%)" htmlFor="a-pass">
          <input id="a-pass" name="passingScore" type="number" min={0} max={100} defaultValue={q?.passingScore ?? 70} required className={FIELD} />
        </Field>
        <Field label="Time limit (minutes)" htmlFor="a-time" hint="Empty = untimed">
          <input id="a-time" name="timeLimitMinutes" type="number" min={1} max={600} defaultValue={q?.timeLimitMinutes ?? ""} className={FIELD} />
        </Field>
        <Field label="Attempt limit" htmlFor="a-max" hint="Empty = unlimited">
          <input id="a-max" name="maxAttempts" type="number" min={1} max={50} defaultValue={q?.maxAttempts ?? ""} className={FIELD} />
        </Field>
        <Field label="Wait between attempts (minutes)" htmlFor="a-wait">
          <input id="a-wait" name="retakeWaitMinutes" type="number" min={0} defaultValue={q?.retakeWaitMinutes ?? 0} className={FIELD} />
        </Field>
        <Field label="Draw from bank" htmlFor="a-bank">
          <select id="a-bank" name="bankId" defaultValue={q?.bankId ?? ""} className={FIELD}>
            <option value="">No bank</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.count})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Questions to draw" htmlFor="a-draw">
          <input id="a-draw" name="drawCount" type="number" min={0} max={200} defaultValue={q?.drawCount ?? 0} className={FIELD} />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-3">
          <Checkbox name="randomizeQuestions" label="Shuffle question order" defaultChecked={q?.randomizeQuestions} />
          <Checkbox name="randomizeOptions" label="Shuffle answer options" defaultChecked={q?.randomizeOptions} />
          <Checkbox name="showAnswers" label="Show correct answers and explanations after submission" defaultChecked={q?.showAnswers ?? true} />
        </div>
      </fieldset>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button className={`${BTN} w-fit`}>{q ? "Save settings" : "Add an assessment to this lesson"}</button>
        </div>
      )}
    </ActionForm>
  );
}

export function ArchiveAssessment({ id, courseId }: { id: string; courseId: string }) {
  return (
    <div className="text-[12px] text-muted-foreground">
      To remove this assessment, archive it. Attempts already taken are kept.
      <span className="ml-2 inline-block align-middle">
        <ActionButton action={archiveAssessmentAction} fields={{ id, courseId, archived: "true" }} confirm="Archive this assessment?" variant="ghost">
          Archive assessment
        </ActionButton>
      </span>
    </div>
  );
}
