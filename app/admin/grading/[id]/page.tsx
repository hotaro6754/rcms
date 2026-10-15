import Link from "next/link";
import { requirePermission } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, Panel, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { attemptForGrading } from "@/lib/services/learning/attempts";
import { gradeAttemptAction } from "@/lib/actions/learning";

export const metadata = { title: "Mark an attempt" };

/** Manual marking of written answers and uploads, against each question's rubric. */
export default async function GradeAttempt({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("assessment.grade");
  const { id } = await params;
  const { attempt, learner, result, manual } = await attemptForGrading(actor, id);
  const own = attempt.userId === actor.id;
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <Link href="/admin/grading" className="text-micro text-muted-foreground hover:text-foreground">
        ← Grading
      </Link>
      <PageHead kicker={`${learner.name} · attempt ${attempt.attemptNo}`} title={result.title} lede={<span className="flex items-center gap-2"><StatusPill status={attempt.status} /> Submitted {when(attempt.submittedAt, true)}</span>} />

      <div className="mt-8 flex flex-col gap-6">
        <Panel title="Automatically marked">
          <ul className="divide-y divide-border">
            {result.rows
              .filter((r) => r.correct !== null)
              .map((r) => (
                <li key={r.id} className="py-2 text-[13px]">
                  <span className={r.correct ? "text-success" : "text-danger"}>{r.correct ? "✓" : "✗"}</span> {r.prompt}
                  <span className="block text-micro text-muted-foreground">Answered: {r.yourAnswer}</span>
                </li>
              ))}
          </ul>
        </Panel>

        {attempt.status === "PENDING_REVIEW" && !own ? (
          <ActionForm action={gradeAttemptAction} className="flex flex-col gap-5" redirectTo="/admin/grading">
            <input type="hidden" name="attemptId" value={id} />
            {manual.map((m) => (
              <Panel key={m.id} title={m.prompt}>
                {m.scenario && <p className="mb-3 whitespace-pre-line text-[13px] text-muted-foreground">{m.scenario}</p>}
                {m.rubric && (
                  <div className="mb-3 rounded-[3px] border border-border bg-secondary/40 px-3 py-2 text-[12.5px]">
                    <p className="font-semibold">Rubric</p>
                    <p className="whitespace-pre-line">{m.rubric}</p>
                  </div>
                )}
                <div className="mb-3 rounded-[3px] border border-border px-3 py-2 text-[14px] whitespace-pre-line">
                  {m.upload ? (
                    <a href={`/api/attempt-uploads/${m.upload.id}`} className="underline underline-offset-4">
                      Download {m.upload.fileName}
                    </a>
                  ) : typeof m.response === "string" && m.response ? (
                    m.response
                  ) : (
                    <span className="text-muted-foreground">No answer given.</span>
                  )}
                </div>
                <Field label={`Mark (0–${m.points})`} htmlFor={`award-${m.id}`}>
                  <input id={`award-${m.id}`} name={`award:${m.id}`} type="number" min={0} max={m.points} required className={`${FIELD} w-28`} />
                </Field>
              </Panel>
            ))}
            <Field label="Feedback to the learner" htmlFor="feedback">
              <textarea id="feedback" name="feedback" rows={3} className={TEXTAREA} />
            </Field>
            <button className={`${BTN} w-fit`}>Record marks</button>
          </ActionForm>
        ) : (
          <p className="text-[14px] text-muted-foreground">{own ? "This is your own attempt; another grader must mark it." : `Marked: ${attempt.score}%${attempt.passed ? ", passed" : ""}.`}</p>
        )}
      </div>
    </div>
  );
}
