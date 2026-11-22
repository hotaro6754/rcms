/**
 * Scroll-to-stage mapping for the 3D hero, shared by the camera (CycleWorld) and the caption
 * (ClaimJourney3D) so both always point at the same stage. Kept free of three.js so the page can
 * import it without pulling the 3D bundle.
 */
export const INTRO = 0.04;
export const STAGE_COUNT = 10;

/** Scroll progress (0–1) → stage position (0–9). */
export function stageFloat(p: number) {
  const k = Math.min(1, Math.max(0, (p - INTRO) / (1 - INTRO)));
  return k * (STAGE_COUNT - 1);
}
