import Link from "next/link";
import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Empty, Pill } from "@/components/admin/kit";
import { startCaseAction } from "@/lib/actions/sims";
import { casesForLearner } from "@/lib/services/sims/attempts";
import { proficiencyName, standings } from "@/lib/services/sims/competencies";

export const metadata = { title: "Case practice" };

/**
 * Denial cases to work, and the competencies the learner has shown evidence for. Competency
 * comes only from scored case attempts, never from finishing lessons.
 */
export default async function CasesPage() {
  const actor = await requireActor();
  const [list, mine] = await Promise.all([casesForLearner(actor), standings([actor.id]).then((m) => m.get(actor.id) ?? [])]);
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead
        kicker="Case practice"
        title="Work the denial, not a quiz about it"
        lede="Each case is a synthetic denied claim with its remittance, timeline and records. Decide what the problem is, what to do and why, write the account note, and get scored feedback against a published rubric."
      />

      <section aria-labelledby="cases-h" className="mt-8">
        <h2 id="cases-h" className="sr-only">
          Cases
        </h2>
        {list.length === 0 ? (
          <Empty title="No cases are published yet">Cases appear here once a reviewer approves them.</Empty>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((c) => {
              const open = c.attempts.find((a) => a.state === "IN_PROGRESS");
              const latest = c.attempts.find((a) => a.state !== "IN_PROGRESS");
              const left = c.maxAttempts === 0 ? null : c.maxAttempts - c.attemptsUsed;
              return (
                <li key={c.id} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>Difficulty {c.difficulty}/5</Pill>
                    <Pill>About {c.estimatedMinutes} min</Pill>
                    {c.passed && <Pill tone="green">Passed</Pill>}
                  </div>
                  <h3 className="mt-3 text-[1.15rem] font-semibold leading-snug">{c.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">{c.summary}</p>
                  <p className="mt-3 text-micro text-muted-foreground">
                    {c.attemptsUsed === 0 ? "Not attempted" : `Best score ${c.best ?? "–"} · ${c.attemptsUsed} attempt${c.attemptsUsed === 1 ? "" : "s"}`}
                    {left !== null ? ` · ${left} left` : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.locked ? (
                      <p className="text-[13px] text-muted-foreground">Part of a course you do not have access to.</p>
                    ) : open ? (
                      <Link href={`/cases/attempt/${open.id}`} className={BTN}>
                        Continue attempt {open.attemptNo}
                      </Link>
                    ) : left === 0 ? (
                      <p className="text-[13px] text-muted-foreground">No attempts left.</p>
                    ) : (
                      <ActionForm action={startCaseAction}>
                        <input type="hidden" name="caseId" value={c.id} />
                        <button className={BTN}>{c.attemptsUsed ? "Try again" : "Start case"}</button>
                      </ActionForm>
                    )}
                    {latest && (
                      <Link href={`/cases/attempt/${latest.id}`} className={BTN_OUTLINE}>
                        Last result
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="comp-h" className="mt-12">
        <h2 id="comp-h" className="text-[1.25rem] font-semibold">
          Your competencies
        </h2>
        <p className="mt-1 max-w-[66ch] text-[13.5px] text-muted-foreground">Shown from scored case attempts. A competency is demonstrated when you pass a case and score at its threshold on the criteria that evidence it.</p>
        {mine.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-muted-foreground">No evidence yet. Complete a case to start building it.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {mine.map((s) => (
              <li key={s.competencyId} className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
                <span>
                  <span className="text-data text-micro text-muted-foreground">
                    {s.code} · {proficiencyName(s.proficiencyLevel)}
                  </span>
                  <span className="block text-[13.5px] font-medium">{s.name}</span>
                </span>
                {s.demonstrated ? <Pill tone="green">Demonstrated</Pill> : s.expired ? <Pill tone="amber">Reassess</Pill> : <Pill tone="amber">Not yet</Pill>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
