/**
 * The Atlas cast: the five parties a claim passes between, drawn as flat vignettes with a
 * single ink line and soft fills (tokens from atlas.module.css, so they follow the theme).
 * Each vignette is drawn in a 100 x 96 box; place it with a transform.
 */
import s from "./atlas.module.css";

export type ActorId = "frontdesk" | "clinic" | "clearinghouse" | "payer" | "billing";

export function Actor({ id }: { id: ActorId }) {
  switch (id) {
    case "frontdesk":
      return (
        <g>
          <rect width="100" height="96" rx="16" className={s.fSage} />
          {/* desk */}
          <rect x="10" y="62" width="80" height="22" rx="3" className={`${s.fSurface} ${s.ln}`} />
          {/* patient */}
          <circle cx="32" cy="34" r="9" className={`${s.fSurface} ${s.ln}`} />
          <path d="M18 62 V56 A14 14 0 0 1 46 56 V62" className={`${s.fSky} ${s.ln}`} />
          {/* staff */}
          <circle cx="70" cy="38" r="8" className={`${s.fSurface} ${s.ln}`} />
          <path d="M58 62 V58 A12 12 0 0 1 82 58 V62" className={`${s.fSand} ${s.ln}`} />
          {/* insurance card */}
          <rect x="40" y="66" width="22" height="14" rx="2" className={`${s.fSurface} ${s.ln}`} />
          <path d="M44 71 H55 M44 75 H51" className={s.ln} />
        </g>
      );
    case "clinic":
      return (
        <g>
          <rect width="100" height="96" rx="16" className={s.fSky} />
          {/* monitor with codes */}
          <rect x="40" y="22" width="48" height="34" rx="3" className={`${s.fSurface} ${s.ln}`} />
          <path d="M45 30 H64 M45 36 H80 M45 42 H70 M45 48 H76" className={s.ln} />
          <path d="M64 56 V64 M54 64 H74" className={s.ln} />
          {/* coder */}
          <circle cx="24" cy="40" r="9" className={`${s.fSurface} ${s.ln}`} />
          <path d="M10 76 V68 A14 14 0 0 1 38 68 V76" className={`${s.fSage} ${s.ln}`} />
          {/* stethoscope hint */}
          <path d="M18 60 C18 68 30 68 30 60" className={s.ln} />
          <rect x="8" y="76" width="84" height="8" rx="2" className={`${s.fSurface} ${s.ln}`} />
        </g>
      );
    case "clearinghouse":
      return (
        <g>
          <rect width="100" height="96" rx="16" className={s.fSand} />
          {/* hub */}
          <path d="M50 26 L68 36 V58 L50 68 L32 58 V36 Z" className={`${s.fSurface} ${s.ln}`} />
          <path d="M42 47 L48 53 L59 41" className={s.ln} />
          {/* in / out claims */}
          <path d="M12 47 H30 M26 43 L30 47 L26 51" className={s.ln} />
          <path d="M70 47 H88 M84 43 L88 47 L84 51" className={s.ln} />
          <rect x="10" y="74" width="18" height="12" rx="2" className={`${s.fSurface} ${s.ln}`} />
          <rect x="41" y="74" width="18" height="12" rx="2" className={`${s.fSurface} ${s.ln}`} />
          <rect x="72" y="74" width="18" height="12" rx="2" className={`${s.fSurface} ${s.ln}`} />
        </g>
      );
    case "payer":
      return (
        <g>
          <rect width="100" height="96" rx="16" className={s.fBlush} />
          {/* institution */}
          <path d="M20 36 L50 20 L80 36 Z" className={`${s.fSurface} ${s.ln}`} />
          <path d="M24 40 H76" className={s.ln} />
          <path d="M30 42 V66 M43 42 V66 M57 42 V66 M70 42 V66" className={s.ln} />
          <rect x="18" y="66" width="64" height="7" rx="1.5" className={`${s.fSurface} ${s.ln}`} />
          {/* remittance slip */}
          <rect x="56" y="58" width="30" height="26" rx="2" className={`${s.fSurface} ${s.ln}`} />
          <path d="M61 65 H80 M61 70 H76 M61 75 H80" className={s.ln} />
        </g>
      );
    case "billing":
      return (
        <g>
          <rect width="100" height="96" rx="16" className={s.fSage} />
          {/* ledger */}
          <rect x="50" y="22" width="38" height="46" rx="3" className={`${s.fSurface} ${s.ln}`} />
          <path d="M55 31 H83 M55 38 H78 M55 45 H83 M55 52 H74" className={s.ln} />
          <path d="M55 59 H70" className={`${s.ln}`} style={{ stroke: "var(--teal)" }} />
          {/* analyst with headset */}
          <circle cx="26" cy="40" r="9" className={`${s.fSurface} ${s.ln}`} />
          <path d="M16 38 A10 10 0 0 1 36 38" className={s.ln} />
          <path d="M12 76 V68 A14 14 0 0 1 40 68 V76" className={`${s.fSky} ${s.ln}`} />
          <rect x="8" y="76" width="84" height="8" rx="2" className={`${s.fSurface} ${s.ln}`} />
        </g>
      );
  }
}

/** A small level emblem: stacked steps, one per level, the current one inked. */
export function LevelEmblem({ n, total = 4 }: { n: number; total?: number }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden>
      <rect width="96" height="96" rx="18" className={[s.fSage, s.fSky, s.fSand, s.fBlush][(n - 1) % 4]} />
      {Array.from({ length: total }, (_, i) => {
        const h = 14 + i * 12;
        return <rect key={i} x={14 + i * 18} y={80 - h} width="14" height={h} rx="3" className={i === n - 1 ? s.fInk : `${s.fSurface} ${s.ln}`} />;
      })}
    </svg>
  );
}
