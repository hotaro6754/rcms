"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleBookmarkAction } from "@/lib/actions/learning";

/** Save a lesson to come back to. The server decides; the icon follows its answer. */
export function BookmarkButton({ lessonId, saved }: { lessonId: string; saved: boolean }) {
  const [on, setOn] = useState(saved);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        aria-pressed={on}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await toggleBookmarkAction(lessonId);
            if (res.ok) setOn(!!res.data);
            else setError(res.error);
          })
        }
        className="inline-flex min-h-9 items-center gap-1.5 rounded-[3px] border border-input px-3 text-[13px] hover:bg-secondary disabled:opacity-50"
      >
        {on ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
        {on ? "Saved" : "Save lesson"}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-micro text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
