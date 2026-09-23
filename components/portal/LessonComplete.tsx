"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { completeLesson, reopenLesson } from "@/lib/actions/academy";
import { Button } from "@/components/ui/button";

export function LessonComplete({
  lessonId,
  done,
}: {
  lessonId: string;
  done: boolean;
}) {
  const [complete, setComplete] = useState(done);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        disabled={pending}
        variant={complete ? "outline" : "default"}
        className="min-h-11 rounded-full"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = complete ? await reopenLesson(lessonId) : await completeLesson(lessonId);
            if (res.ok) setComplete(!complete);
            else setError("error" in res ? res.error : "That did not save.");
          })
        }
      >
        {complete ? (
          <>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Mark as unread
          </>
        ) : (
          <>
            <Check className="h-4 w-4" aria-hidden />
            Mark complete
          </>
        )}
      </Button>

      {complete && !error && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
          className="text-micro text-success"
        >
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
