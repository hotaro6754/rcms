"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { completeLessonAction, reopenLessonAction } from "@/lib/actions/learning";
import { POINTS } from "@/components/learning/Gamify";
import s from "./lesson-complete.module.css";

const COLOURS = ["#e2603a", "#0f4c3a", "#8fc7ae", "#c8b08d", "#0e1f3d", "#2a9d8f"];

/** A short confetti burst from the button: 28 pieces, under a second, skipped for reduced motion. */
function Burst() {
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
    const dist = 70 + ((i * 37) % 60);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 40, r: (i * 47) % 360, c: COLOURS[i % COLOURS.length], w: i % 3 ? 7 : 10, h: i % 2 ? 7 : 12 };
  });
  return (
    <span className={s.burst} aria-hidden>
      {pieces.map((p, i) => (
        <motion.i
          key={i}
          style={{ background: p.c, width: p.w, height: p.h }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 60], opacity: [1, 1, 0], rotate: p.r, scale: 1 }}
          transition={{ duration: 0.95, ease: [0.2, 0.7, 0.3, 1] }}
        />
      ))}
    </span>
  );
}

/** Mark a lesson complete (or not). The server decides; a second click never moves the date. */
export function LessonComplete({ lessonId, done }: { lessonId: string; done: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [complete, setComplete] = useState(done);
  const [cheer, setCheer] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(false), 3200);
    return () => clearTimeout(t);
  }, [cheer]);

  return (
    <div className={s.wrap}>
      <span className={s.btnWrap}>
        <button
          type="button"
          disabled={pending}
          data-done={complete || undefined}
          className={s.btn}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = complete ? await reopenLessonAction(lessonId) : await completeLessonAction(lessonId);
              if (res.ok) {
                if (!complete) setCheer(true);
                setComplete(!complete);
                router.refresh();
              } else setError(res.error);
            })
          }
        >
          {complete ? (
            <>
              <RotateCcw aria-hidden /> Mark as not done
            </>
          ) : (
            <>
              <Check aria-hidden /> Mark complete
            </>
          )}
        </button>
        {cheer && !reduce && <Burst />}
      </span>

      <AnimatePresence>
        {cheer && (
          <motion.div
            role="status"
            className={s.toast}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          >
            <span className={s.toastArt} aria-hidden>
              <Check />
            </span>
            <span>
              <b>Lesson complete</b>
              <small>+{POINTS.lesson} learning points</small>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <span role="alert" className={s.error}>
          {error}
        </span>
      )}
    </div>
  );
}
