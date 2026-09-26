/**
 * Live inputs to the aurora. A plain mutable object on purpose: AuroraField reads it once
 * per frame, and anything that wants to steer the sky (the preloader, the hero's scroll
 * trigger, the level strip) writes a number here. GSAP can tween these fields directly,
 * which keeps every tween off the canvas element itself.
 *
 *   intensity  0..1   how much of the ribbon is lit. The preloader raises it from 0.
 *   scroll     0..1   progress through the hero. The ribbon rises and quietens.
 *   level      0..3   Beginner, Professional, Leader, Executive. The ribbon matures:
 *                     warm and wide at 0, deeper, narrower and more precise at 3.
 */
export const aurora = {
  intensity: 1,
  scroll: 0,
  level: 0,
};

export const LEVELS = ["Beginner", "Professional", "Leader", "Executive"] as const;
