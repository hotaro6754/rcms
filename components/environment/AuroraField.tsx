"use client";

import { useEffect, useRef } from "react";
import { aurora } from "@/lib/environment";

/**
 * The hero sky: one ribbon of sage mist drifting across warm stone.
 *
 * Art reference is FeralUI's Aurora and Mist styles, re-keyed for daylight; the renderer is
 * our own so the sky can respond to the visitor, which a video loop cannot. Raw WebGL1, one
 * fullscreen triangle, no library. The ribbon is the flow of revenue through the operation:
 * it bends a little toward the pointer (never more than 8% of the frame), rises and thins as
 * the visitor scrolls on, and matures with the level strip, from a wide pale band to a
 * narrow eucalyptus line.
 *
 * Light on light: the ribbon is blended into the stone, not added as glow, so the ground
 * never darkens and ink type keeps its contrast everywhere.
 *
 * Budget: rendered at a fraction of device resolution (the sky is soft, so it upscales
 * cleanly), capped frame rate, and no frames at all when the hero is off screen or the tab
 * is hidden. Under reduced motion it paints one still frame. Without WebGL the CSS
 * fallback behind the canvas carries the look.
 *
 * Owns its own rAF loop and nothing else. GSAP writes numbers into `aurora`
 * (lib/environment.ts); this component is the only reader.
 */

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_scroll;
uniform float u_intensity;
uniform float u_level;

const vec3 STONE     = vec3(0.957, 0.937, 0.902);
const vec3 STONE_TOP = vec3(0.980, 0.969, 0.945);
const vec3 MIST      = vec3(0.886, 0.918, 0.890);
const vec3 SAGE      = vec3(0.663, 0.761, 0.710);
const vec3 EUC       = vec3(0.357, 0.545, 0.475);
const vec3 WHITE     = vec3(1.0);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((v_uv.x - 0.5) * aspect, v_uv.y - 0.5);
  float t = u_time;
  float lv = clamp(u_level / 3.0, 0.0, 1.0);

  // Pointer bends the field slightly; capped upstream at 8% of the frame.
  vec2 ptr = vec2(u_pointer.x * aspect, u_pointer.y) * 0.5;
  float bend = exp(-pow(p.x - ptr.x, 2.0) * 2.2) * u_pointer.y * 0.08;

  // Ribbon centreline: rises left to right, drifts, lifts away on scroll.
  float x = p.x;
  float warp = fbm(vec2(x * 0.9 + t * 0.035, t * 0.05));
  float centre = -0.06 + x * 0.16
               + 0.10 * sin(x * 1.6 + t * 0.12)
               + 0.16 * (warp - 0.5)
               + bend
               + u_scroll * 0.42;
  float d = p.y - centre;

  // Width narrows as the level rises: a wide pale band becomes a precise line.
  float width = mix(0.13, 0.065, lv) * (0.8 + 0.4 * fbm(vec2(x * 1.4 - t * 0.04, 3.1)));
  float core = exp(-(d * d) / (width * width));

  // Curtain: faint vertical rays of mist rising off the band.
  float rays = fbm(vec2(x * 7.0 + warp * 2.0, t * 0.08));
  rays = smoothstep(0.35, 0.85, rays);
  float lift = clamp(d / (0.55 - 0.2 * lv), 0.0, 1.0);
  float curtain = rays * (1.0 - lift) * smoothstep(-0.02, 0.06, d) * (0.55 - 0.25 * lv);

  // Colour through the band: eucalyptus at the lower edge, sage body, white mist above.
  float edge = clamp(0.5 + d / (width * 2.4), 0.0, 1.0);
  vec3 low  = mix(SAGE, EUC, 0.2 + 0.6 * lv);
  vec3 high = mix(WHITE, MIST, 0.35);
  vec3 ribbon = mix(low, high, smoothstep(0.3, 0.95, edge));

  float fade = 1.0 - 0.6 * u_scroll;
  float a = clamp((core * 0.7 + curtain * 0.9) * u_intensity * fade, 0.0, 0.8);

  // Ground: warm stone, lifting toward white at the top, a sage haze low down.
  vec3 col = mix(STONE, STONE_TOP, smoothstep(-0.5, 0.5, p.y));
  col = mix(col, MIST, 0.4 * exp(-pow(p.y + 0.55, 2.0) * 6.0) * u_intensity);

  col = mix(col, ribbon, a);
  // White sheen in the very core.
  col = mix(col, WHITE, pow(core, 6.0) * 0.3 * u_intensity * fade);

  // Local light around the pointer: a soft white lift, felt more than seen.
  float pl = exp(-dot(p - ptr, p - ptr) * 7.0);
  float active = step(0.001, abs(u_pointer.x) + abs(u_pointer.y));
  col = mix(col, WHITE, 0.14 * pl * u_intensity * active);

  // Tiny dither kills banding in the soft gradient.
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0 * 2.0;

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[AuroraField]", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function AuroraField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      canvas.style.display = "none";
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      canvas.style.display = "none";
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = "none";
      return;
    }
    gl.useProgram(prog);

    // One oversized triangle covers the viewport with no seam down the diagonal.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "u_res"),
      time: gl.getUniformLocation(prog, "u_time"),
      pointer: gl.getUniformLocation(prog, "u_pointer"),
      scroll: gl.getUniformLocation(prog, "u_scroll"),
      intensity: gl.getUniformLocation(prog, "u_intensity"),
      level: gl.getUniformLocation(prog, "u_level"),
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;

    // The sky is soft; a fraction of device resolution upscales without a visible step.
    const renderScale = small ? 0.45 : 0.6;
    const frameInterval = 1000 / (small ? 30 : 50);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr * renderScale));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr * renderScale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.res, w, h);
    };

    // Smoothed inputs. Targets are written by events and lib/environment; the loop eases.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const smooth = { level: aurora.level, scroll: aurora.scroll, intensity: aurora.intensity };

    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      // Normalised to -1..1 across the canvas, clamped so the sky never lurches.
      pointer.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      pointer.ty = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    };
    if (finePointer && !reduced) window.addEventListener("pointermove", onPointer, { passive: true });

    const start = performance.now();
    let raf = 0;
    let last = 0;
    let onScreen = true;

    const draw = (now: number) => {
      const k = 0.06;
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;
      smooth.level += (aurora.level - smooth.level) * 0.04;
      smooth.scroll += (aurora.scroll - smooth.scroll) * 0.12;
      smooth.intensity += (aurora.intensity - smooth.intensity) * 0.2;

      gl.uniform1f(u.time, reduced ? 12 : (now - start) / 1000);
      gl.uniform2f(u.pointer, pointer.x, pointer.y);
      gl.uniform1f(u.scroll, smooth.scroll);
      gl.uniform1f(u.intensity, smooth.intensity);
      gl.uniform1f(u.level, smooth.level);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      raf = 0;
      if (!onScreen || document.hidden) return;
      if (now - last >= frameInterval) {
        last = now;
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (reduced) {
        // One still frame, redrawn only when an input changes.
        smooth.level = aurora.level;
        smooth.scroll = aurora.scroll;
        smooth.intensity = aurora.intensity;
        draw(performance.now());
        return;
      }
      if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) wake();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        wake();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => wake();
    document.addEventListener("visibilitychange", onVisibility);

    // Reduced motion still honours the level strip and the preloader: poll cheaply.
    const reducedPoll = reduced
      ? window.setInterval(() => {
          if (
            smooth.level !== aurora.level ||
            smooth.intensity !== aurora.intensity ||
            smooth.scroll !== aurora.scroll
          )
            wake();
        }, 250)
      : 0;

    wake();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearInterval(reducedPoll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      io.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback sky for no-WebGL: the same composition in three soft pools. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 30% at 70% 55%, rgb(169 194 181 / 0.55), transparent 70%)," +
            "radial-gradient(45% 26% at 35% 68%, rgb(226 234 227 / 0.9), transparent 70%)," +
            "radial-gradient(60% 40% at 80% 38%, rgb(255 255 255 / 0.6), transparent 70%)," +
            "linear-gradient(to top, #eef0e8, #faf7f1 70%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
