/**
 * The RCMExcel mark, drawn to match public/brand/rcmexcel-mark.png: four rising navy bars with
 * lighter right faces, and the teal-to-green arrow sweeping beneath them and up to the right,
 * separated from the bars by a white gap. Drawn in SVG so the preloader can animate each part
 * (data-mark-bar, data-mark-arrow).
 */
const BARS = [
  { x: 64, peak: 205 },
  { x: 150, peak: 125 },
  { x: 236, peak: 62 },
  { x: 322, peak: 2 },
];

export function BrandMark({ className, id = "rcx-mark" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 512 480" className={className} role="img" aria-label="RCMExcel">
      <defs>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1c4e" />
          <stop offset="1" stopColor="#0a1846" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a5a98" />
          <stop offset="1" stopColor="#1d3470" />
        </linearGradient>
        <linearGradient id={`${id}-arrow`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#15a9b3" />
          <stop offset="0.55" stopColor="#17b99a" />
          <stop offset="1" stopColor="#22d27a" />
        </linearGradient>
      </defs>
      {BARS.map((b) => (
        <g key={b.x} data-mark-bar>
          <path d={`M${b.x} ${b.peak + 23} L${b.x + 46} ${b.peak} L${b.x + 46} 412 L${b.x} 412 Z`} fill={`url(#${id}-front)`} />
          <path d={`M${b.x + 46} ${b.peak} L${b.x + 74} ${b.peak + 23} L${b.x + 74} 398 L${b.x + 46} 412 Z`} fill={`url(#${id}-side)`} />
        </g>
      ))}
      <path
        data-mark-arrow
        d="M38 300 C 4 340, 6 392, 70 410 C 170 438, 330 400, 448 290 L 470 336 L 497 176 L 338 262 L 392 266 C 300 352, 180 384, 100 378 C 56 374, 32 346, 38 300 Z"
        fill={`url(#${id}-arrow)`}
        stroke="#ffffff"
        strokeWidth="12"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}
