/**
 * Where the hero sky meets the page. Three layered wave bands, sage to mist to stone, so
 * the hero hands over on a flow line rather than a hard edge. Waves are
 * the process metaphor: the same line the claim travels along, now carrying the reader
 * into the working part of the page.
 *
 * Static SVG, no motion. It sits at the foot of the hero and is purely decorative.
 */
export function WaveSeam({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 160"
      preserveAspectRatio="none"
      className={`pointer-events-none block h-[clamp(40px,5vw,84px)] w-full ${className}`}
    >
      <path
        d="M0 38 C 220 88, 420 8, 700 44 S 1180 96, 1440 30 L1440 160 L0 160 Z"
        fill="var(--sage)"
        opacity="0.28"
      />
      <path
        d="M0 72 C 260 118, 520 36, 780 76 S 1220 122, 1440 64 L1440 160 L0 160 Z"
        fill="var(--sage-mist)"
        opacity="0.9"
      />
      <path
        d="M0 104 C 300 140, 560 78, 860 108 S 1260 146, 1440 98 L1440 160 L0 160 Z"
        fill="var(--paper)"
      />
    </svg>
  );
}
