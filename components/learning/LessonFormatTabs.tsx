"use client";

import { useEffect, useState } from "react";
import { BookOpen, MonitorPlay, Presentation } from "lucide-react";

export type LessonFormat = "video" | "slides" | "reading";

const META: Record<LessonFormat, { label: string; hint: string; icon: typeof MonitorPlay }> = {
  video: { label: "Video", hint: "The essentials, explained", icon: MonitorPlay },
  slides: { label: "Slides", hint: "Key points in clear bullets", icon: Presentation },
  reading: { label: "Reading", hint: "The full study material", icon: BookOpen },
};

const KEY = "rcms.lessonFormat";

/**
 * The learner chooses how to take the lesson: watch the video, review the slides or read the
 * study material. The choice is remembered on this device (a convenience only) and every
 * format stays one click away. Panels are rendered on the server; this only switches them.
 */
export function LessonFormatTabs({
  available,
  videoLabel = "Video",
  panels,
  tone = "light",
}: {
  available: LessonFormat[];
  videoLabel?: string;
  panels: Partial<Record<LessonFormat, React.ReactNode>>;
  /** "dark" inside the player's theatre stage. */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const [active, setActive] = useState<LessonFormat>(available[0]);

  useEffect(() => {
    // A link can ask for a format (?format=slides), e.g. the quick buttons on the student desk.
    const asked = new URLSearchParams(window.location.search).get("format") as LessonFormat | null;
    if (asked && available.includes(asked)) {
      setActive(asked);
      return;
    }
    try {
      const saved = localStorage.getItem(KEY) as LessonFormat | null;
      if (saved && available.includes(saved)) setActive(saved);
    } catch {
      /* storage blocked: start with the first format */
    }
  }, [available]);

  const choose = (f: LessonFormat) => {
    setActive(f);
    try {
      localStorage.setItem(KEY, f);
    } catch {
      /* not remembered; that is fine */
    }
  };

  if (available.length === 0) return null;

  return (
    <div>
      {available.length > 1 && (
        <div
          role="tablist"
          aria-label="Lesson format"
          className={`grid gap-2 rounded-[calc(var(--radius)+8px)] border p-1.5 sm:grid-cols-3 ${dark ? "border-white/10 bg-white/[0.04] backdrop-blur" : "border-border bg-secondary/50"}`}
        >
          {available.map((f) => {
            const m = META[f];
            const Icon = m.icon;
            const on = f === active;
            return (
              <button
                key={f}
                role="tab"
                id={`format-tab-${f}`}
                aria-selected={on}
                aria-controls={`format-panel-${f}`}
                onClick={() => choose(f)}
                onKeyDown={(e) => {
                  const i = available.indexOf(f);
                  if (e.key === "ArrowRight") choose(available[(i + 1) % available.length]);
                  if (e.key === "ArrowLeft") choose(available[(i - 1 + available.length) % available.length]);
                }}
                tabIndex={on ? 0 : -1}
                className={`flex items-center gap-3 rounded-[calc(var(--radius)+2px)] px-3.5 py-2.5 text-left transition-all duration-200 ${
                  dark
                    ? on
                      ? "bg-white/[0.1] shadow-[0_10px_30px_-12px_rgba(45,212,191,0.45)] ring-1 ring-[#2dd4bf]/40"
                      : "text-white/70 hover:bg-white/[0.06]"
                    : on
                      ? "bg-card shadow-[0_6px_20px_-10px_rgba(20,32,74,0.45)] ring-1 ring-border"
                      : "hover:bg-card/60"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    on ? (dark ? "bg-[#2dd4bf] text-[#04211d]" : "bg-brand text-white") : dark ? "bg-white/[0.06] text-white/70 ring-1 ring-white/10" : "bg-card text-muted-foreground ring-1 ring-border"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{f === "video" ? videoLabel : m.label}</span>
                  <span className={`block truncate text-[12px] ${dark ? "text-white/55" : "text-muted-foreground"}`}>{f === "video" && videoLabel !== "Video" ? "The lesson content" : m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {available.map((f) => (
        <div key={f} role="tabpanel" id={`format-panel-${f}`} aria-labelledby={`format-tab-${f}`} hidden={f !== active} className={available.length > 1 ? "mt-5" : ""}>
          {panels[f]}
        </div>
      ))}
    </div>
  );
}
