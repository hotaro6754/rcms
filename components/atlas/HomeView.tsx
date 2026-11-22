import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, CircleDashed, FileCheck2, GraduationCap, ShieldCheck } from "lucide-react";
import { PreviewBar } from "@/components/site/PreviewBar";
import { getPageContent } from "@/lib/site/content";
import { homePage } from "@/lib/site/pages/home";
import { sitePage } from "@/lib/site/pages/site";
import { SYSTEM } from "@/lib/data/system";
import { CORPORATE, FAQ, MENTORING } from "@/lib/data/catalog";
import { ACTIONS, RCA } from "@/lib/data/governance";
import { CLIENT, METRICS, formatValue, health, type Health, type Metric } from "@/lib/data/telemetry";
import { jsonLd, organisationLd, pageMeta, siteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/brand";
import type { PublicLevel } from "@/lib/services/learning/public-catalog";
import { Nav } from "@/components/atlas/Nav";
import { LivelyHero } from "@/components/atlas/LivelyHero";
import { CycleScroll } from "@/components/atlas/CycleScroll";
import { Learn } from "@/components/atlas/Learn";
import { Inquiry } from "@/components/atlas/Inquiry";
import { Faq } from "@/components/atlas/Faq";
import { Notes } from "@/components/atlas/Notes";
import { Motion } from "@/components/atlas/Motion";
import { LevelEmblem } from "@/components/atlas/Actors";
import { Cohort, LoopArt, Person } from "@/components/atlas/Figures";
import { AtlasFooter } from "@/components/atlas/Chrome";
import s from "@/components/atlas/atlas.module.css";
import { Preloader } from "@/components/atlas/Preloader";
import { ArtPlate } from "@/components/atlas/ArtPlate";
import { ClaimJourney3D } from "@/components/atlas/ClaimJourney3D";
import type { SceneSpot } from "@/components/atlas/InfoScene";
import { SmoothScroll } from "@/components/atlas/SmoothScroll";
import phasesArt from "@/public/images/art3d/phases-stack.png";
import ladderArt from "@/public/images/art3d/level-ladder.png";
import denialArt from "@/public/images/art3d/denial-investigation.png";
import trainingArt from "@/public/images/art3d/team-training.png";
import lv from "@/components/atlas/lively.module.css";

/**
 * The homepage: "The Revenue Cycle Atlas" (research/ATLAS_BRIEF.md). Light-first, with a dark
 * theme from the same tokens. No stock photography: every illustration is original SVG.
 *
 *   hero      what RCMExcel is, and the map of who works each of the ten stages
 *   cycle     the ten stages, explained in order beside a ring that follows the reader
 *   paths     the levels, with live courses and prices from the catalogue
 *   learn     how a course works: watch, read, practise, prove, certify
 *   practice  the CO-50 investigation and the month-end review
 *   career    the six-rung ladder (learning progression, not a job promise)
 *   author    21 years, and one-to-one sessions
 *   teams     corporate and cohort training
 *   faq       real questions, real answers
 *
 * Teaching data is labelled illustrative wherever it appears.
 */

async function loadPaths(): Promise<PublicLevel[]> {
  try {
    const { publicPaths } = await import("@/lib/services/learning/public-catalog");
    return await publicPaths();
  } catch (error) {
    console.error("[home] learning paths unavailable", error);
    return [];
  }
}


const inr = (rupees: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pad = (n: number) => String(n).padStart(2, "0");

/* Hotspots for the 3D scenes. Positions are in the source image's pixels. */
const byPhase = (p: string) => SYSTEM.filter((x) => x.phase === p).map((x) => x.label).join(", ");
const HERO_SPOTS: SceneSpot[] = [
  { x: 165, y: 300, term: "Registration · 270/271", title: "Front desk", body: "Demographics and insurance are captured, eligibility is checked with a 270/271 inquiry, and prior authorisation is requested where the payer needs it." },
  { x: 480, y: 290, term: "CPT · ICD-10", title: "Charge capture and coding", body: "Each service becomes a charge, coded with CPT/HCPCS procedures and ICD-10-CM diagnoses that must agree with each other and with the record." },
  { x: 765, y: 300, term: "837", title: "Clearinghouse", body: "The claim is scrubbed for errors and sent to the payer as an 837 electronic claim. Rejections come back before the payer ever sees it." },
  { x: 1060, y: 280, term: "835 · CARC/RARC", title: "Payer adjudication", body: "The payer pays, adjusts or denies, and explains why on the 835 remittance with CARC and RARC codes, such as CO-50." },
  { x: 1370, y: 270, term: "Posting · A/R", title: "Revenue cycle team", body: "Payments are posted, denials are worked back to their root cause, and unpaid A/R is followed up until every claim is resolved." },
];
const PHASE_SPOTS: SceneSpot[] = [
  { x: 770, y: 190, term: "Front end · 270/271", title: "Before the visit", body: `${byPhase("Front end")}. Eligibility is checked with a 270/271 inquiry; most denials are born here.` },
  { x: 790, y: 420, term: "Middle · 837", title: "From service to claim", body: `${byPhase("Middle")}. CPT/HCPCS and ICD-10 codes go out on an 837 electronic claim.` },
  { x: 790, y: 700, term: "Back end · 835", title: "From payment to resolution", body: `${byPhase("Back end")}. The payer answers on an 835 remittance with CARC/RARC codes.` },
];
const RCA_SPOTS: SceneSpot[] = [
  { x: 470, y: 400, term: "CO-50 · N706", title: "The denied claim", body: RCA.statement },
  ...RCA.steps.slice(0, 5).map((st, i): SceneSpot => ({
    x: [770, 880, 975, 1045, 1112][i],
    y: [380, 470, 550, 610, 675][i],
    term: `Why ${i + 1}`,
    title: st.question,
    body: st.answer,
  })),
];
const TEAM_SPOTS: SceneSpot[] = [
  { x: 450, y: 290, term: "Manager view", title: "See your team's progress", body: CORPORATE.includes[1] },
  { x: 560, y: 520, term: "Seats · groups", title: "Assign the right courses", body: CORPORATE.includes[0] },
  { x: 690, y: 370, term: "Synthetic cases", title: "Practice on safe data", body: CORPORATE.includes[2] },
];
const SHORT = ["Registration", "Eligibility", "Auth", "Charges", "Coding", "Submission", "Remittance", "Posting", "A/R", "Denials"];
const HEALTH: Record<Health, { word: string; Icon: typeof CheckCircle2 }> = {
  "on-target": { word: "On target", Icon: CheckCircle2 },
  "at-risk": { word: "At risk", Icon: CircleDashed },
  breach: { word: "Breach", Icon: AlertTriangle },
};

function Status({ h }: { h: Health }) {
  const { word, Icon } = HEALTH[h];
  return (
    <span className={s.status} data-h={h}>
      <Icon aria-hidden /> {word}
    </span>
  );
}
function Line({ m, tone }: { m: Metric; tone: string }) {
  const lo = Math.min(...m.series, m.target);
  const hi = Math.max(...m.series, m.target);
  const y = (v: number) => 58 - ((v - lo) / (hi - lo || 1)) * 50;
  const pts = m.series.map((v, i) => `${(i / (m.series.length - 1)) * 300},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 300 64" className={s.chart} preserveAspectRatio="none" aria-hidden>
      <line x1="0" x2="300" y1={y(m.target)} y2={y(m.target)} stroke="var(--muted)" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
      <polyline points={pts} fill="none" stroke={tone} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" data-draw />
    </svg>
  );
}
function Bars({ m, tone }: { m: Metric; tone: string }) {
  const hi = Math.max(...m.series);
  return (
    <svg viewBox="0 0 300 64" className={s.chart} preserveAspectRatio="none" aria-hidden>
      <g data-rise>
        {m.series.map((v, i) => {
          const h = (v / hi) * 60;
          return <rect key={i} x={i * 50 + 8} y={64 - h} width="34" height={h} rx="5" fill={tone} opacity={i === m.series.length - 1 ? 1 : 0.35} />;
        })}
      </g>
    </svg>
  );
}

export async function HomeView({ variant = "stack" }: { variant?: "stack" | "compact" }) {
  const [c, site, levels] = await Promise.all([getPageContent(homePage), getPageContent(sitePage), loadPaths()]);
  // Stage levels use the five-step blueprint in lib/data/catalog.ts (LEVELS); the published
  // catalogue has four. Foundation maps to Beginner, RCM Operations and Operational Excellence to
  // Professional, Team Leadership and above to Leader (same mapping as components/home/SystemFlow).
  const taught = (lvl: number) => (lvl <= 1 ? c.system.levelNames.trainee : lvl <= 3 ? c.system.levelNames.professional : c.system.levelNames.leadership);
  const stages = SYSTEM.map((x, i) => ({
    label: c.system.stages[i]?.label ?? x.label,
    does: c.system.stages[i]?.does ?? x.does,
    breaks: c.system.stages[i]?.breaks ?? x.breaks,
    metric: c.system.stages[i]?.metric ?? x.metric,
    phase: x.phase,
    taught: taught(x.level),
  }));
  const lab = c.lab;
  const verdictOf = (v: string) => (v === "on-path" || v === "symptom" ? v : "dead-end") as "on-path" | "symptom" | "dead-end";
  const sla = METRICS["sla-adherence"];
  const dar = METRICS["days-in-ar"];
  const denial = METRICS["denial-rate"];
  const ar90 = METRICS["ar-over-90"];
  const rungs = c.people.roles;
  const levelCount = Math.max(levels.length, 1);
  const levelSpots: SceneSpot[] = levels.slice(0, 4).map((l, i) => ({
    x: [190, 450, 720, 1060][i],
    y: [560, 420, 250, 120][i],
    term: `Level ${String(l.sequence).padStart(2, "0")}`,
    title: l.displayTitle || l.name,
    body: l.shortDescription,
  }));

  return (
    <div className={s.root}>
      <Preloader />
      <SmoothScroll />
      <Motion />
      <Nav signIn={site.nav.signIn} cta={{ label: "Explore learning paths", href: "#paths" }} />

      <main id="top">
        {variant === "stack" ? (
          <ClaimJourney3D
            titleA="From RCM beginner"
            accent="to operations leader."
            lead="RCMExcel is a US healthcare revenue cycle academy. Follow one claim from the front desk to the bank, practise on real-shaped cases, and grow from your first claim to running the floor. Written from 21 years in RCM operations."
            primary={{ label: "Explore learning paths", href: "#paths" }}
            secondary={{ label: "Walk the ten stages", href: "#cycle" }}
            levels={levels.length ? levels.map((l) => l.name) : ["Beginner", "Professional", "Leader", "Executive Leadership"]}
            stages={SYSTEM.map((x) => ({ label: x.label, does: x.does, breaks: x.breaks, metric: x.metric, phase: x.phase }))}
          />
        ) : (
        <LivelyHero
            variant={variant}
            eyebrow="US healthcare revenue cycle academy"
            titleA="Every claim crosses ten desks"
            titleB="before anyone is paid."
            accent="Learn to run every one."
            lead="Video lessons, practice cases and an assessment at the end of every module, a certificate for every course you complete, verifiable by serial. Written from 21 years running US healthcare revenue cycle operations."
            primary={{ label: "Explore learning paths", href: "#paths" }}
            secondary={{ label: "Walk the ten stages", href: "#cycle" }}
            stages={stages.map((x) => x.label)}
            facts={[
              { value: "21", label: "Years in US RCM operations behind the curriculum" },
              { value: pad(SYSTEM.length), label: "Revenue-cycle stages, front end to back end" },
              { value: pad(levelCount), label: "Levels, from first claim to leading the floor" },
              { value: "1", label: "Assessment at the end of every module" },
            ]}
          />
        )}

        <div className={s.wrap}>
          <div className={s.trust}>
            <div>
              <GraduationCap aria-hidden color="var(--teal)" strokeWidth={1.5} />
              <div>
                <b>Written from the floor</b>
                <span>By V K Chakradhar Gangaraju, 21 years in US RCM operations.</span>
              </div>
            </div>
            <div>
              <FileCheck2 aria-hidden color="var(--teal)" strokeWidth={1.5} />
              <div>
                <b>Assessed, not just watched</b>
                <span>Every module ends in an assessment; every level in a final one.</span>
              </div>
            </div>
            <div>
              <CheckCircle2 aria-hidden color="var(--teal)" strokeWidth={1.5} />
              <div>
                <b>Certificates you can verify</b>
                <span>Each carries a serial anyone can check on this site.</span>
              </div>
            </div>
            <div>
              <ShieldCheck aria-hidden color="var(--teal)" strokeWidth={1.5} />
              <div>
                <b>Teaching data only</b>
                <span>No real patient, provider or payer data, anywhere.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────── the cycle ─────────── */}
        {c.system.show && (
          <section className={s.section} id="cycle">
            <div className={s.wrap}>
              <div className={s.head}>
                <div>
                  <span className={s.label} data-reveal>
                    The revenue cycle
                  </span>
                  <h2 className={s.h2} data-reveal>
                    Ten stages. <em>A claim has to clear every one.</em>
                  </h2>
                </div>
                <div style={{ display: "grid", gap: 20 }} data-reveal>
                  <p className={s.lead}>{c.system.lead}</p>
                  <ArtPlate src={phasesArt} ratio="4 / 3" alt="3D isometric diagram: three stacked platforms for the front end, middle and back end of the revenue cycle, joined by a ribbon carrying claim documents." />
                </div>
              </div>
              <CycleScroll stages={stages} />
            </div>
          </section>
        )}

        {/* ─────────── learning paths ─────────── */}
        {c.path.show && (
          <section className={`${s.section} ${s.band}`} id="paths">
            <div className={s.wrap}>
              <div className={s.head}>
                <div>
                  <span className={s.label} data-reveal>
                    Learning paths
                  </span>
                  <h2 className={s.h2} data-reveal>
                    Start where you work today. <em>Grow one level at a time.</em>
                  </h2>
                </div>
                <div style={{ display: "grid", gap: 14 }} data-reveal>
                  <p className={s.lead}>{c.path.lead}</p>
                  <Link href={c.path.compare.href} className={s.link}>
                    {c.path.compare.label} <ArrowRight aria-hidden />
                  </Link>
                  <ArtPlate src={ladderArt} ratio="4 / 3" alt="3D isometric staircase of four blocks, from a learner with a laptop to an executive boardroom." />
                </div>
              </div>
              {levels.length > 0 ? (
                <ol className={s.paths}>
                  {levels.map((l) => (
                    <li key={l.slug} className={s.path} data-reveal>
                      <div className={s.pathArt}>
                        <LevelEmblem n={l.sequence} total={levelCount} />
                        <div className={s.pathMeta}>
                          <span className={s.mono}>Level {pad(l.sequence)}</span>
                          {l.estimatedEffort && <span>{l.estimatedEffort}</span>}
                        </div>
                      </div>
                      <div>
                        <h3 className={s.pathName}>{l.displayTitle}</h3>
                        <p className={s.pathSub}>{l.audience ?? l.shortDescription}</p>
                        {l.outcomes.length > 0 && (
                          <ul className={s.outs}>
                            {l.outcomes.slice(0, 3).map((o) => (
                              <li key={o}>
                                <Check aria-hidden /> {o}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className={s.courseList}>
                        {l.courses.length > 0 ? (
                          l.courses.map((x) => (
                            <Link key={x.slug} href={`/catalog/${x.slug}`} className={s.course}>
                              <b>{x.name}</b>
                              <span>{x.price ? inr(x.price / 100) : x.isFree ? c.path.freeLabel : c.path.includedLabel}</span>
                            </Link>
                          ))
                        ) : (
                          <p className={s.pathSub}>{c.path.notReleased}</p>
                        )}
                        <Link href={`/catalog?level=${l.slug}`} className={s.link} style={{ marginTop: 6 }}>
                          {c.path.coursesButton} <ArrowRight aria-hidden />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={s.lead}>
                  {c.path.unavailable}{" "}
                  <Link href={c.path.unavailableLink.href} className={s.link}>
                    {c.path.unavailableLink.label}
                  </Link>
                </p>
              )}
            </div>
          </section>
        )}

        {/* ─────────── how a course works ─────────── */}
        <section className={s.section} id="how">
          <div className={s.wrap}>
            <div className={s.head}>
              <div>
                <span className={s.label} data-reveal>
                  How a course works
                </span>
                <h2 className={s.h2} data-reveal>
                  Learn it, practise it, <em>prove it.</em>
                </h2>
              </div>
              <p className={s.lead} data-reveal>
                Every course moves the same way, so you always know what is next and what it takes to finish. Materials are view-only inside the platform.
              </p>
            </div>
            <Learn />
          </div>
        </section>

        {/* ─────────── practice ─────────── */}
        {(lab.show || c.review.show) && (
          <section className={`${s.section} ${s.band}`} id="practice">
            <div className={s.wrap}>
              <div className={s.head}>
                <div>
                  <span className={s.label} data-reveal>
                    Practice, not theory
                  </span>
                  <h2 className={s.h2} data-reveal>
                    Work the case. <em>Then explain the number.</em>
                  </h2>
                </div>
                <div style={{ display: "grid", gap: 20 }} data-reveal>
                  <p className={s.lead}>{c.review.lead}</p>
                  <ArtPlate src={denialArt} ratio="4 / 3" alt="3D isometric scene: a magnifying glass over a denied claim and a chain of five cubes for the five whys, ending at the root cause." />
                </div>
              </div>
              <div className={s.practice}>
                <div className={`${s.card} ${s.case}`} data-reveal>
                  <div className={s.caseTags}>
                    <span className={s.tag}>
                      <i style={{ background: "var(--breach)" }} /> {lab.eyebrow}
                    </span>
                    <span className={s.tag}>Illustrative</span>
                  </div>
                  <h3 className={s.h3}>{lab.statement}</h3>
                  <dl className={s.caseFacts}>
                    <div>
                      <dt>{lab.codeLabel}</dt>
                      <dd data-bad>{RCA.subject.code}</dd>
                    </div>
                    <div>
                      <dt>{lab.claimsLabel}</dt>
                      <dd>{RCA.subject.claims}</dd>
                    </div>
                    <div>
                      <dt>{lab.valueLabel}</dt>
                      <dd>{usd(RCA.subject.value)}</dd>
                    </div>
                  </dl>
                  <Inquiry
                    c={{
                      prompt: lab.prompt,
                      idle: lab.idle,
                      choices: lab.choices.map((x) => ({ label: x.label, verdict: verdictOf(x.verdict), finding: x.finding })),
                      verdictLabels: { "on-path": lab.verdictLabels.onPath, symptom: lab.verdictLabels.symptom, "dead-end": lab.verdictLabels.deadEnd },
                      tags: { "on-path": lab.tags.onPath, symptom: lab.tags.symptom, "dead-end": lab.tags.deadEnd },
                      followButton: lab.followButton,
                      steps: lab.steps,
                      conclusion: lab.conclusion,
                    }}
                  />
                </div>

                <article className={`${s.card} ${s.report}`} data-reveal aria-label="Monthly operating review, illustrative">
                  <header className={s.reportHead}>
                    <span className={s.mono}>Monthly operating review · {CLIENT.reviewPeriod}</span>
                    <span className={s.mono}>{CLIENT.name} · illustrative</span>
                  </header>
                  {[
                    { m: sla, chart: <Line m={sla} tone="var(--teal)" />, unit: "" },
                    { m: dar, chart: <Bars m={dar} tone="var(--teal)" />, unit: " days" },
                    { m: denial, chart: <Line m={denial} tone="var(--breach)" />, unit: "" },
                    { m: ar90, chart: <Bars m={ar90} tone="var(--warm)" />, unit: "" },
                  ].map(({ m, chart, unit }) => (
                    <div key={m.id} className={s.kpi}>
                      <div className={s.kpiTop}>
                        <span>{m.label}</span>
                        <Status h={health(m)} />
                      </div>
                      <span className={s.kpiVal}>
                        {formatValue(m)}
                        {unit}
                        <small>target {formatValue(m, m.target)}</small>
                      </span>
                      {chart}
                    </div>
                  ))}
                  <div className={s.decide}>
                    <span className={s.mono}>{c.review.decisionsLabel}</span>
                    <ol>
                      {ACTIONS.slice(0, 3).map((a) => (
                        <li key={a.id}>
                          <span className={s.mono}>{a.id}</span>
                          <span>{a.action}</span>
                          <small>
                            {a.owner} · due {a.due}
                          </small>
                        </li>
                      ))}
                    </ol>
                  </div>
                </article>
              </div>
            </div>
          </section>
        )}

        {/* ─────────── career ─────────── */}
        {c.people.show && (
          <section className={s.section} id="career">
            <div className={s.wrap}>
              <div className={s.career}>
                <div style={{ display: "grid", gap: 16 }}>
                  <span className={s.label} data-reveal>
                    {c.people.runningHead}
                  </span>
                  <h2 className={s.h2} data-reveal>
                    {c.people.statement} <em>{c.people.statementSecond}</em>
                  </h2>
                  <p className={s.lead} data-reveal>
                    The levels follow the way an RCM career is organised, from owning your own output to owning a portfolio. They describe what each rung is trusted with; they are not a promise of a role.
                  </p>
                </div>
                <div>
                  <ol className={s.steps} data-rise>
                    {rungs.map((r, i) => {
                      const m = METRICS[r.metric];
                      return (
                        <li key={r.level} className={s.step} style={{ ["--i" as string]: i }} data-top={i === rungs.length - 1 || undefined}>
                          <Person tone={i} lead={i === rungs.length - 1} className={s.stepFig} />
                          <div>
                            <span className={s.mono}>{r.level}</span>
                            <b style={{ marginTop: 4 }}>{r.role}</b>
                          </div>
                          <small>
                            Owns {r.owns.charAt(0).toLowerCase() + r.owns.slice(1)} · {m.short}
                          </small>
                        </li>
                      );
                    })}
                  </ol>
                  <p className={s.disclaim}>Rung metrics come from the illustrative teaching engagement.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─────────── author + mentoring ─────────── */}
        {c.founder.show && (
          <section className={s.section} id="author" style={{ paddingTop: 0 }}>
            <div className={s.wrap}>
              <div className={s.author}>
                <div className={s.authorArt} data-reveal>
                  <svg viewBox="0 0 500 480" className={s.scene} aria-hidden preserveAspectRatio="xMidYMid slice">
                    <circle cx="330" cy="170" r="130" className={s.fSky} />
                    <circle cx="330" cy="170" r="84" className={`${s.fSurface} ${s.ln}`} />
                    {Array.from({ length: 10 }, (_, i) => {
                      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                      return <circle key={i} cx={+(330 + 84 * Math.cos(a)).toFixed(2)} cy={+(170 + 84 * Math.sin(a)).toFixed(2)} r="7" className={`${i < 7 ? s.fTeal : s.fSurface} ${s.ln}`} />;
                    })}
                    <path d="M330 126 V214 M286 170 H374" className={s.ln} strokeDasharray="3 5" />
                  </svg>
                  <span className={s.years}>{c.founder.years}</span>
                  <p className={s.yearsCap}>{c.founder.yearsCaption}</p>
                </div>
                <div className={`${s.card} ${s.authorBody}`} data-reveal>
                  <span className={s.label}>{c.founder.runningHead}</span>
                  <h2 className={s.h2} style={{ fontSize: "clamp(1.9rem, 3vw, 2.8rem)" }}>
                    {c.founder.title}
                  </h2>
                  <div>
                    <p className={s.authorName}>{c.founder.name}</p>
                    <p className={s.mono} style={{ marginTop: 6, color: "var(--muted)" }}>
                      {c.founder.focus}
                    </p>
                  </div>
                  {c.founder.body.map((p) => (
                    <p key={p.slice(0, 24)} style={{ color: "var(--text)" }}>
                      {p}
                    </p>
                  ))}
                  <dl className={s.areas}>
                    {c.founder.career.map((x) => (
                      <div key={x.title}>
                        <dt>{x.title}</dt>
                        <dd>{x.body}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link href={c.founder.cta.href} className={s.link}>
                    {c.founder.cta.label} <ArrowRight aria-hidden />
                  </Link>
                </div>
              </div>

              {c.mentoring.show && (
                <div className={s.sessions} id="mentoring">
                  <div className={s.head} style={{ margin: "28px 0 8px" }}>
                    <div>
                      <span className={s.label}>{c.mentoring.runningHead}</span>
                      <h2 className={s.h2} style={{ fontSize: "clamp(1.8rem, 2.8vw, 2.6rem)" }}>
                        {c.mentoring.title}
                      </h2>
                    </div>
                    <p className={s.lead}>{c.mentoring.calendarNote}</p>
                  </div>
                  {MENTORING.map((m) => (
                    <div key={m.id} className={s.session} data-reveal>
                      <span className={s.mono}>
                        {m.minutes} {c.mentoring.minutesLabel}
                      </span>
                      <b>{m.name}</b>
                      <p>
                        {m.who} You leave with {m.leaveWith.charAt(0).toLowerCase() + m.leaveWith.slice(1)}.
                      </p>
                      <span className={s.price}>{inr(m.price)}</span>
                      <Link href={`/contact?topic=${m.id}`} className={s.btnLine}>
                        {c.mentoring.requestLabel}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─────────── teams ─────────── */}
        <section className={s.section} id="teams" style={{ paddingTop: 0 }}>
          <div className={s.wrap}>
            <div className={`${s.card} ${s.teams}`} data-reveal>
              <div>
                <span className={s.label}>For organisations</span>
                <h2 className={s.h2} style={{ fontSize: "clamp(1.9rem, 3vw, 2.8rem)" }}>
                  {CORPORATE.headline}
                </h2>
                <p className={s.lead}>{CORPORATE.body}</p>
                <ul className={s.ticks}>
                  {CORPORATE.includes.map((x) => (
                    <li key={x}>
                      <Check aria-hidden /> {x}
                    </li>
                  ))}
                </ul>
                <div>
                  <Link href="/contact?topic=corporate" className={s.btn}>
                    Talk to us about a team <ArrowRight aria-hidden />
                  </Link>
                </div>
              </div>
              <ArtPlate src={trainingArt} ratio="4 / 3" alt="3D isometric training room: a trainer at a screen of process charts and a team at laptops." />
            </div>
          </div>
        </section>

        {/* ─────────── faq ─────────── */}
        <section className={s.section} id="faq" style={{ paddingTop: 0 }}>
          <div className={s.wrap}>
            <div className={s.faq}>
              <div>
                <span className={s.label}>Questions</span>
                <h2 className={s.h2}>What people ask before they start.</h2>
                <Link href="/contact" className={s.link}>
                  Ask us something else <ArrowRight aria-hidden />
                </Link>
              </div>
              <Faq items={FAQ} />
            </div>
          </div>
        </section>

        {/* ─────────── close ─────────── */}
        <section className={s.close} id="notes" aria-labelledby="close-title">
          <LoopArt className={s.closeArt} />
          <div className={s.closeGrid}>
            <div style={{ display: "grid", gap: 26 }}>
              <h2 className={s.closeTitle} id="close-title">
                The revenue cycle is complicated. <em>Learning it doesn&apos;t have to be.</em>
              </h2>
              <div className={s.heroCtas}>
                <Link href="#paths" className={s.btn}>
                  Explore learning paths <ArrowRight aria-hidden />
                </Link>
                <Link href="/pricing" className={s.btnLine}>
                  See pricing
                </Link>
              </div>
            </div>
            {site.notes.show && <Notes c={site.notes} />}
          </div>
        </section>
      </main>

      <AtlasFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@graph": [organisationLd(), { "@type": "WebSite", name: BRAND.name, url: siteUrl().origin }] }) }} />
      <PreviewBar />
    </div>
  );
}
