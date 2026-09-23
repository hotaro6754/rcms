"use client";

/**
 * Single registration point for every GSAP plugin used in the app.
 * Nothing else in the codebase calls gsap.registerPlugin.
 *
 * SSR safety: registration is side-effect-free on the server. GSAP itself is import-safe,
 * but plugins touch document during setup, so registration happens behind a window guard
 * and every consumer runs inside useGSAP (client-only, post-mount).
 */

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";

let registered = false;

if (typeof window !== "undefined" && !registered) {
  gsap.registerPlugin(
    useGSAP,
    ScrollTrigger,
    DrawSVGPlugin,
    SplitText,
    Flip,
    CustomEase,
    MotionPathPlugin,
    Observer,
  );
  registered = true;
}

export { gsap, useGSAP, ScrollTrigger, DrawSVGPlugin, SplitText, Flip, CustomEase, MotionPathPlugin, Observer };
