import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { buildSnapshot } from "@/lib/services/cms/release";
import { flatLessons } from "@/lib/cms/snapshot";
import { Blocks } from "@/components/cms/BlockView";
import { QUESTION_LABEL } from "@/lib/assessment/questions";
import { typeLabel, humanSize } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const metadata = { title: "Preview" };

/**
 * What learners would see if the current draft were released: only modules and lessons
 * marked ready, rendered with the same components as the learner portal. Nothing here is
 * recorded as learner progress. Reviewers decide from this page.
 */
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lesson?: string; device?: string }> }) {
  await requirePermission("content.view");
  const { id } = await params;
  const sp = await searchParams;
  const course = await prisma.program.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!course) notFound();
  const { snapshot, problems } = await buildSnapshot(prisma, id);
  const lessons = flatLessons(snapshot);
  const current = lessons.find((l) => l.id === sp.lesson) ?? lessons[0] ?? null;
  const mobile = sp.device === "mobile";
  const q = (extra: Record<string, string>) => new URLSearchParams({ ...(current ? { lesson: current.id } : {}), ...(mobile ? { device: "mobile" } : {}), ...extra }).toString();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-warning/40 bg-warning-bg px-4 py-2.5">
        <p className="text-[13px] text-warning">
          Preview of the draft release candidate. {problems.length ? `${problems.length} issue(s) would block release.` : "Ready to submit."} Progress is not recorded.
        </p>
        <div className="flex items-center gap-3 text-[13px]">
          <Link href={`?${q({ device: "desktop" }).replace(/device=mobile&?/, "")}`} className={cn("underline-offset-4", !mobile && "font-semibold underline")}>
            Desktop
          </Link>
          <Link href={`?${q({ device: "mobile" })}`} className={cn("underline-offset-4", mobile && "font-semibold underline")}>
            Mobile
          </Link>
          <Link href={`/admin/content/courses/${id}`} className="underline underline-offset-4">
            Back to editor
          </Link>
        </div>
      </div>

      {problems.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-micro text-warning">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className={cn("mx-auto mt-8 grid gap-8", mobile ? "max-w-[390px] grid-cols-1 rounded-[24px] border-8 border-foreground/80 p-4" : "lg:grid-cols-[18rem_minmax(0,1fr)]")}>
        <nav aria-label="Course outline" className={cn("flex flex-col gap-4", mobile && "order-2 border-t border-border pt-4")}>
          <p className="text-[15px] font-semibold">{snapshot.course.name}</p>
          {snapshot.modules.map((m, i) => (
            <div key={m.id}>
              <p className="text-data text-[10.5px] tracking-[0.1em] text-subtle">
                {String(i + 1).padStart(2, "0")} {m.title.toUpperCase()}
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link href={`?${q({ lesson: l.id })}`} className={cn("text-[13px] hover:underline", current?.id === l.id ? "font-semibold" : "text-muted-foreground")}>
                      {l.title}
                      {l.freePreview && <span className="text-data ml-1.5 text-[9.5px] text-subtle">FREE</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <article className="min-w-0">
          {current ? (
            <>
              <p className="label-caps">{current.moduleTitle}</p>
              <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">{current.title}</h1>
              <p className="text-data mt-2 text-micro text-muted-foreground">
                {current.minutes} min{current.effectiveDate ? ` · effective ${new Date(current.effectiveDate).toLocaleDateString("en-IN")}` : ""}
              </p>
              {current.objectives.length > 0 && (
                <ul className="mt-5 list-disc pl-5 text-[14px] text-muted-foreground">
                  {current.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              )}
              <div className="mt-8">
                <Blocks blocks={current.blocks} mediaContext="preview" />
              </div>
              {current.resources.length > 0 && (
                <ul className="mt-8 flex flex-col gap-1.5 text-[13px]">
                  {current.resources.map((r) => (
                    <li key={r.id}>
                      <a href={`/api/materials/${r.id}`} className="underline underline-offset-4">
                        {r.title}
                      </a>{" "}
                      <span className="text-data text-[10.5px] text-subtle">
                        {typeLabel(r.mimeType)} {humanSize(r.sizeBytes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {current.assessment && (
                <section className="mt-10 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
                  <p className="text-[14px] font-semibold">{current.assessment.title}</p>
                  <p className="text-data mt-1 text-micro text-muted-foreground">
                    Pass {current.assessment.passingScore}% · {current.assessment.timeLimitMinutes ? `${current.assessment.timeLimitMinutes} min` : "untimed"} · {current.assessment.maxAttempts ? `${current.assessment.maxAttempts} attempts` : "unlimited attempts"} · {current.assessment.questions.length} questions
                    {current.assessment.drawCount ? ` + ${current.assessment.drawCount} drawn from a bank` : ""}
                  </p>
                  <ol className="mt-3 flex flex-col gap-3">
                    {current.assessment.questions.map((qq, i) => (
                      <li key={qq.id} className="text-[13.5px]">
                        {i + 1}. {qq.prompt} <span className="text-data text-[10px] text-subtle">{QUESTION_LABEL[qq.type].toUpperCase()}</span>
                        {qq.options.length > 0 && (
                          <ul className="ml-5 mt-1 list-disc text-[13px] text-muted-foreground">
                            {qq.options.map((o, j) => (
                              <li key={j}>{o}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No lessons are marked ready yet.</p>
          )}
        </article>
      </div>
    </div>
  );
}
