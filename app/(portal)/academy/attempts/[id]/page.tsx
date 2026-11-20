import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, RotateCcw, ShieldCheck, X } from "lucide-react";
import { requireActor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { attemptForTaking, attemptResult } from "@/lib/services/learning/attempts";
import { AttemptRunner } from "@/components/portal/AttemptRunner";
import { Rexi } from "@/components/mascot/Rexi";
import { Confetti } from "@/components/learning/Confetti";
import { when } from "@/components/admin/kit";
import s from "./attempt.module.css";

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
      <div className={s.page}>
        <Link href={`/academy/${view.courseSlug}/${view.lessonId}`} className={s.back}>
          <ArrowLeft aria-hidden /> Back to the lesson <span>(your answers are saved)</span>
        </Link>
        <header className={s.takeHead}>
          <div>
            <p className="x-kicker">
              Attempt {view.attemptNo} · pass mark {view.passingScore}%
            </p>
            <h1 className={`x-display ${s.title}`}>{view.title}</h1>
            {view.instructions && <p className={s.lede}>{view.instructions}</p>}
          </div>
          <ul className={s.rules}>
            <li>
              <ShieldCheck aria-hidden /> Answers save as you go
            </li>
            <li>
              <Clock aria-hidden /> {view.expiresAt ? "Timed: the clock is at the top" : "No time limit"}
            </li>
            <li>
              <X aria-hidden /> No patient, account or payment details in answers
            </li>
          </ul>
        </header>
        <AttemptRunner attemptId={view.id} questions={view.questions} initial={view.answers} uploads={view.uploads} expiresAt={view.expiresAt} />
      </div>
    );
  }

  const r = await attemptResult(actor, id);
  const pendingReview = r.status === "PENDING_REVIEW";
  const passed = !pendingReview && r.passed;
  const score = r.score ?? 0;
  const correct = r.rows.filter((x) => x.correct === true).length;
  const wrong = r.rows.filter((x) => x.correct === false).length;
  // Semicircle gauge
  const R = 80;
  const arc = Math.PI * R;
  const passAt = Math.min(100, Math.max(0, r.passingScore));
  const px = 100 - R * Math.cos((passAt / 100) * Math.PI);
  const py = 100 - R * Math.sin((passAt / 100) * Math.PI);

  return (
    <div className={s.page}>
      {passed && <Confetti />}
      <Link href={`/academy/${r.courseSlug}/${r.lessonId}`} className={s.back}>
        <ArrowLeft aria-hidden /> Back to the lesson
      </Link>

      <section className={s.hero} data-state={pendingReview ? "review" : passed ? "pass" : "fail"}>
        <div className={s.heroCopy}>
          <p className="x-kicker">
            Attempt {r.attemptNo} · submitted {when(r.submittedAt, true)}
          </p>
          <h1 className={`x-display ${s.title}`}>{r.title}</h1>
          <p className={s.verdict}>
            {pendingReview
              ? "Submitted. Written answers are with a reviewer; you will be notified when they are marked."
              : r.status === "EXPIRED"
                ? `Time ran out. ${passed ? "You still passed." : "Review the lessons below and try again."}`
                : passed
                  ? "Passed. Nicely done: this module counts towards your certificate."
                  : `Not this time. You need ${r.passingScore}% to pass.`}
          </p>
          <div className={s.heroStats}>
            <span>
              <Check aria-hidden /> {correct} correct
            </span>
            <span>
              <X aria-hidden /> {wrong} incorrect
            </span>
            {pendingReview && (
              <span>
                <Clock aria-hidden /> Awaiting review
              </span>
            )}
          </div>
          <div className={s.heroActions}>
            <Link href={`/academy/${r.courseSlug}`} className={s.primary}>
              {passed ? "Continue the course" : "Back to the course"} <ArrowRight aria-hidden />
            </Link>
            {!passed && !pendingReview && (
              <Link href={`/academy/${r.courseSlug}/${r.lessonId}#assess`} className={s.secondary}>
                <RotateCcw aria-hidden /> Try again
              </Link>
            )}
          </div>
        </div>
        <div className={s.gaugeWrap}>
          <svg viewBox="0 0 200 118" className={s.gauge} role="img" aria-label={`Score ${score}%, pass mark ${r.passingScore}%`}>
            <path d={`M20 100 A${R} ${R} 0 0 1 180 100`} className={s.gTrack} />
            <path d={`M20 100 A${R} ${R} 0 0 1 180 100`} className={s.gFill} strokeDasharray={`${(score / 100) * arc} ${arc}`} />
            <line x1={px} y1={py} x2={100 - (R - 18) * Math.cos((passAt / 100) * Math.PI)} y2={100 - (R - 18) * Math.sin((passAt / 100) * Math.PI)} className={s.gMark} />
            <text x="100" y="92" textAnchor="middle" className={s.gN}>
              {r.score === null ? "—" : `${score}%`}
            </text>
            <text x="100" y="112" textAnchor="middle" className={s.gL}>
              PASS MARK {r.passingScore}%
            </text>
          </svg>
          <Rexi mood={pendingReview ? "think" : passed ? "cheer" : "sad"} size={130} say={pendingReview ? "Fingers crossed!" : passed ? "You passed!" : "Let’s review and retry."} />
        </div>
      </section>

      {r.feedback && (
        <section className={s.panel}>
          <p className="x-lab">Reviewer feedback</p>
          <p className={s.feedback}>{r.feedback}</p>
        </section>
      )}

      <div className={s.split}>
        {r.competencies.length > 0 && (
          <section className={s.panel}>
            <p className="x-lab">By competency</p>
            <ul className={s.comps}>
              {r.competencies.map((c, i) => {
                const pct = c.possible ? Math.round((c.awarded / c.possible) * 100) : 0;
                return (
                  <li key={c.name}>
                    <span className={s.compName}>
                      {c.name}
                      <b>
                        {c.awarded}/{c.possible}
                      </b>
                    </span>
                    <span className={s.compTrack}>
                      <i style={{ width: `${pct}%`, animationDelay: `${i * 80}ms` }} data-low={pct < r.passingScore || undefined} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {r.remediation.length > 0 && (
          <section className={`${s.panel} ${s.remedy}`}>
            <p className="x-lab">Revisit before your next attempt</p>
            <ul className={s.remList}>
              {r.remediation.map((l) => (
                <li key={l.id}>
                  <Link href={`/academy/${r.courseSlug}/${l.id}`}>
                    <BookOpen aria-hidden /> {l.title} <ArrowRight aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className={s.answers} aria-labelledby="answers-title">
        <h2 id="answers-title" className={`x-display ${s.h2}`}>
          Your answers
        </h2>
        <ol className={s.rows}>
          {r.rows.map((row, i) => (
            <li key={row.id} className={s.row} data-state={row.correct === true ? "ok" : row.correct === false ? "bad" : "review"}>
              <span className={s.rowIcon}>{row.correct === true ? <Check aria-label="Correct" /> : row.correct === false ? <X aria-label="Incorrect" /> : <Clock aria-label="Awaiting review" />}</span>
              <div className={s.rowBody}>
                <p className={s.rowQ}>
                  <span>Q{i + 1}</span> {row.prompt}
                  <b>
                    {row.awarded}/{row.points}
                  </b>
                </p>
                <p className={s.rowA}>
                  <em>Your answer</em> {row.yourAnswer || "No answer"}
                </p>
                {row.rightAnswer && row.correct === false && (
                  <p className={s.rowRight}>
                    <em>Correct answer</em> {row.rightAnswer}
                  </p>
                )}
                {row.rationale && <p className={s.rowWhy}>{row.rationale}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
