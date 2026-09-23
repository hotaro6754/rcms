"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  moveLesson,
  moveModule,
  setLessonState,
} from "@/lib/actions/studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Curriculum builder.
 *
 * Ordering is move-up / move-down rather than drag. It is keyboard-operable, announces
 * correctly to a screen reader, and each move is one transaction that swaps two rows, so
 * the list can never be left half-ordered. Drag can sit on top of the same actions later.
 *
 * Motion owns the row transitions; there is no GSAP in this subtree.
 */

export interface StudioLesson {
  id: string;
  title: string;
  state: string;
  durationSec: number | null;
  hasBody: boolean;
  questions: number;
}

export interface StudioModule {
  id: string;
  title: string;
  summary: string | null;
  lessons: StudioLesson[];
}

export function CurriculumBuilder({
  programId,
  modules,
}: {
  programId: string;
  modules: StudioModule[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok && res.error) setError(res.error);
    });

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2.5 text-micro leading-relaxed text-danger"
        >
          {error}
        </motion.p>
      )}

      {modules.map((m, mi) => (
        <section key={m.id} className="rounded-[var(--radius)] border border-border bg-card">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
            <span className="text-data text-micro font-semibold text-primary">
              {String(mi + 1).padStart(2, "0")}
            </span>
            <h2 className="text-[1rem] leading-snug">{m.title}</h2>
            <span className="text-data text-micro text-muted-foreground">
              {m.lessons.length} lessons
            </span>

            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon" variant="ghost" disabled={pending || mi === 0}
                aria-label={`Move ${m.title} up`}
                onClick={() => run(() => moveModule(m.id, "up"))}
              >
                <ChevronUp className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon" variant="ghost" disabled={pending || mi === modules.length - 1}
                aria-label={`Move ${m.title} down`}
                onClick={() => run(() => moveModule(m.id, "down"))}
              >
                <ChevronDown className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon" variant="ghost" disabled={pending}
                aria-label={`Delete ${m.title}`}
                onClick={() => run(() => deleteModule(m.id))}
              >
                <Trash2 className="h-4 w-4 text-danger" aria-hidden />
              </Button>
            </div>
          </header>

          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {m.lessons.map((l, li) => (
                <motion.li
                  key={l.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <Link
                    href={`/studio/lesson/${l.id}`}
                    className="min-w-0 flex-1 text-[13.5px] font-medium hover:text-primary"
                  >
                    {l.title}
                  </Link>

                  <div className="flex items-center gap-2">
                    {l.questions > 0 && (
                      <Badge className="rounded-full border-transparent bg-secondary text-micro text-secondary-foreground">
                        {l.questions} questions
                      </Badge>
                    )}
                    <Badge
                      className={`rounded-full border-transparent text-micro ${
                        l.state === "PUBLISHED"
                          ? "bg-success-bg text-success"
                          : "bg-warning-bg text-warning"
                      }`}
                    >
                      {l.state.toLowerCase()}
                    </Badge>
                  </div>

                  <Button
                    size="sm" variant="outline" disabled={pending}
                    className="min-h-9 rounded-full"
                    onClick={() =>
                      run(() =>
                        setLessonState(l.id, l.state === "PUBLISHED" ? "DRAFT" : "PUBLISHED"),
                      )
                    }
                  >
                    {l.state === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon" variant="ghost" disabled={pending || li === 0}
                      aria-label={`Move ${l.title} up`}
                      onClick={() => run(() => moveLesson(l.id, "up"))}
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="icon" variant="ghost" disabled={pending || li === m.lessons.length - 1}
                      aria-label={`Move ${l.title} down`}
                      onClick={() => run(() => moveLesson(l.id, "down"))}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="icon" variant="ghost" disabled={pending}
                      aria-label={`Delete ${l.title}`}
                      onClick={() => run(() => deleteLesson(l.id))}
                    >
                      <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="border-t border-border px-5 py-3">
            {adding === m.id ? (
              <form
                action={(fd) =>
                  start(async () => {
                    const res = await createLesson(m.id, fd);
                    if (!res.ok) setError(res.error);
                    else setAdding(null);
                  })
                }
                className="flex flex-wrap items-center gap-2"
              >
                <Input
                  name="title" autoFocus required placeholder="Lesson title"
                  className="min-h-9 max-w-sm"
                />
                <Button type="submit" size="sm" disabled={pending} className="min-h-9 rounded-full">
                  Add
                </Button>
                <Button
                  type="button" size="sm" variant="ghost" className="min-h-9"
                  onClick={() => setAdding(null)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <Button
                size="sm" variant="ghost" className="min-h-9 gap-1.5"
                onClick={() => setAdding(m.id)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add lesson
              </Button>
            )}
          </div>
        </section>
      ))}

      <form
        action={(fd) =>
          start(async () => {
            const res = await createModule(programId, fd);
            if (!res.ok) setError(res.error);
          })
        }
        className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4"
      >
        <Input name="title" required placeholder="New module title" className="min-h-10 max-w-md" />
        <Button type="submit" disabled={pending} className="min-h-10 rounded-full">
          Add module
        </Button>
      </form>
    </div>
  );
}
