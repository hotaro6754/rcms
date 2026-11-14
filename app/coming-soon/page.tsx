import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BarsCast, Mascot } from "@/components/illustration/Bars";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";
import s from "./coming-soon.module.css";

/**
 * The only public page before launch (lib/launch.ts rewrites every other public address here).
 *
 * Deliberately collects nothing: no form, no analytics, no cookies, so there is no personal
 * data to account for until the privacy policy has been approved and published. The theme switch
 * remembers light or dark in this browser only (localStorage), which is not personal data. Copy
 * follows the positioning rules of the legal pack: an independent academy, no affiliation,
 * accreditation, mentoring, placement or outcome claims.
 */

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} — Opening soon` },
  description: "An independent academy for US Healthcare Revenue Cycle Management education. Opening soon.",
  robots: { index: false, follow: false, nocache: true },
};

const LEVELS = [
  { n: "01", name: "Beginner", line: "US Healthcare RCM foundation", tone: "x-mint" },
  { n: "02", name: "Professional", line: "Departmental process excellence", tone: "x-sand" },
  { n: "03", name: "Leader", line: "Department and operational management", tone: "x-green" },
  { n: "04", name: "Executive", line: "Strategic and business excellence", tone: "x-night" },
];

const CYCLE = ["Scheduling", "Eligibility", "Coding", "Charge entry", "Claim submit", "Denial", "Payment posting"];

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className={s.logo} aria-hidden>
      <rect x="5" y="17" width="5" height="10" rx="1.5" fill="var(--x-ink)" />
      <rect x="13" y="12" width="5" height="15" rx="1.5" fill="var(--x-ink)" />
      <rect x="21" y="7" width="5" height="20" rx="1.5" fill="var(--x-ink)" />
      <path d="M4 14 C 10 12, 16 8, 26 3" fill="none" stroke="var(--x-teal)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 2.5 L26.5 2.8 L25 7" fill="none" stroke="var(--x-teal)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ComingSoonPage() {
  const year = new Date().getFullYear();
  return (
    <div className={`rcx ${s.root}`}>
      <header className={s.top}>
        <span className={s.brand}>
          <Logo />
          <span>
            <span className={s.brandName}>RCMEXCEL</span>
            <span className={s.brandTag}>Learner to Leader</span>
          </span>
        </span>
        <span className={s.topEnd}>
          <span className={s.status}>
            <span className={s.pulse} aria-hidden />
            Opening soon
          </span>
          <ThemeSwitch compact />
        </span>
      </header>

      <main className={s.main}>
        {/* ---------- hero ---------- */}
        <section className={s.hero} aria-labelledby="cs-title">
          <div className={`x-slab x-surface ${s.heroCopy}`}>
            <p className="x-kicker">US Healthcare Revenue Cycle Management Education</p>
            <h1 id="cs-title" className={`x-display ${s.title}`}>
              From learner <em>to leader.</em>
            </h1>
            <p className={s.lede}>
              A specialist academy for the people who keep healthcare revenue moving, from a first day in patient access to running the business. Structured courses, a free
              editorial journal, and assessments set and marked by RCMExcel Academy.
            </p>
            <div className={s.heroFoot}>
              <span className="x-pill" data-tone="good">
                Four levels
              </span>
              <span className="x-pill" data-tone="watch">
                Video · Slides · Reading
              </span>
              <span className="x-pill" data-tone="plain">
                View-only, inside your account
              </span>
            </div>
          </div>
          <div className={`x-slab x-mint ${s.heroArt}`} aria-hidden>
            <span className="x-lab">The cast · one per level</span>
            <BarsCast className={s.cast} />
          </div>
        </section>

        {/* ---------- formats ---------- */}
        <section className={s.formats} aria-label="Every lesson in three formats">
          <div className={`x-slab x-night ${s.fmt}`}>
            <span className="x-lab">Watch</span>
            <div className={s.stage} aria-hidden>
              <span className={s.play} />
              <span className={s.scrub}>
                <i />
              </span>
            </div>
            <p className={s.fmtTitle}>Video lessons with the essentials</p>
          </div>
          <div className={`x-slab x-sand ${s.fmt}`}>
            <span className="x-lab">Review</span>
            <div className={s.slide} aria-hidden>
              <b />
              <em style={{ width: "82%" }} />
              <em style={{ width: "70%" }} />
              <em style={{ width: "58%" }} />
            </div>
            <p className={s.fmtTitle}>Slide decks in clear bullets</p>
          </div>
          <div className={`x-slab x-surface ${s.fmt}`}>
            <span className="x-lab">Read</span>
            <div className={s.page} aria-hidden>
              {[96, 88, 92, 74, 90, 84, 66].map((w, i) => (
                <em key={i} style={{ width: `${w}%` }} />
              ))}
            </div>
            <p className={s.fmtTitle}>Full study material, in depth</p>
          </div>
          <div className={`x-slab x-coral ${s.fmt} ${s.fmtNote}`}>
            <Mascot mood="thinking" className={s.fmtMascot} />
            <p>Learn the way that suits you. Every format stays one click away.</p>
          </div>
        </section>

        {/* ---------- ladder ---------- */}
        <section className={`x-slab x-surface ${s.ladder}`} aria-labelledby="cs-ladder">
          <div className={s.ladderHead}>
            <span className="x-lab">The Academy</span>
            <h2 id="cs-ladder" className={`x-display ${s.h2}`}>
              Four levels. <em>One ladder.</em>
            </h2>
            <p className={s.ladderLede}>Each level builds on the last: from how a claim moves, to how a department runs, to how the business performs.</p>
          </div>
          <ol className={s.levels}>
            {LEVELS.map((l, i) => (
              <li key={l.n} className={`${l.tone} ${s.level}`} style={{ "--lift": `${(3 - i) * 34}px`, "--i": i } as React.CSSProperties}>
                <span className={s.levelN}>Level {l.n}</span>
                <strong>{l.name}</strong>
                <span className={s.levelLine}>{l.line}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- cycle ---------- */}
        <section className={`x-slab x-green ${s.cycle}`} aria-labelledby="cs-cycle">
          <div className={s.cycleHead}>
            <span className="x-lab" style={{ color: "var(--x-on-green-2)" }}>
              The revenue cycle, step by step
            </span>
            <h2 id="cs-cycle" className={`x-display ${s.h2}`}>
              Every course follows the claim.
            </h2>
          </div>
          <ol className={s.path}>
            {CYCLE.map((c, i) => (
              <li key={c} data-state={c === "Denial" ? "x" : undefined} data-wide={i === CYCLE.length - 1 || undefined}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {c}
              </li>
            ))}
          </ol>
        </section>

        <dl className={s.pillars}>
          <div className="x-slab x-surface">
            <dt className="x-lab">Academy</dt>
            <dd>Paid, structured courses with module quizzes, final assessments and progress you can resume.</dd>
          </div>
          <div className="x-slab x-sand">
            <dt className="x-lab">Journal</dt>
            <dd>A free editorial publication on revenue cycle operations, analytics and leadership.</dd>
          </div>
          <div className="x-slab x-night">
            <dt className="x-lab">Media</dt>
            <dd>Short lessons and explainers on YouTube, Instagram and LinkedIn.</dd>
          </div>
        </dl>
      </main>

      <footer className={s.footer}>
        <p className={s.disclaimer}>
          RCMExcel is an independent educational platform. Its courses, assessments and awards are developed and administered by RCMExcel Academy. RCMExcel is not
          affiliated with, endorsed by or accredited by any government body, university, regulator, professional association or certification organisation. Educational
          content only — not legal, medical, coding-audit or payer-specific advice. RCMExcel does not offer mentoring, recruitment or job placement, and does not guarantee
          employment or career outcomes.
        </p>
        <div className={s.footRow}>
          <span>
            © {year} {BRAND.name}
          </span>
          <span>This page sets no cookies and collects no personal data.</span>
          <Link href="/sign-in" className={s.staff}>
            Staff sign-in
          </Link>
        </div>
      </footer>
    </div>
  );
}
