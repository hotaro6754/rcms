import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { requireActor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { attemptForTaking, attemptResult } from "@/lib/services/learning/attempts";
import { AttemptRunner } from "@/components/portal/AttemptRunner";
import { PageHead } from "@/components/platform/PlatformShell";
import { StatusPill, when } from "@/components/admin/kit";

export const metadata = { title: "Assessment" };

/** Take an attempt, or review its result. Only the learner who owns it can open it. */
export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const view = await attemptForTaking(actor, id).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });

  if (view.status === "IN_PROGRESS") {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <Link href={`/academy/${view.courseSlug}/${view.lessonId}`} className="text-micro text-muted-foreground hover:text-foreground">
          ← Back to the lesson (your answers are saved)
        </Link>
        <PageHead kicker={`Attempt ${view.attemptNo} · pass mark ${view.passingScore}%`} title={view.title} lede={view.instructions ?? undefined} />
        <p className="mt-4 text-[12.5px] text-muted-foreground">Do not enter patient information, account numbers, passwords or payment details in any answer.</p>
        <div className="mt-6">
          <AttemptRunner attemptId={view.id} questions={view.questions} initial={view.answers} uploads={view.uploads} expiresAt={view.expiresAt} />
        </div>
      </div>
    );
  }

  const r = await attemptResult(actor, id);
  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <Link href={`/academy/${r.courseSlug}/${r.lessonId}`} className="text-micro text-muted-foreground hover:text-foreground">
        ← Back to the lesson
      </Link>
      <PageHead
        kicker={`Attempt ${r.attemptNo} · submitted ${when(r.submittedAt, true)}`}
        title={r.title}
        lede={
          <span className="flex flex-wrap items-center gap-3">
            <StatusPill status={r.status} label={r.status === "PENDING_REVIEW" ? "waiting for a reviewer" : r.status === "EXPIRED" ? "time ran out" : "graded"} />
            {r.score !== null && (
              <span className="text-[1.2rem] text-foreground">
                {r.score}% {r.status !== "PENDING_REVIEW" && (r.passed ? <span className="text-success">— passed</span> : <span className="text-danger">— pass mark {r.passingScore}%</span>)}
              </span>
            )}
          </span>
        }
      />
      {r.status === "PENDING_REVIEW" && <p className="mt-4 text-[14px]">The automatically marked questions are scored below. Written answers and uploads are marked by a reviewer; you will be notified.</p>}
      {r.feedback && (
        <div className="mt-6 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
          <p className="text-[13px] font-semibold">Reviewer feedback</p>
          <p className="mt-1 whitespace-pre-line text-[14px]">{r.feedback}</p>
        </div>
      )}

      {r.competencies.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[1.1rem]">By competency</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {r.competencies.map((c) => (
              <li key={c.name} className="rounded-[3px] border border-border bg-card px-3 py-2 text-[13.5px]">
                {c.name}
                <span className="text-data float-right text-micro">
                  {c.awarded}/{c.possible}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.remediation.length > 0 && (
        <section className="mt-8 rounded-[var(--radius)] border border-warning/40 bg-warning-bg px-5 py-4">
          <h2 className="text-[1.05rem] text-warning">Revisit before your next attempt</h2>
          <ul className="mt-2 list-disc pl-5 text-[14px]">
            {r.remediation.map((l) => (
              <li key={l.id}>
                <Link href={`/academy/${r.courseSlug}/${l.id}`} className="underline underline-offset-4">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className="mt-8 flex flex-col gap-4">
        {r.rows.map((row, i) => (
          <li key={row.id} className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
            <div className="flex items-start gap-3">
              {row.correct === true ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Correct" /> : row.correct === false ? <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Incorrect" /> : <span className="text-data mt-0.5 text-[10px] text-subtle">REVIEW</span>}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">
                  {i + 1}. {row.prompt}{" "}
                  <span className="text-data text-[10.5px] text-subtle">
                    {row.awarded}/{row.points}
                  </span>
                </p>
                <p className="mt-1.5 text-[13px] text-muted-foreground">Your answer: {row.yourAnswer}</p>
                {row.rightAnswer && row.correct === false && <p className="mt-1 text-[13px] text-success">Correct answer: {row.rightAnswer}</p>}
                {row.rationale && <p className="mt-2 border-l-2 border-border pl-3 text-[13px] text-muted-foreground">{row.rationale}</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
