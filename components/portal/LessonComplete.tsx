"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { completeLessonAction, reopenLessonAction } from "@/lib/actions/learning";
import { Button } from "@/components/ui/button";

/** Mark a lesson complete (or not). The server decides; a second click never moves the date. */
export function LessonComplete({ lessonId, done }: { lessonId: string; done: boolean }) {
  const router = useRouter();
  const [complete, setComplete] = useState(done);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        disabled={pending}
        variant={complete ? "outline" : "default"}
        className="min-h-11 rounded-[3px] px-4"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = complete ? await reopenLessonAction(lessonId) : await completeLessonAction(lessonId);
            if (res.ok) {
              setComplete(!complete);
              router.refresh();
            } else setError(res.error);
          })
        }
      >
        {complete ? (
          <>
            <RotateCcw className="h-4 w-4" aria-hidden /> Mark as not done
          </>
        ) : (
          <>
            <Check className="h-4 w-4" aria-hidden /> Mark complete
          </>
        )}
      </Button>
      {complete && !error && (
        <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }} className="text-micro text-success">
          Done
        </motion.span>
      )}
      {error && (
        <span role="alert" className="text-micro text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
