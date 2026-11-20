import Link from "next/link";
import { Check, Flame, Lock, Play } from "lucide-react";
import s from "./gamify.module.css";

/**
 * The student's motivation layer: streak, daily goal, learning points, a course path and
 * badges. Every number is counted from stored records (lessons completed, assessments passed,
 * certificates issued, days with lesson activity); nothing is invented, and the points rule is
 * printed beside the total.
 */

export const POINTS = { lesson: 10, assessment: 50, certificate: 200 } as const;

/* ---------------------------------------------------------------- streak + goal */

export function StreakCard({
  streak,
  best,
  days,
  doneToday,
  goal,
}: {
  streak: number;
  best: number;
  days: { key: string; label: string; on: boolean; today: boolean }[];
  doneToday: number;
  goal: number;
}) {
  const pct = Math.min(1, doneToday / goal);
  const C = 2 * Math.PI * 34;
  const met = doneToday >= goal;
  return (
    <section className={`x-slab x-lime ${s.streak}`} aria-label={`Streak ${streak} days. Daily goal ${doneToday} of ${goal} lessons.`}>
      <div className={s.streakTop}>
        <div className={s.flameWrap} data-hot={streak > 0 || undefined}>
          <Flame className={s.flame} aria-hidden />
          <span className={`x-fig ${s.streakN}`}>{streak}</span>
        </div>
        <div className={s.streakText}>
          <span className="x-lab">Day streak</span>
          <span className={s.streakNote}>{streak === 0 ? "Open a lesson today to start one." : streak === 1 ? "Day one. Come back tomorrow." : `Best run so far: ${best} days.`}</span>
        </div>
        <svg viewBox="0 0 80 80" className={s.goal} role="img" aria-label={`Daily goal: ${doneToday} of ${goal}`}>
          <circle cx="40" cy="40" r="34" className={s.goalTrack} />
          <circle cx="40" cy="40" r="34" className={s.goalFill} data-met={met || undefined} strokeDasharray={`${pct * C} ${C}`} transform="rotate(-90 40 40)" />
          <text x="40" y="38" textAnchor="middle" className={s.goalN}>
            {Math.min(doneToday, 99)}/{goal}
          </text>
          <text x="40" y="51" textAnchor="middle" className={s.goalL}>
            TODAY
          </text>
        </svg>
      </div>
      <ol className={s.week}>
        {days.map((d) => (
          <li key={d.key} data-on={d.on || undefined} data-today={d.today || undefined}>
            <i>{d.on ? <Check aria-hidden /> : null}</i>
            <span>{d.label}</span>
          </li>
        ))}
      </ol>
      <p className={s.goalNote}>{met ? "Daily goal met. Anything more is a bonus." : `Daily goal: ${goal} lesson${goal > 1 ? "s" : ""}. Finish ${goal - doneToday} more to fill the ring.`}</p>
    </section>
  );
}

/* ---------------------------------------------------------------- stats */

export function StatsCard({ lessons, assessments, certificates }: { lessons: number; assessments: number; certificates: number }) {
  const points = lessons * POINTS.lesson + assessments * POINTS.assessment + certificates * POINTS.certificate;
  const rows = [
    { label: "Lessons completed", n: lessons, each: POINTS.lesson, tone: "mint" },
    { label: "Assessments passed", n: assessments, each: POINTS.assessment, tone: "sand" },
    { label: "Certificates earned", n: certificates, each: POINTS.certificate, tone: "green" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.n * r.each));
  return (
    <section className={`x-slab x-night ${s.stats}`} aria-label="Your learning points">
      <span className="x-lab">Learning points</span>
      <span className={`x-fig ${s.points}`}>{points.toLocaleString("en-IN")}</span>
      <ul className={s.statRows}>
        {rows.map((r) => (
          <li key={r.label}>
            <span className={s.statLabel}>
              {r.label}
              <b>{r.n}</b>
            </span>
            <span className={s.statBar} data-tone={r.tone}>
              <i style={{ width: `${Math.max(3, ((r.n * r.each) / max) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className={s.rule}>
        {POINTS.lesson} per lesson · {POINTS.assessment} per assessment passed · {POINTS.certificate} per certificate
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- course path */

export interface PathModule {
  id: string;
  title: string;
  done: number;
  total: number;
}

const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

/** The course as a stepper of modules: finished, current (pulsing) and ahead, each with its lesson count. */
export function CoursePath({ course, href, resumeHref, modules }: { course: string; href: string; resumeHref: string; modules: PathModule[] }) {
  const current = modules.findIndex((m) => m.done < m.total);
  return (
    <section className={`x-slab x-surface ${s.path}`} aria-label={`${course}: course path`}>
      <div className={s.pathHead}>
        <div>
          <span className="x-lab">Your path</span>
          <h2 className={`x-display ${s.pathTitle}`}>{course}</h2>
        </div>
        <Link href={href} className={s.pathAll}>
          Full curriculum
        </Link>
      </div>
      <ol className={s.nodes}>
        {modules.slice(0, 10).map((m, i) => {
          const state = m.total > 0 && m.done === m.total ? "done" : i === current ? "now" : current >= 0 && i > current ? "ahead" : m.done > 0 ? "part" : "ahead";
          const side = OFFSETS[i % OFFSETS.length];
          const node = (
            <span className={s.node} data-state={state}>
              {state === "done" ? <Check aria-hidden /> : state === "now" ? <Play aria-hidden /> : state === "ahead" ? <Lock aria-hidden /> : <span>{i + 1}</span>}
              {state === "now" && <span className={s.ring} aria-hidden />}
            </span>
          );
          return (
            <li key={m.id} style={{ "--x": `${side}px`, animationDelay: `${i * 70}ms` } as React.CSSProperties} data-state={state}>
              {state === "now" ? (
                <Link href={resumeHref} className={s.nodeLink} aria-label={`Continue module ${i + 1}: ${m.title}`}>
                  {node}
                </Link>
              ) : (
                <Link href={href} className={s.nodeLink} aria-label={`Module ${i + 1}: ${m.title}, ${m.done} of ${m.total} lessons`}>
                  {node}
                </Link>
              )}
              <span className={s.nodeLabel} data-side={side >= 0 ? "right" : "left"}>
                <b>{m.title.replace(/^\d+\.\s*/, "")}</b>
                <small>
                  {m.done}/{m.total} lessons
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------- badges */

export interface Badge {
  id: string;
  name: string;
  hint: string;
  earned: boolean;
  tone: "mint" | "sand" | "green" | "night" | "coral";
  glyph: "spark" | "five" | "flame" | "week" | "check" | "flag" | "seal" | "level";
}

function Glyph({ g }: { g: Badge["glyph"] }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (g) {
    case "spark":
      return <path {...p} d="M20 8 v24 M8 20 h24 M12 12 l16 16 M28 12 l-16 16" />;
    case "five":
      return <text x="20" y="27" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">5</text>;
    case "flame":
      return <path {...p} d="M20 32 c-6 0 -9 -4 -9 -9 c0 -6 6 -8 6 -14 c4 2 6 6 6 9 c2 -1 3 -3 3 -5 c3 3 3 6 3 10 c0 5 -3 9 -9 9z" />;
    case "week":
      return <path {...p} d="M9 14 h22 v16 h-22z M9 19 h22 M15 10 v6 M25 10 v6" />;
    case "check":
      return <path {...p} d="M10 21 l7 7 l13 -15" />;
    case "flag":
      return <path {...p} d="M12 32 V9 M12 10 h15 l-4 5 l4 5 h-15" />;
    case "seal":
      return (
        <>
          <circle cx="20" cy="17" r="8" {...p} />
          <path {...p} d="M15 24 l-3 9 l8 -4 l8 4 l-3 -9" />
        </>
      );
    default:
      return <path {...p} d="M10 30 v-6 M17 30 v-11 M24 30 v-16 M31 30 v-21" />;
  }
}

export function Badges({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section className={`x-slab x-surface ${s.badges}`} aria-label={`Badges: ${earned} of ${badges.length} earned`}>
      <div className={s.badgeHead}>
        <span className="x-lab">Badges</span>
        <span className={s.badgeCount}>
          {earned}/{badges.length}
        </span>
      </div>
      <ul className={s.badgeGrid}>
        {badges.map((b, i) => (
          <li key={b.id} data-earned={b.earned || undefined} style={{ animationDelay: `${i * 50}ms` }} title={b.earned ? `${b.name}: earned` : `${b.name}: ${b.hint}`}>
            <span className={s.badge} data-tone={b.tone}>
              <svg viewBox="0 0 40 40" aria-hidden>
                <Glyph g={b.glyph} />
              </svg>
              {!b.earned && (
                <span className={s.lock}>
                  <Lock aria-hidden />
                </span>
              )}
            </span>
            <span className={s.badgeName}>{b.name}</span>
            <span className={s.badgeHint}>{b.earned ? "Earned" : b.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- helpers (server) */

/** Day keys in IST, newest last, and the current and best run of consecutive active days. */
export function streakOf(activeKeys: Set<string>, now = Date.now()) {
  const key = (t: number) => new Date(t + 5.5 * 3600_000).toISOString().slice(0, 10);
  let streak = 0;
  // A streak stays alive through today until midnight: count back from today, or from yesterday.
  let t = activeKeys.has(key(now)) ? now : now - 86400_000;
  while (activeKeys.has(key(t))) {
    streak++;
    t -= 86400_000;
  }
  let best = 0;
  let run = 0;
  for (let i = 59; i >= 0; i--) {
    if (activeKeys.has(key(now - i * 86400_000))) best = Math.max(best, ++run);
    else run = 0;
  }
  return { streak, best: Math.max(best, streak), key };
}
