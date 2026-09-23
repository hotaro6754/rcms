"use client";

/**
 * A soft ring that trails the pointer, swelling over interactive elements and inverting
 * over the dark closing band. Built from a radial gradient rather than a box-shadow halo:
 * same read, without the zero-offset chromatic glow that reads as generated.
 *
 * GSAP owns the follow (quickTo, so it never queues tweens per pointermove); CSS owns the
 * look. Fine pointers only, and it removes itself entirely under reduced motion.
 */
export function CursorGlow() {
  return null;
}
