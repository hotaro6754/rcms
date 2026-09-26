"use client";

import { useEffect, useRef } from "react";
import { LOTTIE_ASSETS, type LottieKey } from "@/lib/data/lottie-assets";
import { cn } from "@/lib/utils";

type Player = { play(): void; pause(): void; goToAndStop(v: number, frame?: boolean): void; destroy(): void; totalFrames: number };

/**
 * A supporting Lottie animation. Tier 2 in the visual hierarchy: the Academy's own
 * illustrations lead, and a Lottie only appears where it genuinely helps (see
 * lib/data/lottie-assets.ts for what is used, where, and under which licence).
 *
 * Cost is paid only when needed: the player (lottie-web's light SVG build) and the JSON are
 * both fetched when the animation first nears the viewport, it plays only while on screen,
 * and under reduced motion it renders a single still frame. Decorative: the surrounding copy
 * carries the meaning, so it is hidden from assistive technology.
 */
export function LottieView({ name, className }: { name: LottieKey; className?: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const asset = LOTTIE_ASSETS[name];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let player: Player | null = null;
    let cancelled = false;
    let onScreen = false;

    const load = async () => {
      const [{ default: lottie }, data] = await Promise.all([
        import("lottie-web/build/player/lottie_light"),
        fetch(asset.file).then((r) => r.json()),
      ]);
      if (cancelled) return;
      player = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: true,
        autoplay: false,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
      }) as unknown as Player;
      if (reduced) player.goToAndStop(Math.round(player.totalFrames * 0.6), true);
      else if (onScreen) player.play();
    };

    // Load a little before it arrives; play only while it is actually visible.
    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          near.disconnect();
          load();
        }
      },
      { rootMargin: "300px 0px" },
    );
    const seen = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (!player || reduced) return;
      if (onScreen) player.play();
      else player.pause();
    });
    near.observe(el);
    seen.observe(el);

    return () => {
      cancelled = true;
      near.disconnect();
      seen.disconnect();
      player?.destroy();
    };
  }, [name]);

  return <div ref={box} aria-hidden="true" className={cn("aspect-square", className)} />;
}
