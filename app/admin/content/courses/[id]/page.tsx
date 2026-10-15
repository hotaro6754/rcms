import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { Panel, StatusPill } from "@/components/admin/kit";
import { CurriculumTree } from "@/components/cms/CurriculumTree";
import { BlockEditor } from "@/components/cms/BlockEditor";
import { QuestionList } from "@/components/cms/QuestionList";
import { MaterialsManager } from "@/components/studio/MaterialsManager";
import { ArchiveAssessment, AssessmentSettings, CourseForm, DuplicateCourse, LessonPanel, ModulePanel, WorkflowPanel } from "@/components/cms/panels";
import { releaseReadiness } from "@/lib/services/cms/release";
import { impactOf } from "@/lib/services/cms/structure";
import { usersWithPermission } from "@/lib/services/people/staff-lookup";
import { STATUS_LABEL } from "@/lib/services/cms/core";
import { humanSize, typeLabel } from "@/lib/storage";
import type { QuestionValue } from "@/components/cms/QuestionForm";

export const metadata = { title: "Course workspace" };

/**
 * The course workspace: the curriculum tree on the left, the editor for whatever is selected
 * on the right (course details, a module, or a lesson with its blocks, materials and
 * assessment), and the review-and-release panel for the course as a whole.
 */
export default async function CourseWorkspace({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ item?: string }> }) {
  const actor = await requirePagePermission("content.view");
  const { id } = await params;
  const { item = "course" } = await searchParams;

  const course = await prisma.program.findUnique({
    where: { id },
    include: {
      learningLevel: { select: { id: true, displayTitle: true } },
      publishedVersion: { select: { version: true, publishedAt: true } },
      modules: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          lessons: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, state: true, freePreview: true, quizzes: { where: { archivedAt: null }, select: { id: true } } },
          },
        },
      },
      reviews: { orderBy: { createdAt: "desc" }, take: 12 },
      _count: { select: { versions: true } },
    },
  });
  if (!course) notFound();

  const canEdit = can(actor, "content.edit") && !["ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED", "ARCHIVED"].includes(course.status);
  const [kind, itemId] = item.split(":");

  const [problems, impact, reviewerNames] = await Promise.all([
    releaseReadiness(id),
    impactOf("course", id),
    prisma.user.findMany({ where: { id: { in: course.reviews.map((r) => r.reviewerId) } }, select: { id: true, name: true } }),
  ]);
  const nameOf = new Map(reviewerNames.map((u) => [u.id, u.name]));

  const tree = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    state: m.state,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, state: l.state, freePreview: l.freePreview, hasAssessment: l.quizzes.length > 0 })),
  }));
  const courseLessons = course.modules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, title: l.title })));

  let editor: React.ReactNode = null;

  if (kind === "module" && itemId) {
    const mod = await prisma.module.findFirst({
      where: { id: itemId, programId: id },
      include: { lessons: { select: { id: true, _count: { select: { blocks: true, resources: true, quizzes: true } } } } },
    });
    if (!mod) notFound();
    const courses = await prisma.program.findMany({ where: { id: { not: id }, status: { notIn: ["ARCHIVED", "ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    editor = (
      <ModulePanel
        actor={canEdit ? actor : { ...actor, permissions: new Set() }}
        courseId={id}
        courses={courses}
        mod={{
          ...mod,
          lessons: mod.lessons.length,
          blocks: mod.lessons.reduce((n, l) => n + l._count.blocks, 0),
          resources: mod.lessons.reduce((n, l) => n + l._count.resources, 0),
          assessments: mod.lessons.reduce((n, l) => n + l._count.quizzes, 0),
        }}
      />
    );
  } else if (kind === "lesson" && itemId) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: itemId, module: { programId: id } },
      include: {
        blocks: { orderBy: { sortOrder: "asc" } },
        resources: { where: { archivedAt: null }, orderBy: { createdAt: "asc" } },
        quizzes: { where: { archivedAt: null }, take: 1, include: { questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } } },
      },
    });
    if (!lesson) notFound();
    const [allModules, images, banks] = await Promise.all([
      prisma.module.findMany({
        where: { state: { not: "ARCHIVED" }, program: { status: { notIn: ["ARCHIVED", "ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED"] } } },
        select: { id: true, title: true, programId: true, program: { select: { name: true } } },
        orderBy: [{ programId: "asc" }, { sortOrder: "asc" }],
      }),
      prisma.mediaAsset.findMany({ where: { kind: "IMAGE", archivedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
      prisma.questionBank.findMany({ where: { archivedAt: null }, select: { id: true, title: true, _count: { select: { questions: { where: { archivedAt: null } } } } } }),
    ]);
    const quiz = lesson.quizzes[0] ?? null;
    editor = (
      <div className="flex flex-col gap-6">
        <LessonPanel
          actor={canEdit ? actor : { ...actor, permissions: new Set() }}
          courseId={id}
          courseSlug={course.slug}
          lesson={{ ...lesson, hasAssessment: !!quiz }}
          modules={allModules.map((m) => ({ id: m.id, title: m.title, course: m.program.name, sameCourse: m.programId === id }))}
        />
        <Panel title="Content">
          <BlockEditor courseId={id} lessonId={lesson.id} canEdit={canEdit} images={images} blocks={lesson.blocks.map((b) => ({ id: b.id, kind: b.kind, data: b.data as Record<string, unknown>, updatedAt: b.updatedAt.toISOString() }))} />
        </Panel>
        <Panel title="Downloadable resources">
          {canEdit ? (
            <MaterialsManager lessonId={lesson.id} rows={lesson.resources.map((r) => ({ id: r.id, title: r.title, type: typeLabel(r.mimeType), size: humanSize(r.sizeBytes) }))} />
          ) : (
            <ul className="text-[13px]">
              {lesson.resources.map((r) => (
                <li key={r.id}>{r.title}</li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={quiz ? `Assessment: ${quiz.title}` : "Assessment"}>
          <div className="flex flex-col gap-5">
            <AssessmentSettings courseId={id} lessonId={lesson.id} quiz={quiz} banks={banks.map((b) => ({ id: b.id, title: b.title, count: b._count.questions }))} canEdit={canEdit && can(actor, "assessment.manage")} />
            {quiz && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-[13px] font-semibold">Questions</p>
                  <QuestionList
                    owner={{ quizId: quiz.id }}
                    courseId={id}
                    lessons={courseLessons}
                    banks={banks.map((b) => ({ id: b.id, title: b.title }))}
                    canEdit={canEdit && can(actor, "assessment.manage")}
                    questions={quiz.questions.map((q) => ({ ...(q as unknown as QuestionValue), id: q.id, answerKey: (q.answerKey as Record<string, unknown>) ?? { index: q.correct } }))}
                  />
                </div>
                {canEdit && can(actor, "content.archive") && <ArchiveAssessment id={quiz.id} courseId={id} />}
              </>
            )}
          </div>
        </Panel>
      </div>
    );
  } else {
    const [levels, academic, compliance, thumbnails] = await Promise.all([
      prisma.learningLevel.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { sequence: "asc" }, select: { id: true, displayTitle: true } }),
      usersWithPermission("content.review.academic"),
      usersWithPermission("content.review.compliance"),
      prisma.mediaAsset.findMany({ where: { kind: "IMAGE", isPublic: true, archivedAt: null }, select: { id: true, title: true } }),
    ]);
    editor = (
      <div className="flex flex-col gap-6">
        <Panel title="Course details" aside={
            <span className="flex items-center gap-2">
              {can(actor, "content.export") && (
                <a href={`/api/content/courses/${id}/export`} className="text-micro underline">
                  Export
                </a>
              )}
              {can(actor, "content.create") && <DuplicateCourse id={id} />}
            </span>
          }>
          <CourseForm course={course} levels={levels} reviewers={{ academic, compliance }} thumbnails={thumbnails} canEdit={canEdit} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <Link href="/admin/content" className="text-micro text-muted-foreground hover:text-foreground">
        ← Levels and courses
      </Link>
      <PageHead
        kicker={course.learningLevel?.displayTitle ?? "Unassigned course"}
        title={course.name}
        lede={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={course.status} label={STATUS_LABEL[course.status]} />
            {course.publishedVersion ? <span>Live: version {course.publishedVersion.version}</span> : <span>Never released</span>}
            {!canEdit && course.status !== "ARCHIVED" && can(actor, "content.edit") && <span className="text-warning">Locked while in review.</span>}
          </span>
        }
        actions={
          <>
            <Link href={`/admin/content/courses/${id}/preview`} className="min-h-10 rounded-[3px] border border-input bg-card px-4 py-2.5 text-[13.5px] hover:bg-secondary">
              Preview as learner
            </Link>
            <Link href={`/admin/content/courses/${id}/history`} className="min-h-10 rounded-[3px] border border-input bg-card px-4 py-2.5 text-[13.5px] hover:bg-secondary">
              Versions and history
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1">
          <CurriculumTree courseId={id} modules={tree} selected={kind === "course" ? "course" : `${kind}:${itemId}`} canEdit={canEdit} />
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <WorkflowPanel
            actor={actor}
            course={course}
            problems={problems}
            impact={impact}
            versions={course._count.versions}
            reviews={course.reviews.map((r) => ({ id: r.id, stage: r.stage, decision: r.decision, comment: r.comment, createdAt: r.createdAt, reviewer: nameOf.get(r.reviewerId) ?? "Someone" }))}
          />
          {editor}
        </div>
      </div>
    </div>
  );
}
