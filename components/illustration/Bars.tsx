/**
 * "The Bars": RCMExcel's characters, drawn from the logo's rising bars. A flat rounded bar with a
 * single loose ink line for the face and arms. Students meet them at moments that matter
 * (welcome, quiz feedback, empty states, certificates); the admin never shows them.
 *
 * Colours come from the rcx tokens, so they re-theme for dark mode. Decorative by default
 * (aria-hidden); pass `label` when the drawing carries meaning on its own.
 */

export type Mood = "welcome" | "thinking" | "correct" | "retry" | "certified" | "resting";

const MOODS: Record<Mood, { h: number; fill: string; face: string }> = {
  welcome: { h: 60, fill: "var(--x-mint)", face: "var(--x-ink)" },
  thinking: { h: 80, fill: "var(--x-mint)", face: "var(--x-ink)" },
  correct: { h: 100, fill: "var(--x-green)", face: "#e8f3ee" },
  retry: { h: 70, fill: "var(--x-coral-tint)", face: "var(--x-ink)" },
  certified: { h: 120, fill: "var(--x-green)", face: "#e8f3ee" },
  resting: { h: 50, fill: "var(--x-sand)", face: "var(--x-ink)" },
};

export function Mascot({ mood, className, label }: { mood: Mood; className?: string; label?: string }) {
  const { h, fill, face } = MOODS[mood];
  const top = 140 - h;
  const ink = "var(--x-ink)";
  const line = { fill: "none", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 140 160" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <line x1="18" y1="140" x2="122" y2="140" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="45" y={top} width="50" height={h} rx="10" fill={fill} />
      {mood === "welcome" && (
        <g stroke={face} {...line}>
          <path d={`M57 ${top + 16} q4 -4 8 0`} />
          <path d={`M75 ${top + 16} q4 -4 8 0`} />
          <path d={`M62 ${top + 26} q8 7 16 0`} />
          <path d={`M95 ${top + 24} L110 ${top + 4}`} stroke={ink} />
          <circle cx="112" cy={top} r="3.5" stroke={ink} />
          <path d={`M45 ${top + 28} L35 ${top + 40}`} stroke={ink} />
          <path d={`M68 ${top - 2} c-6 -14 10 -18 8 -6 c-2 8 -12 2 -6 -6`} stroke={ink} />
        </g>
      )}
      {mood === "thinking" && (
        <>
          <circle cx="62" cy={top + 17} r="2.6" fill={face} />
          <circle cx="78" cy={top + 17} r="2.6" fill={face} />
          <g stroke={ink} {...line}>
            <path d={`M63 ${top + 30} l14 -3`} stroke={face} />
            <path d={`M45 ${top + 42} L56 ${top + 39} L64 ${top + 34}`} />
            <path d={`M100 ${top - 14} c6 -10 18 -4 12 4 c-4 6 -14 2 -8 -6`} />
          </g>
          <circle cx="102" cy={top - 4} r="2" fill={ink} />
          <circle cx="97" cy={top + 2} r="1.4" fill={ink} />
        </>
      )}
      {mood === "correct" && (
        <>
          <g stroke={face} {...line}>
            <path d={`M58 ${top + 18} l4 -4 l4 4`} />
            <path d={`M74 ${top + 18} l4 -4 l4 4`} />
          </g>
          <ellipse cx="70" cy={top + 30} rx="6" ry="5" fill={face} />
          <g stroke={ink} {...line}>
            <path d={`M45 ${top + 26} L30 ${top + 2}`} />
            <path d={`M95 ${top + 26} L110 ${top + 2}`} />
            <path d={`M120 ${top - 16} v10 M115 ${top - 11} h10`} />
            <path d={`M20 ${top - 6} v8 M16 ${top - 2} h8`} />
          </g>
        </>
      )}
      {mood === "retry" && (
        <>
          <circle cx="62" cy={top + 16} r="2.6" fill={face} />
          <circle cx="78" cy={top + 16} r="2.6" fill={face} />
          <g stroke={ink} {...line}>
            <path d={`M61 ${top + 29} q3 -3 6 0 t6 0 t6 0`} stroke={face} />
            <path d={`M95 ${top + 34} L106 ${top + 18} L97 ${top + 4}`} />
            <path d={`M90 ${top - 8} l4 -5 M99 ${top - 6} l6 -3`} />
          </g>
        </>
      )}
      {mood === "certified" && (
        <>
          <g stroke={face} {...line}>
            <path d={`M57 ${top + 18} q4 -4 8 0`} />
            <path d={`M75 ${top + 18} q4 -4 8 0`} />
            <path d={`M62 ${top + 27} q8 7 16 0`} />
            <path d="M45 82 L55 80" />
            <path d="M95 82 L85 80" />
          </g>
          <rect x="55" y="60" width="30" height="36" rx="4" fill="var(--x-surface)" stroke={ink} strokeWidth="1.5" />
          <g stroke={ink} strokeWidth="1.3" strokeLinecap="round">
            <line x1="60" y1="68" x2="80" y2="68" />
            <line x1="60" y1="74" x2="76" y2="74" />
            <line x1="60" y1="80" x2="78" y2="80" />
          </g>
          <circle cx="78" cy="90" r="4" fill="var(--x-coral)" />
          <g stroke={ink} {...line}>
            <path d="M118 8 v10 M113 13 h10" />
          </g>
        </>
      )}
      {mood === "resting" && (
        <g stroke={face} {...line}>
          <path d={`M57 ${top + 18} h8`} />
          <path d={`M75 ${top + 18} h8`} />
          <path d={`M64 ${top + 30} q6 3 12 0`} />
          <path d={`M100 ${top - 8} h8 l-8 8 h8`} stroke={ink} strokeWidth="1.8" />
          <path d={`M112 ${top - 22} h6 l-6 6 h6`} stroke={ink} strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

/**
 * The whole cast: four bars rising like the logo (one per level), the teal arrow over them, each
 * holding something from the work: a claim form, a magnifier over a denial, a chart, a
 * certificate. Used as the hero drawing on sign-in and the coming-soon page.
 */
export function BarsCast({ className, label }: { className?: string; label?: string }) {
  const ink = "var(--x-ink)";
  const light = "#e8f3ee";
  const line = { fill: "none", strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 520 250" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {/* the logo arrow, sweeping up over the four */}
      <path d="M22 150 C 140 140, 300 90, 470 26" fill="none" stroke="var(--x-teal)" strokeWidth="4" strokeLinecap="round" />
      <path d="M452 20 L474 24 L466 44" fill="none" stroke="var(--x-teal)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="222" x2="504" y2="222" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />

      {/* 1 · Foundation: mint, waving */}
      <rect x="40" y="150" width="70" height="72" rx="14" fill="var(--x-mint)" />
      <g stroke={ink} {...line}>
        <path d="M58 172 q5 -5 10 0" />
        <path d="M82 172 q5 -5 10 0" />
        <path d="M64 186 q11 9 22 0" />
        <path d="M40 182 L24 160" />
        <circle cx="21" cy="155" r="4.5" />
        <path d="M110 186 L122 200" />
      </g>

      {/* 2 · Professional: sand, holding a claim form */}
      <rect x="150" y="118" width="70" height="104" rx="14" fill="var(--x-sand)" />
      <circle cx="173" cy="140" r="3" fill={ink} />
      <circle cx="197" cy="140" r="3" fill={ink} />
      <path d="M176 154 q9 6 18 0" stroke={ink} {...line} />
      <g transform="rotate(-6 236 168)">
        <rect x="214" y="140" width="44" height="56" rx="5" fill="var(--x-surface)" stroke={ink} strokeWidth="1.6" />
        <rect x="220" y="147" width="18" height="5" rx="1.5" fill="var(--x-coral)" />
        <g stroke={ink} strokeWidth="1.4" strokeLinecap="round">
          <line x1="220" y1="160" x2="252" y2="160" />
          <line x1="220" y1="167" x2="248" y2="167" />
          <line x1="220" y1="174" x2="252" y2="174" />
          <line x1="220" y1="181" x2="240" y2="181" />
        </g>
      </g>
      <path d="M220 172 L214 170" stroke={ink} {...line} />

      {/* 3 · Leadership: green, magnifier over a denial code */}
      <rect x="270" y="86" width="70" height="136" rx="14" fill="var(--x-green)" />
      <g stroke={light} {...line}>
        <path d="M288 110 l5 -5 l5 5" />
        <path d="M312 110 h10" />
        <path d="M296 124 h18" />
      </g>
      <g stroke={ink} {...line}>
        <path d="M270 138 L252 118" />
        <circle cx="244" cy="104" r="15" />
        <path d="M254 115 L262 124" />
      </g>
      <text x="244" y="108" textAnchor="middle" fontFamily="var(--x-mono)" fontSize="9" fontWeight="600" fill="var(--x-coral)">CO-45</text>

      {/* 4 · Executive: night, certificate held up */}
      <rect x="380" y="50" width="70" height="172" rx="14" fill="var(--x-night)" />
      <g stroke={light} {...line}>
        <path d="M398 74 q5 -5 10 0" />
        <path d="M422 74 q5 -5 10 0" />
        <path d="M404 88 q11 9 22 0" />
      </g>
      <g stroke={ink} {...line}>
        <path d="M450 96 L470 70" />
        <path d="M380 110 L364 128" />
      </g>
      <g transform="rotate(8 486 52)">
        <rect x="466" y="34" width="40" height="32" rx="4" fill="var(--x-surface)" stroke={ink} strokeWidth="1.6" />
        <g stroke={ink} strokeWidth="1.3" strokeLinecap="round">
          <line x1="472" y1="43" x2="498" y2="43" />
          <line x1="472" y1="50" x2="492" y2="50" />
        </g>
        <circle cx="497" cy="58" r="4.5" fill="var(--x-coral)" />
      </g>

      {/* sparks */}
      <g stroke={ink} strokeWidth="2" strokeLinecap="round">
        <path d="M352 52 v10 M347 57 h10" />
        <path d="M128 112 v8 M124 116 h8" />
      </g>
      <circle cx="138" cy="70" r="11" fill="var(--x-coral-tint)" />
      <text x="138" y="75" textAnchor="middle" fontFamily="var(--x-fig)" fontSize="13" fontWeight="600" fill="var(--x-coral)">$</text>
    </svg>
  );
}

/** Four rising bars with the learner's level marked: the logo as a progress picture. */
export function LevelBars({ current, done, className }: { current: number; done: number; className?: string }) {
  const heights = [44, 64, 86, 110];
  return (
    <svg viewBox="0 0 220 130" className={className} aria-hidden>
      <path d="M8 86 C 60 80, 120 50, 204 12" fill="none" stroke="var(--x-teal)" strokeWidth="3" strokeLinecap="round" />
      {heights.map((h, i) => {
        const x = 20 + i * 50;
        const fill = i < done ? "var(--x-green)" : i === current ? "var(--x-coral)" : "var(--x-sunken)";
        return <rect key={h} x={x} y={122 - h} width="34" height={h} rx="8" fill={fill} />;
      })}
    </svg>
  );
}
