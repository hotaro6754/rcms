"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { updateLesson } from "@/lib/actions/studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function LessonEditor({
  lessonId,
  title,
  body,
  minutes,
}: {
  lessonId: string;
  title: string;
  body: string;
  minutes: number;
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          setSaved(false);
          const res = await updateLesson(lessonId, fd);
          if (res.ok) setSaved(true);
          else setError(res.error);
        })
      }
      className="rounded-[var(--radius)] border border-border bg-card p-5"
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-micro font-medium">Title</label>
          <Input id="title" name="title" defaultValue={title} required className="min-h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minutes" className="text-micro font-medium">Minutes</label>
          <Input id="minutes" name="minutes" type="number" min={0} max={600}
            defaultValue={minutes || ""} className="min-h-10" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="body" className="text-micro font-medium">Lesson</label>
        <Textarea id="body" name="body" rows={18} defaultValue={body}
          className="font-[15px] leading-relaxed"
          placeholder="Blank lines separate paragraphs. Write it the way you would explain it on the floor." />
        <p className="text-micro text-muted-foreground">
          A lesson cannot be published while this is empty.
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending} className="min-h-10 rounded-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Save
        </Button>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5 text-micro text-success"
          >
            <Check className="h-3.5 w-3.5" aria-hidden /> Saved
          </motion.span>
        )}
        {error && <span role="alert" className="text-micro text-danger">{error}</span>}
      </div>
    </form>
  );
}
