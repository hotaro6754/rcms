"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ExternalLink, Eye, Plus, Search, X } from "lucide-react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import type { Overview, DailyPoint, CourseRow } from "@/lib/services/reports/overview";
import s from "./command-center.module.css";

type MetricKey = "enrolments" | "active" | "completions" | "passRate" | "signups" | "revenue";
const RANGES = [7, 30, 90] as const;

const METRICS: { key: MetricKey; label: string; hint: string; empty: string; format: (n: number) => string }[] = [
  { key: "enrolments", label: "Enrolments", hint: "New course enrolments per day", empty: "No enrolments in this period", format: (n) => n.toLocaleString("en-IN") },
  { key: "active", label: "Active students", hint: "Students who opened a lesson, per day", empty: "No lesson activity in this period", format: (n) => n.toLocaleString("en-IN") },
  { key: "completions", label: "Lessons completed", hint: "Lessons marked complete per day", empty: "No completions in this period", format: (n) => n.toLocaleString("en-IN") },
  { key: "passRate", label: "Pass rate", hint: "Share of submitted attempts that passed", empty: "No assessments submitted yet", format: (n) => `${Math.round(n)}%` },
  { key: "signups", label: "New students", hint: "Student accounts created per day", empty: "No new students in this period", format: (n) => n.toLocaleString("en-IN") },
  { key: "revenue", label: "Revenue", hint: "Paid orders per day, INR", empty: "Payments not live yet", format: (n) => `₹${Math.round(n / 100).toLocaleString("en-IN")}` },
];
const metricOf = (k: MetricKey) => METRICS.find((m) => m.key === k)!;

function valueOf(points: DailyPoint[], key: MetricKey): number | null {
  if (key === "passRate") {
    const a = points.reduce((n, p) => n + p.attempts, 0);
    return a ? (points.reduce((n, p) => n + p.passed, 0) / a) * 100 : null;
  }
  if (key === "active") return points.length ? Math.max(0, ...points.map((p) => p.active)) : 0;
  return points.reduce((n, p) => n + (p[key] as number), 0);
}
const seriesOf = (points: DailyPoint[], key: MetricKey) => points.map((p) => (key === "passRate" ? (p.attempts ? (p.passed / p.attempts) * 100 : 0) : (p[key] as number)));
const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Change against the previous period, or null when there is nothing to compare with. */
function deltaOf(now: number | null, before: number | null) {
  if (now === null || !before) return null;
  return Math.round(((now - before) / before) * 100);
}

/** Bucket a long series into at most `n` bars so thin-line charts stay readable. */
function bucket(vals: number[], n: number) {
  if (vals.length <= n) return vals;
  const size = Math.ceil(vals.length / n);
  const out: number[] = [];
  for (let i = 0; i < vals.length; i += size) out.push(vals.slice(i, i + size).reduce((a, b) => a + b, 0));
  return out;
}

export function CommandCenter({ data, name }: { data: Overview; name?: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [metric, setMetric] = useState<MetricKey>("enrolments");
  const [level, setLevel] = useState<string | null>(null);
  const [openCourse, setOpenCourse] = useState<CourseRow | null>(null);
  const courses = level ? data.courses.filter((c) => c.level === level) : data.courses;
  const coverage = level ? data.coverage.filter((c) => c.level === level) : data.coverage;
  const current = data.daily.slice(-range);
  const previous = data.daily.slice(-range * 2, -range);
  const generated = new Date(data.generatedAt);
  const dateLine = generated.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const updated = generated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const hour = Number(generated.toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const tile = (key: MetricKey) => {
    const now = valueOf(current, key);
    const before = valueOf(previous, key);
    const empty = now === null || (now === 0 && (before ?? 0) === 0);
    return { now, empty, delta: empty ? null : deltaOf(now, before), series: seriesOf(current, key), m: metricOf(key) };
  };
  const act = tile("active");
  const enr = tile("enrolments");
  const pass = tile("passRate");
  const done = tile("completions");

  return (
    <div className={s.root}>
      <header className={s.head}>
        <div>
          <p className="x-kicker">
            {dateLine} · updated {updated} IST
          </p>
          <h1 className={`x-display ${s.title}`}>
            {name ? `${greet}, ${name}` : "Academy overview"}
          </h1>
          <p className={s.sub}>
            {data.totals.students.toLocaleString("en-IN")} students · {data.totals.liveCourses} of {data.totals.liveCourses + data.totals.draftCourses} courses published · {data.totals.lessonsWithContent} of {data.totals.lessons} lessons have content
          </p>
        </div>
        <div className={s.tools}>
          <form action="/admin/users" className={s.search} role="search">
            <Search aria-hidden />
            <label htmlFor="dash-search" className="sr-only">
              Find a student
            </label>
            <input id="dash-search" name="q" placeholder="Find a student" />
          </form>
          <div role="radiogroup" aria-label="Period" className={s.seg}>
            {RANGES.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}>
                {r}D
              </button>
            ))}
          </div>
          <Link href="/admin/content" className={s.cta}>
            <Plus aria-hidden /> Add content
          </Link>
        </div>
      </header>

      <div className={s.grid}>
        {/* ---------- four figure slabs ---------- */}
        <button type="button" className={`x-slab x-night ${s.k} ${s.g3}`} aria-pressed={metric === "active"} onClick={() => setMetric("active")}>
          <span className={s.kHead}>
            <span className="x-lab">Active students</span>
            <span className={s.dotBtn} aria-hidden>
              <ArrowUpRight />
            </span>
          </span>
          <span className={`x-fig ${s.kN}`}>{act.empty ? "—" : <CountUp value={act.now!} format={act.m.format} />}</span>
          <Spark values={act.series} />
          <Delta d={act.delta} range={range} empty={act.empty ? act.m.empty : null} tone="night" />
        </button>

        <button type="button" className={`x-slab x-surface ${s.k} ${s.g3}`} aria-pressed={metric === "enrolments"} onClick={() => setMetric("enrolments")}>
          <span className="x-lab">Enrolments</span>
          <span className={`x-fig ${s.kN}`}>{enr.empty ? "—" : <CountUp value={enr.now!} format={enr.m.format} />}</span>
          <Lines values={bucket(enr.series, 24)} />
          <Delta d={enr.delta} range={range} empty={enr.empty ? enr.m.empty : null} />
        </button>

        <button type="button" className={`x-slab x-mint ${s.k} ${s.g3}`} aria-pressed={metric === "passRate"} onClick={() => setMetric("passRate")}>
          <span className="x-lab">Assessment pass rate</span>
          <span className={s.ringRow}>
            <span className={`x-fig ${s.kN}`}>{pass.empty ? "—" : <CountUp value={pass.now!} format={pass.m.format} />}</span>
            <Ring pct={pass.empty ? 0 : pass.now!} />
          </span>
          <Delta d={pass.delta} range={range} empty={pass.empty ? pass.m.empty : null} unit="pts" />
        </button>

        <button type="button" className={`x-slab x-sand ${s.k} ${s.g3}`} aria-pressed={metric === "completions"} onClick={() => setMetric("completions")}>
          <span className={s.kHead}>
            <span className="x-lab">Lessons completed</span>
            <span className={s.plusDot} aria-hidden>
              <Plus />
            </span>
          </span>
          <span className={`x-fig ${s.kN}`}>{done.empty ? "—" : <CountUp value={done.now!} format={done.m.format} />}</span>
          <Lines values={bucket(done.series, 16)} tone="sand" />
          <span className={s.kNote}>{data.totals.certificates.toLocaleString("en-IN")} certificates issued in total</span>
        </button>

        {/* ---------- story chart + exceptions ---------- */}
        <section className={`x-slab x-surface ${s.g8}`} aria-labelledby="trend-title">
          <div className={s.panelHead}>
            <div>
              <h2 id="trend-title" className="x-lab">
                {metricOf(metric).label}
              </h2>
              <p className={s.note}>{metricOf(metric).hint}</p>
            </div>
            <p className={`x-fig ${s.bigVal}`}>
              {(() => {
                const v = valueOf(current, metric);
                return v === null ? "—" : metricOf(metric).format(v);
              })()}
            </p>
          </div>
          <div className={s.metricTabs} role="tablist" aria-label="Measure">
            {METRICS.map((m) => (
              <button key={m.key} type="button" role="tab" aria-selected={m.key === metric} onClick={() => setMetric(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <Columns key={`${metric}-${range}`} points={current} metric={metric} format={metricOf(metric).format} />
        </section>

        <section className={`x-slab x-surface ${s.g4}`} aria-labelledby="attention-title">
          <div className={s.panelHead}>
            <h2 id="attention-title" className="x-lab">
              Needs a look
            </h2>
            <span className="x-kicker">{data.insights.filter((i) => i.tone !== "good").length} open</span>
          </div>
          <ul className={s.exc}>
            {data.insights.map((i) => (
              <li key={i.title}>
                <span className={s.excDot} data-tone={i.tone} aria-hidden />
                <div className={s.excText}>
                  <p className={s.excTitle}>{i.title}</p>
                  <p className={s.note}>{i.body}</p>
                </div>
                {i.href ? (
                  <Link href={i.href} className="x-pill" data-tone={i.tone}>
                    {i.tone === "act" ? "Act" : i.tone === "watch" ? "Review" : "Open"}
                  </Link>
                ) : (
                  <span className="x-pill" data-tone={i.tone}>
                    {i.tone === "act" ? "Act" : i.tone === "watch" ? "Watch" : "OK"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- journey + level mix ---------- */}
        <section className={`x-slab x-surface ${s.g6}`} aria-labelledby="journey-title">
          <div className={s.panelHead}>
            <h2 id="journey-title" className="x-lab">
              Student journey
            </h2>
            <span className="x-kicker">All time</span>
          </div>
          <Funnel steps={data.funnel} />
        </section>

        <section className={`x-slab x-surface ${s.g6}`} aria-labelledby="levels-title">
          <div className={s.panelHead}>
            <h2 id="levels-title" className="x-lab">
              Enrolled by level
            </h2>
            <span className="x-kicker">All courses</span>
          </div>
          <LevelDonut rows={data.courses} selected={level} onSelect={setLevel} />
        </section>

        {/* ---------- content readiness ---------- */}
        <section id="coverage" className={`x-slab x-surface ${s.g12}`} aria-labelledby="map-title">
          <div className={s.panelHead}>
            <div>
              <h2 id="map-title" className="x-lab">
                Content readiness
              </h2>
              <p className={s.note}>Each block is a module; its three cells are video, slides and reading. Darker means more of its lessons have that format. Select a module to open it.</p>
            </div>
            <p className={s.legend}>
              0%
              {[0.01, 0.34, 0.67, 1].map((v) => (
                <i key={v} style={{ background: heat(v) }} />
              ))}
              100%
            </p>
          </div>
          <ContentMap cells={coverage} />
        </section>

        {/* ---------- ledger ---------- */}
        <section className={`x-slab x-surface ${s.g12}`} aria-labelledby="courses-title">
          <CourseTable rows={courses} level={level} onClearLevel={() => setLevel(null)} onOpen={setOpenCourse} />
          {openCourse && <CourseDrawer row={openCourse} cells={data.coverage.filter((c) => c.courseId === openCourse.id)} onClose={() => setOpenCourse(null)} />}
        </section>

        {/* ---------- activity + totals ---------- */}
        <section className={`x-slab x-surface ${s.g8}`} aria-labelledby="activity-title">
          <div className={s.panelHead}>
            <h2 id="activity-title" className="x-lab">
              Activity
            </h2>
            <Link href="/admin/subscribers" className={s.textLink}>
              All students
            </Link>
          </div>
          {data.activity.length === 0 ? (
            <p className={s.note}>Nothing yet. Enrolments, completed lessons, assessments and certificates are listed here as they happen.</p>
          ) : (
            <ul className={s.feed}>
              {data.activity.map((a) => (
                <li key={a.id}>
                  <span className={s.feedIcon} data-kind={a.kind} aria-hidden />
                  <div className={s.excText}>
                    <p>
                      <Link href={a.href ?? "#"} className={s.rowLink}>
                        {a.who}
                      </Link>{" "}
                      <span className={s.feedWhat}>{a.what}</span>
                    </p>
                  </div>
                  <time dateTime={a.at} className={s.feedTime}>
                    {ago(a.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`x-slab x-night ${s.g4} ${s.totals}`} aria-label="Academy totals">
          <span className="x-lab">Academy at a glance</span>
          <dl>
            <div>
              <dt>Students</dt>
              <dd className="x-fig">{data.totals.students.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Active, 14 days</dt>
              <dd className="x-fig">{data.totals.activeStudents.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Live courses</dt>
              <dd className="x-fig">{data.totals.liveCourses}</dd>
            </div>
            <div>
              <dt>Certificates</dt>
              <dd className="x-fig">{data.totals.certificates.toLocaleString("en-IN")}</dd>
            </div>
          </dl>
          <div className={s.coverBar} aria-label={`${data.totals.lessonsWithContent} of ${data.totals.lessons} lessons have content`}>
            <span style={{ width: `${data.totals.lessons ? (data.totals.lessonsWithContent / data.totals.lessons) * 100 : 0}%` }} />
          </div>
          <span className={s.kNote}>
            {data.totals.lessonsWithContent} of {data.totals.lessons} lessons have content
          </span>
        </section>
      </div>
    </div>
  );
}

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

function Delta({ d, range, empty, tone, unit = "%" }: { d: number | null; range: number; empty: string | null; tone?: "night"; unit?: string }) {
  if (empty) return <span className={s.kNote}>{empty}</span>;
  if (d === null) return <span className={s.kNote}>New in the last {range} days</span>;
  return (
    <span className={s.delta} data-dir={d >= 0 ? "up" : "down"} data-tone={tone}>
      {d >= 0 ? "+" : "−"}
      {Math.abs(d)}
      {unit === "%" ? "%" : ` ${unit}`} vs previous {range} days
    </span>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  if (!values.length) return <span className={s.sparkEmpty} />;
  const W = 200;
  const H = 46;
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (W - 6) + 3, H - 4 - (v / max) * (H - 10)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={s.spark} aria-hidden>
      <path d={d} className={s.sparkLine} />
      <circle cx={last[0]} cy={last[1]} r="3.5" className={s.sparkDot} />
    </svg>
  );
}

function Lines({ values, tone }: { values: number[]; tone?: "sand" }) {
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  return (
    <span className={s.lines} data-tone={tone} aria-hidden>
      {values.map((v, i) => (
        <i key={i} data-peak={i === peak && v > 0 ? "" : undefined} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
    </span>
  );
}

function Ring({ pct }: { pct: number }) {
  const c = 2 * Math.PI * 30;
  return (
    <svg viewBox="0 0 76 76" className={s.ring} aria-hidden>
      <circle cx="38" cy="38" r="30" className={s.ringTrack} />
      <circle cx="38" cy="38" r="30" className={s.ringFill} strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`} transform="rotate(-90 38 38)" />
    </svg>
  );
}

/** Rounded columns, one per day, peak in the data colour; hover or focus a day for its value. */
function Columns({ points, metric, format }: { points: DailyPoint[]; metric: MetricKey; format: (n: number) => string }) {
  const vals = seriesOf(points, metric);
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(...vals, 0);
  if (peak === 0) return <p className={s.chartEmpty}>Nothing recorded for this measure in the period yet.</p>;
  const peakAt = vals.indexOf(peak);
  const labelEvery = Math.ceil(points.length / 6);
  return (
    <div className={s.colsWrap}>
      <div className={s.cols} role="img" aria-label={`${metricOf(metric).label} per day over ${points.length} days, highest ${format(peak)} on ${shortDay(points[peakAt].day)}`} onMouseLeave={() => setHover(null)}>
        {vals.map((v, i) => (
          <span
            key={points[i].day}
            className={s.col}
            data-peak={i === peakAt ? "" : undefined}
            data-on={hover === i ? "" : undefined}
            onMouseEnter={() => setHover(i)}
            style={{ height: `${Math.max(2, (v / peak) * 100)}%` }}
          >
            {(hover === i || (hover === null && i === peakAt)) && (
              <em className={s.tip} data-edge={i < 3 ? "start" : i > vals.length - 4 ? "end" : undefined}>
                {shortDay(points[i].day)} · {format(v)}
              </em>
            )}
          </span>
        ))}
      </div>
      <div className={s.axis} aria-hidden>
        {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1 ? <span key={p.day}>{shortDay(p.day)}</span> : null))}
      </div>
      <details className={s.tableView}>
        <summary>View as table</summary>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Day</th>
              <th className={s.num}>Value</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={p.day}>
                <td>{shortDay(p.day)}</td>
                <td className={s.num}>{format(vals[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className={s.funnel}>
      {steps.map((st, i) => {
        const conv = i > 0 && steps[i - 1].value ? Math.round((st.value / steps[i - 1].value) * 100) : null;
        return (
          <li key={st.label}>
            <span className={s.fLabel}>{st.label}</span>
            <span className={s.fTrack}>
              <span className={s.fBar} style={{ width: `${Math.max(3, (st.value / top) * 100)}%`, animationDelay: `${i * 90}ms` }} data-step={i} />
            </span>
            <span className={`x-fig ${s.fNum}`}>{st.value.toLocaleString("en-IN")}</span>
            <span className={s.fConv}>{conv === null ? "" : `${conv}%`}</span>
          </li>
        );
      })}
    </ol>
  );
}

const LEVEL_COLOURS = ["var(--x-data)", "var(--x-green)", "var(--x-mint-strong)", "var(--x-sand-strong)"];

function LevelDonut({ rows, selected, onSelect }: { rows: CourseRow[]; selected: string | null; onSelect: (l: string | null) => void }) {
  const levels = useMemo(() => {
    const m = new Map<string, { level: string; seq: number; n: number }>();
    for (const r of rows) {
      const e = m.get(r.level) ?? { level: r.level, seq: r.levelSeq, n: 0 };
      e.n += r.enrolled;
      m.set(r.level, e);
    }
    return [...m.values()].sort((a, b) => a.seq - b.seq);
  }, [rows]);
  const total = levels.reduce((n, l) => n + l.n, 0);
  if (!total) return <p className={s.note}>No enrolments yet. The mix of levels appears here once students join courses.</p>;
  const C = 2 * Math.PI * 40;
  let offset = 0;
  return (
    <div className={s.donutWrap}>
      <svg viewBox="0 0 100 100" className={s.donut} role="img" aria-label={levels.map((l) => `${l.level} ${Math.round((l.n / total) * 100)}%`).join(", ")}>
        <g transform="rotate(-90 50 50)" fill="none" strokeWidth="14">
          {levels.map((l, i) => {
            const len = (l.n / total) * C;
            const el = (
              <circle
                key={l.level}
                cx="50"
                cy="50"
                r="40"
                stroke={LEVEL_COLOURS[i % 4]}
                strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`}
                strokeDashoffset={-offset}
                className={s.seg}
                data-dim={selected && selected !== l.level ? "" : undefined}
                onClick={() => onSelect(selected === l.level ? null : l.level)}
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="50" y="50" textAnchor="middle" className={s.donutN}>
          {(selected ? levels.find((l) => l.level === selected)?.n ?? 0 : total).toLocaleString("en-IN")}
        </text>
        <text x="50" y="62" textAnchor="middle" className={s.donutL}>
          ENROLLED
        </text>
      </svg>
      <ul className={s.dl}>
        {levels.map((l, i) => (
          <li key={l.level}>
            <button type="button" aria-pressed={selected === l.level} data-dim={selected && selected !== l.level ? "" : undefined} onClick={() => onSelect(selected === l.level ? null : l.level)}>
              <i style={{ background: LEVEL_COLOURS[i % 4] }} />
              {l.level}
              <b>{Math.round((l.n / total) * 100)}%</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Sequential ramp in the green (one hue, light to dark). */
function heat(v: number) {
  if (v <= 0) return "var(--x-sunken)";
  return `color-mix(in srgb, var(--x-mint-ink) ${[24, 46, 70, 100][Math.min(3, Math.floor(v * 3.999))]}%, var(--x-surface))`;
}

function ContentMap({ cells }: { cells: Overview["coverage"] }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const byCourse = useMemo(() => {
    const m = new Map<string, Overview["coverage"]>();
    for (const c of cells) m.set(c.courseId, [...(m.get(c.courseId) ?? []), c]);
    return [...m.values()];
  }, [cells]);
  if (!cells.length) return <p className={s.note}>No modules yet.</p>;
  const show = (e: React.SyntheticEvent<HTMLElement>, text: string) => {
    const box = (e.currentTarget.closest("[data-map]") as HTMLElement).getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left - box.left + r.width / 2, y: r.top - box.top, text });
  };
  return (
    <div className={s.map} data-map onMouseLeave={() => setTip(null)}>
      {byCourse.map((mods) => {
        const pct = (k: "video" | "slides" | "reading") => {
          const t = mods.reduce((n, m) => n + m.lessons, 0);
          return t ? Math.round((mods.reduce((n, m) => n + m[k], 0) / t) * 100) : 0;
        };
        return (
          <div key={mods[0].courseId} className={s.mapRow}>
            <div className={s.mapLabel}>
              <span className={s.mapCourse}>{mods[0].course}</span>
              <span className={s.note}>
                {mods[0].level} · video {pct("video")}% · slides {pct("slides")}% · reading {pct("reading")}%
              </span>
            </div>
            <div className={s.mapCells}>
              {mods.map((m, i) => {
                const r = (n: number) => (m.lessons ? n / m.lessons : 0);
                const text = `Module ${i + 1}: ${m.module.replace(/^\d+\.\s*/, "")}. Video ${m.video} of ${m.lessons}, slides ${m.slides} of ${m.lessons}, reading ${m.reading} of ${m.lessons}.`;
                return (
                  <Link key={m.moduleId} href={`/admin/content/courses/${m.courseId}?item=module:${m.moduleId}`} className={s.mod} aria-label={text} onMouseEnter={(e) => show(e, text)} onFocus={(e) => show(e, text)}>
                    <i style={{ background: heat(r(m.video)) }} />
                    <i style={{ background: heat(r(m.slides)) }} />
                    <i style={{ background: heat(r(m.reading)) }} />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      {tip && (
        <div className={s.mapTip} style={{ left: tip.x, top: tip.y }} role="status">
          {tip.text}
        </div>
      )}
    </div>
  );
}

type SortKey = "name" | "enrolled" | "active14" | "avgProgress" | "passRate" | "completed";

function CourseTable({ rows, level: fixed, onClearLevel, onOpen }: { rows: CourseRow[]; level: string | null; onClearLevel: () => void; onOpen: (r: CourseRow) => void }) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("All levels");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "enrolled", dir: -1 });
  const levels = ["All levels", ...Array.from(new Set([...rows].sort((a, b) => a.levelSeq - b.levelSeq).map((r) => r.level)))];
  const shown = [...rows]
    .filter((r) => (level === "All levels" || r.level === level) && r.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => {
      const av = a[sort.key] ?? -1;
      const bv = b[sort.key] ?? -1;
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
    });
  const th = (key: SortKey, label: string, num = true) => (
    <th className={num ? s.num : undefined} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((x) => ({ key, dir: x.key === key ? ((x.dir * -1) as 1 | -1) : -1 }))}>
        {label}
        <span aria-hidden className={s.sortMark}>
          {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
  return (
    <>
      <div className={s.panelHead}>
        <div className={s.ledgerHead}>
          <h2 id="courses-title" className="x-lab">
            Course ledger
          </h2>
          {fixed && (
            <button type="button" className={s.chip} onClick={onClearLevel}>
              {fixed} <X aria-hidden />
            </button>
          )}
          <span className={s.hint}>Select a row for details</span>
        </div>
        <div className={s.tools}>
          <label className="sr-only" htmlFor="lvl">
            Level
          </label>
          <select id="lvl" value={level} onChange={(e) => setLevel(e.target.value)} className={s.select}>
            {levels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="cq">
            Search courses
          </label>
          <input id="cq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" className={s.input} />
        </div>
      </div>
      <div className={s.tableScroll}>
        <table className={s.table}>
          <thead>
            <tr>
              {th("name", "Course", false)}
              <th>Status</th>
              {th("enrolled", "Enrolled")}
              {th("active14", "Active, 14 days")}
              {th("avgProgress", "Average progress")}
              {th("passRate", "Pass rate")}
              {th("completed", "Completed")}
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={s.clickRow} onClick={(e) => { if (!(e.target as HTMLElement).closest("a, button")) onOpen(r); }}>
                <td>
                  <Link href={`/admin/content/courses/${r.id}`} className={s.rowLink}>
                    {r.name}
                  </Link>
                  <span className={s.subline}>
                    {r.level} · {r.lessons} lessons
                  </span>
                </td>
                <td>
                  <span className="x-pill" data-tone={r.live ? "good" : "plain"}>
                    {r.live ? `Live · v${r.version}` : "Not published"}
                  </span>
                </td>
                <td className={s.num}>{r.enrolled}</td>
                <td className={s.num}>{r.active14}</td>
                <td className={s.num}>
                  <span className={s.meter} aria-hidden>
                    <span style={{ width: `${r.avgProgress}%` }} />
                  </span>
                  {r.avgProgress}%
                </td>
                <td className={s.num}>{r.passRate === null ? "—" : `${r.passRate}%`}</td>
                <td className={s.num}>{r.completed}</td>
                <td className={s.num}>
                  <Link href={`/admin/content/courses/${r.id}/preview`} className={s.textLink}>
                    Preview
                  </Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className={s.muted}>
                  No courses match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** A figure that counts to its new value when it changes (period or measure switch). */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      return;
    }
    const ctrl = animate(from.current, value, { duration: 0.8, ease: [0.2, 0, 0.1, 1], onUpdate: (v) => (el.textContent = format(v)) });
    from.current = value;
    return () => ctrl.stop();
  }, [value, format, reduce]);
  return <span ref={ref}>{format(value)}</span>;
}

/** Course detail without leaving the overview: figures, module coverage and the way in. */
function CourseDrawer({ row, cells, onClose }: { row: CourseRow; cells: Overview["coverage"]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const fmt = (k: "video" | "slides" | "reading") => {
    const t = cells.reduce((n, m) => n + m.lessons, 0);
    return t ? Math.round((cells.reduce((n, m) => n + m[k], 0) / t) * 100) : 0;
  };
  const figures = [
    { label: "Enrolled", value: row.enrolled.toLocaleString("en-IN") },
    { label: "Active, 14 days", value: row.active14.toLocaleString("en-IN") },
    { label: "Average progress", value: `${row.avgProgress}%` },
    { label: "Pass rate", value: row.passRate === null ? "—" : `${row.passRate}%` },
    { label: "Completed", value: row.completed.toLocaleString("en-IN") },
    { label: "Lessons", value: row.lessons.toLocaleString("en-IN") },
  ];
  return (
    <AnimatePresence>
      <motion.div key="scrim" className={s.scrim} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        key="drawer"
        className={s.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`${row.name}: details`}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className={s.drawerHead}>
          <div>
            <p className="x-kicker">
              {row.level} · {row.live ? `Live · v${row.version}` : "Not published"}
            </p>
            <h3 className={`x-display ${s.drawerTitle}`}>{row.name}</h3>
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label="Close" autoFocus>
            <X aria-hidden />
          </button>
        </div>
        <dl className={s.drawerFigs}>
          {figures.map((f, i) => (
            <motion.div key={f.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.03 }}>
              <dt>{f.label}</dt>
              <dd className="x-fig">{f.value}</dd>
            </motion.div>
          ))}
        </dl>
        <div className={s.drawerBlock}>
          <span className="x-lab">Formats across lessons</span>
          {(["video", "slides", "reading"] as const).map((k) => (
            <div key={k} className={s.fmtRow}>
              <span>{k[0].toUpperCase() + k.slice(1)}</span>
              <span className={s.fmtTrack}>
                <motion.i initial={{ width: 0 }} animate={{ width: `${fmt(k)}%` }} transition={{ duration: 0.7, delay: 0.15 }} />
              </span>
              <b>{fmt(k)}%</b>
            </div>
          ))}
        </div>
        <div className={s.drawerBlock}>
          <span className="x-lab">Modules</span>
          <ol className={s.modList}>
            {cells.map((m, i) => (
              <li key={m.moduleId}>
                <span className={s.modN}>{String(i + 1).padStart(2, "0")}</span>
                <Link href={`/admin/content/courses/${row.id}?item=module:${m.moduleId}`}>{m.module.replace(/^\d+\.\s*/, "")}</Link>
                <span className={s.modDots} aria-label={`video ${m.video}, slides ${m.slides}, reading ${m.reading} of ${m.lessons}`}>
                  <i style={{ background: heat(m.lessons ? m.video / m.lessons : 0) }} />
                  <i style={{ background: heat(m.lessons ? m.slides / m.lessons : 0) }} />
                  <i style={{ background: heat(m.lessons ? m.reading / m.lessons : 0) }} />
                </span>
              </li>
            ))}
            {cells.length === 0 && <li className={s.note}>No modules yet.</li>}
          </ol>
        </div>
        <div className={s.drawerActions}>
          <Link href={`/admin/content/courses/${row.id}`} className={s.cta}>
            <ExternalLink aria-hidden /> Open in the course editor
          </Link>
          <Link href={`/admin/content/courses/${row.id}/preview`} className={s.ghostBtn}>
            <Eye aria-hidden /> Preview as a learner
          </Link>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
