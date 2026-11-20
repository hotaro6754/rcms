import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, BookOpen, Check, ClipboardCheck, Clock, Layers, Lock, MonitorPlay, Play, Presentation } from "lucide-react";
import { requireActor } from "@/lib/actor";
import { courseAccess, getPublishedCourse } from "@/lib/services/learning/catalog";
import { progressFor } from "@/lib/services/learning/progress";
import { eligibility } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { when } from "@/components/admin/kit";
import { FOUNDER } from "@/lib/data/founder";
import s from "./course.module.css";

const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ""}`.trim() : `${min} min`);

/**
 * A course workspace: the course at the top with one "continue" action, the contents as modules
 * that open into lessons (formats, length and status on every row), and a sticky progress card
 * with what the certificate still needs. Everything comes from the released version and the
 * learner's stored progress.
 */
export default async function CoursePage({ params }: { params: Promise<{ program: string }> }) {
  const { program: slug } = await params;
  const actor = await requireActor();
  const course = await getPublishedCourse(slug);
  if (!course) notFound();
  const access = await courseAccess(actor, course);
  if (!access.full) redirect(`/catalog/${slug}`);
  const snap = course.snapshot;
  const progress = access.tracked ? await progressFor(actor.id, snap) : null;
  const [elig, cert] = access.tracked
    ? await Promise.all([eligibility(actor.id, course.id), prisma.certificate.findFirst({ where: { userId: actor.id, programId: course.id, revokedAt: null }, select: { serial: true } })])
    : [null, null];

  const lessons = snap.modules.flatMap((m) => m.lessons);
  const totalMin = lessons.reduce((n, l) => n + (l.minutes || 0), 0);
  const assessments = lessons.filter((l) => l.assessment).length;
  // Assessment track: every assessment in the course in order, with this learner's best result.
  const quizLessons = lessons.filter((l) => l.assessment);
  const tries = access.tracked && quizLessons.length
    ? await prisma.quizAttempt.findMany({ where: { userId: actor.id, quizId: { in: quizLessons.map((l) => l.assessment!.id) } }, select: { quizId: true, passed: true, score: true, status: true } })
    : [];
  const quizState = (quizId: string) => {
    const mine = tries.filter((t) => t.quizId === quizId);
    if (mine.some((t) => t.passed)) return { state: "passed" as const, best: Math.max(...mine.map((t) => t.score ?? 0)) };
    if (mine.some((t) => t.status === "PENDING_REVIEW")) return { state: "review" as const, best: null };
    if (mine.length) return { state: "retry" as const, best: Math.max(...mine.map((t) => t.score ?? 0)) };
    return { state: "open" as const, best: null };
  };
  const track = quizLessons.map((l) => {
    const mod = snap.modules.find((m) => m.lessons.some((x) => x.id === l.id));
    return { lesson: l, quiz: l.assessment!, module: mod, final: l.assessment!.kind === "FINAL", ...quizState(l.assessment!.id) };
  });
  const doneSet = progress?.done ?? new Set<string>();
  const next = lessons.find((l) => !doneSet.has(l.id)) ?? lessons[0];
  const nextModuleId = snap.modules.find((m) => m.lessons.some((l) => l.id === next?.id))?.id;
  const pct = progress?.percent ?? 0;
  const started = (progress?.lessonsDone ?? 0) > 0;
  const C = 2 * Math.PI * 44;

  return (
    <div className={s.page}>
      <Link href="/academy" className={s.back}>
        <ArrowLeft aria-hidden /> My learning
      </Link>

      {/* ---------- hero ---------- */}
      <header className={s.hero}>
        <div className={s.heroCopy}>
          <p className="x-kicker">
            {snap.course.tier || "Course"} · version {course.version}
          </p>
          <h1 className={`x-display ${s.title}`}>{snap.course.name}</h1>
          {snap.course.who && <p className={s.who}>{snap.course.who}</p>}
          {access.reason === "staff_preview" && <p className={s.staff}>Staff view: progress is not recorded.</p>}
          <ul className={s.meta}>
            <li>
              <Layers aria-hidden /> {snap.modules.length} modules
            </li>
            <li>
              <BookOpen aria-hidden /> {lessons.length} lessons
            </li>
            <li>
              <Clock aria-hidden /> {hours(totalMin)}
            </li>
            {assessments > 0 && (
              <li>
                <ClipboardCheck aria-hidden /> {assessments} assessment{assessments > 1 ? "s" : ""}
              </li>
            )}
          </ul>
          {next && (
            <div className={s.ctaRow}>
              <Link href={`/academy/${slug}/${next.id}`} className={s.cta}>
                <Play aria-hidden /> {started ? "Continue" : "Start the course"}
              </Link>
              <span className={s.nextLine}>
                {started ? "Next" : "First"}: <b>{next.title}</b>
              </span>
            </div>
          )}
        </div>
        <div className={s.heroArt} aria-hidden>
          <svg viewBox="0 0 220 160">
            {snap.modules.slice(0, 10).map((m, i, arr) => {
              const w = 200 / arr.length;
              const total = m.lessons.length || 1;
              const done = m.lessons.filter((l) => doneSet.has(l.id)).length;
              const h = 24 + (i / Math.max(1, arr.length - 1)) * 110;
              return (
                <g key={m.id}>
                  <rect x={10 + i * w + 3} y={150 - h} width={w - 6} height={h} rx="7" className={s.artBar} />
                  <rect x={10 + i * w + 3} y={150 - h * (done / total)} width={w - 6} height={h * (done / total)} rx="7" className={s.artFill} />
                </g>
              );
            })}
          </svg>
          <span className="x-lab">Your progress by module</span>
        </div>
      </header>

      <div className={s.layout}>
        {/* ---------- contents ---------- */}
        <section className={s.contents} aria-labelledby="contents-title">
          <div className={s.contentsHead}>
            <h2 id="contents-title" className={`x-display ${s.h2}`}>
              Course contents
            </h2>
            <span className={s.contentsMeta}>
              {snap.modules.length} modules · {lessons.length} lessons · {hours(totalMin)}
            </span>
          </div>
          <div className={s.modules}>
            {snap.modules.map((m, i) => {
              const pre = m.prerequisiteModuleId ? snap.modules.find((x) => x.id === m.prerequisiteModuleId) : null;
              const locked = !!(progress && pre && pre.lessons.some((l) => !doneSet.has(l.id)));
              const done = m.lessons.filter((l) => doneSet.has(l.id)).length;
              const mins = m.lessons.reduce((n, l) => n + (l.minutes || 0), 0);
              const complete = m.lessons.length > 0 && done === m.lessons.length;
              return (
                <details key={m.id} className={s.module} open={m.id === nextModuleId} data-state={complete ? "done" : locked ? "locked" : done ? "part" : undefined}>
                  <summary>
                    <span className={s.modNum}>{complete ? <Check aria-hidden /> : locked ? <Lock aria-hidden /> : String(i + 1).padStart(2, "0")}</span>
                    <span className={s.modText}>
                      <span className={s.modTitle}>{m.title.replace(/^\d+\.\s*/, "")}</span>
                      <span className={s.modMeta}>
                        {m.lessons.length} lessons · {hours(mins)}
                        {locked && pre ? ` · opens after “${pre.title.replace(/^\d+\.\s*/, "")}”` : ""}
                      </span>
                    </span>
                    {(() => {
                      const t = track.find((x) => x.module?.id === m.id && !x.final);
                      if (!t) return null;
                      const label = t.state === "passed" ? `Test passed${t.best !== null ? ` · ${t.best}%` : ""}` : t.state === "retry" ? "Test: retake" : t.state === "review" ? "Test: in review" : "Module test";
                      return (
                        <span className={s.testChip} data-state={t.state}>
                          <ClipboardCheck aria-hidden /> {label}
                        </span>
                      );
                    })()}
                    {progress && (
                      <span className={s.modProg}>
                        <span className={s.modTrack}>
                          <i style={{ width: `${m.lessons.length ? (done / m.lessons.length) * 100 : 0}%` }} />
                        </span>
                        <span className={s.modCount}>
                          {done}/{m.lessons.length}
                        </span>
                      </span>
                    )}
                    <span className={s.chev} aria-hidden />
                  </summary>
                  {m.summary && <p className={s.modSummary}>{m.summary}</p>}
                  <ol className={s.lessons}>
                    {m.lessons.map((l, j) => {
                      const isDone = doneSet.has(l.id);
                      const isNext = l.id === next?.id;
                      const video = l.blocks.some((b) => b.kind === "VIDEO");
                      const slides = l.resources.some((r) => r.format === "SLIDES");
                      const reading = l.resources.some((r) => r.format === "READING");
                      return (
                        <li key={l.id}>
                          <Link href={`/academy/${slug}/${l.id}`} className={s.lesson} data-state={isDone ? "done" : isNext ? "next" : undefined}>
                            <span className={s.status}>{isDone ? <Check aria-hidden /> : isNext ? <Play aria-hidden /> : <span>{j + 1}</span>}</span>
                            <span className={s.lessonTitle}>
                              {l.title}
                              {isNext && <em>{started ? "Up next" : "Start here"}</em>}
                            </span>
                            <span className={s.formats} aria-label="Formats">
                              {video && <MonitorPlay aria-label="Video" />}
                              {slides && <Presentation aria-label="Slides" />}
                              {reading && <BookOpen aria-label="Reading" />}
                              {l.assessment && <ClipboardCheck aria-label="Assessment" />}
                            </span>
                            <span className={s.mins}>{l.minutes} min</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              );
            })}
          </div>
          <p className={s.fine}>
            Educational content, effective {when(snap.course.effectiveDate)}; next scheduled review {when(snap.course.reviewDate)}. It does not replace legal, coding, clinical, contractual or payer-specific guidance.
            Validate against current official sources and your organisation&apos;s procedures.
            {snap.course.disclaimer ? ` ${snap.course.disclaimer}` : ""}
          </p>
        </section>

        {/* ---------- side ---------- */}
        <aside className={s.side}>
          {track.length > 0 && (
            <section className={`x-slab x-surface ${s.trackCard}`} aria-label="Assessments and certificate">
              <span className="x-lab">Assessments</span>
              <ol className={s.track}>
                {track.map((t, i) => (
                  <li key={t.quiz.id} data-state={t.state} data-final={t.final || undefined}>
                    <span className={s.trackDot}>{t.state === "passed" ? <Check aria-hidden /> : <span>{t.final ? "F" : i + 1}</span>}</span>
                    <Link href={`/academy/${slug}/${t.lesson.id}#assess`} className={s.trackText}>
                      <b>{t.final ? "Final assessment" : t.quiz.title}</b>
                      <small>
                        {t.state === "passed" ? `Passed${t.best !== null ? ` · best ${t.best}%` : ""}` : t.state === "retry" ? `Best ${t.best}% · pass mark ${t.quiz.passingScore}%` : t.state === "review" ? "Waiting for a reviewer" : `Pass mark ${t.quiz.passingScore}%`}
                      </small>
                    </Link>
                  </li>
                ))}
                <li data-state={cert ? "passed" : elig?.eligible ? "ready" : "open"} data-cert>
                  <span className={s.trackDot}>
                    <Award aria-hidden />
                  </span>
                  <span className={s.trackText}>
                    <b>Certificate</b>
                    <small>{cert ? "Earned" : elig?.eligible ? "Ready to claim" : "After every lesson and assessment"}</small>
                  </span>
                </li>
              </ol>
            </section>
          )}
          <section className={`x-slab x-night ${s.progressCard}`} aria-label="Your progress">
            <span className="x-lab">Your progress</span>
            <div className={s.ringRow}>
              <svg viewBox="0 0 100 100" className={s.ring} role="img" aria-label={`${pct}% complete`}>
                <circle cx="50" cy="50" r="44" className={s.ringTrack} />
                <circle cx="50" cy="50" r="44" className={s.ringFill} strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 50 50)" />
                <text x="50" y="56" textAnchor="middle" className={s.ringN}>
                  {pct}%
                </text>
              </svg>
              <div className={s.ringText}>
                <b>
                  {progress?.lessonsDone ?? 0} of {lessons.length}
                </b>
                <span>lessons completed</span>
              </div>
            </div>
            {next && (
              <Link href={`/academy/${slug}/${next.id}`} className={s.sideCta}>
                <Play aria-hidden /> {started ? "Continue learning" : "Start learning"}
              </Link>
            )}
          </section>

          <section className={`x-slab x-sand ${s.certCard}`} aria-label="Certificate">
            <span className={s.certHead}>
              <Award aria-hidden />
              <span className="x-lab">Certificate</span>
            </span>
            {cert ? (
              <>
                <p className={s.certLine}>Earned. Share it with your manager or on your profile.</p>
                <Link href={`/certificates/${cert.serial}`} className={s.certBtn}>
                  View certificate
                </Link>
              </>
            ) : elig ? (
              <>
                <ul className={s.reqs}>
                  <li data-ok={elig.lessonsDone >= elig.lessonsTotal || undefined}>
                    <Check aria-hidden /> All lessons complete
                    <span>
                      {elig.lessonsDone}/{elig.lessonsTotal}
                    </span>
                  </li>
                  {elig.quizzesTotal > 0 && (
                    <li data-ok={elig.quizzesPassed >= elig.quizzesTotal || undefined}>
                      <Check aria-hidden /> Assessments passed
                      <span>
                        {elig.quizzesPassed}/{elig.quizzesTotal}
                      </span>
                    </li>
                  )}
                </ul>
                <p className={s.certLine}>{elig.eligible ? "You have met every requirement. Claim it from My learning." : "Verifiable, with its own serial and the course version you completed."}</p>
              </>
            ) : (
              <p className={s.certLine}>Progress and certificates are recorded for enrolled learners.</p>
            )}
          </section>

          <section className={`x-slab x-surface ${s.author}`} aria-label="Written by">
            <span className="x-lab">Written by</span>
            <div className={s.authorRow}>
              <span className={s.avatar} aria-hidden>
                {FOUNDER.name
                  .split(" ")
                  .filter((p) => /^[A-Z]/.test(p))
                  .slice(-2)
                  .map((p) => p[0])
                  .join("")}
              </span>
              <span>
                <b>{FOUNDER.name}</b>
                <small>{FOUNDER.years} years in US healthcare revenue cycle operations</small>
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
