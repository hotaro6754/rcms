/**
 * Atlas people: flat, faceless figures built from a circle and an arch, in the illustration
 * grammar of atlas.module.css (1.5px ink line, soft fills). Used on the career steps and the
 * team-training panel. Decorative; nearby text carries the meaning.
 */
import s from "./atlas.module.css";

const FILLS = [s.fSage, s.fSky, s.fSand, s.fBlush];

/** One standing figure in a 34 x 50 box. */
export function Person({ tone = 0, lead = false, className }: { tone?: number; lead?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 34 50" className={className} aria-hidden>
      <circle cx="17" cy="11" r="8" className={`${s.fSurface} ${s.ln}`} />
      <path d="M3 49 V33 A14 14 0 0 1 31 33 V49" className={`${lead ? s.fInk : FILLS[tone % 4]} ${s.ln}`} />
    </svg>
  );
}

/** A cohort around a table with a shared screen: the team-training illustration. */
export function Cohort() {
  return (
    <svg viewBox="0 0 420 300" className={s.teamsArt} role="img" aria-label="A team learning together around a table, with a shared lesson on screen">
      <rect width="420" height="300" rx="20" className={s.fBg} />
      <rect x="130" y="30" width="160" height="96" rx="8" className={`${s.fSurface} ${s.ln}`} />
      <path d="M146 50 H230 M146 64 H272 M146 78 H250 M146 92 H272" className={s.ln} />
      <rect x="240" y="96" width="34" height="18" rx="3" className={s.fWarm} />
      <path d="M210 126 V146" className={s.ln} />
      <rect x="70" y="210" width="280" height="22" rx="6" className={`${s.fSurface} ${s.ln}`} />
      {[84, 150, 236, 302].map((x, t) => (
        <g key={x}>
          <circle cx={x + 17} cy="168" r="13" className={`${s.fSurface} ${s.ln}`} />
          <path d={`M${x} 212 V198 A17 17 0 0 1 ${x + 34} 198 V212`} className={`${FILLS[t]} ${s.ln}`} />
        </g>
      ))}
      <rect x="98" y="196" width="26" height="14" rx="2" className={`${s.fSurface} ${s.ln}`} />
      <rect x="296" y="196" width="26" height="14" rx="2" className={`${s.fSurface} ${s.ln}`} />
      <g transform="translate(300 40)">
        <rect width="96" height="58" rx="10" className={`${s.fSurface} ${s.ln}`} />
        <text x="12" y="22" className={s.ann}>
          Cohort
        </text>
        <rect x="12" y="32" width="72" height="6" rx="3" className={s.fBg} />
        <rect x="12" y="32" width="50" height="6" rx="3" className={s.fTeal} />
        <text x="12" y="52" className={s.ann}>
          Module 03
        </text>
      </g>
      <g transform="translate(24 40)">
        <rect width="90" height="58" rx="10" className={`${s.fSurface} ${s.ln}`} />
        <text x="12" y="22" className={s.ann}>
          Assessment
        </text>
        <text x="12" y="46" className={s.annStrong} style={{ fontSize: 18 }}>
          Passed
        </text>
      </g>
    </svg>
  );
}

/** The close band's line drawing: the ten stages as an open loop. */
export function LoopArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <circle cx="200" cy="200" r="160" className={s.ln} strokeDasharray="4 8" />
      <circle cx="200" cy="200" r="110" className={s.ln} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={+(200 + 160 * Math.cos(a)).toFixed(2)} cy={+(200 + 160 * Math.sin(a)).toFixed(2)} r="10" className={s.ln} />;
      })}
    </svg>
  );
}
