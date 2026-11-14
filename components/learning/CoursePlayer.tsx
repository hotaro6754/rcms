"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Lock, PanelLeftClose, PanelLeftOpen, PlayCircle, Search, X } from "lucide-react";
import s from "./course-player.module.css";

export interface PlayerLesson {
  id: string;
  title: string;
  /** null when the lesson cannot be opened (module locked, or not enrolled). */
  href: string | null;
  done: boolean;
  minutes?: number;
}
export interface PlayerModule {
  id: string;
  title: string;
  lessons: PlayerLesson[];
  locked?: boolean;
}

const RAIL_KEY = "rcms.playerRail";

/**
 * The lesson player: a collapsible, searchable curriculum rail beside a dark "theatre" stage
 * where the lesson's video, slides or reading play, and the lesson's notes, assessment and
 * navigation beneath it. The rail's open/closed state is remembered on this device; on phones
 * it opens as a drawer over the lesson.
 */
export function CoursePlayer({
  courseTitle,
  backHref,
  modules,
  currentId,
  progress,
  prevHref,
  nextHref,
  stage,
  children,
  badge,
}: {
  courseTitle: string;
  backHref: string;
  modules: PlayerModule[];
  currentId: string;
  progress: number | null;
  prevHref: string | null;
  nextHref: string | null;
  stage: React.ReactNode | null;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState("");
  const currentModule = modules.find((m) => m.lessons.some((l) => l.id === currentId))?.id;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(currentModule ? [currentModule] : []));

  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_KEY) === "closed") setOpen(false);
    } catch {
      /* storage blocked: rail starts open */
    }
  }, []);

  const toggleRail = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setDrawer((d) => !d);
      return;
    }
    setOpen((o) => {
      try {
        localStorage.setItem(RAIL_KEY, o ? "closed" : "open");
      } catch {
        /* not remembered */
      }
      return !o;
    });
  };

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      modules
        .map((m) => ({ ...m, lessons: q ? m.lessons.filter((l) => l.title.toLowerCase().includes(q) || m.title.toLowerCase().includes(q)) : m.lessons }))
        .filter((m) => m.lessons.length > 0),
    [modules, q],
  );
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  const done = modules.reduce((n, m) => n + m.lessons.filter((l) => l.done).length, 0);
  let counter = 0;
  const flatIndex = new Map<string, number>();
  for (const m of modules) for (const l of m.lessons) flatIndex.set(l.id, ++counter);
  const flat = modules.flatMap((m) => m.lessons);
  const at = flat.findIndex((l) => l.id === currentId);
  const upNext = at >= 0 ? flat.slice(at + 1).filter((l) => l.href).slice(0, 3) : [];

  return (
    <div className={s.player} data-rail={open ? "open" : "closed"} data-drawer={drawer ? "open" : "closed"}>
      <header className={s.bar}>
        <button type="button" onClick={toggleRail} className={s.iconBtn} aria-label={open ? "Hide course contents" : "Show course contents"} aria-expanded={open || drawer}>
          {open ? <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden /> : <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden />}
        </button>
        <Link href={backHref} className={s.back}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          <span className="truncate">{courseTitle}</span>
        </Link>
        {badge}
        <div className={s.barEnd}>
          {progress !== null && (
            <div className={s.progress} aria-label={`Course progress ${progress}%`}>
              <span className={s.progressTrack}>
                <span style={{ width: `${progress}%` }} />
              </span>
              <span className={s.progressText}>{progress}%</span>
            </div>
          )}
          <nav aria-label="Lesson navigation" className={s.stepper}>
            {prevHref ? (
              <Link href={prevHref} className={s.iconBtn} aria-label="Previous lesson">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <span className={s.iconBtn} aria-hidden data-disabled>
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
            {nextHref ? (
              <Link href={nextHref} className={s.nextBtn}>
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <span className={s.iconBtn} aria-hidden data-disabled>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </nav>
        </div>
      </header>

      <div className={s.body}>
        {drawer && <button type="button" className={s.scrim} aria-label="Close course contents" onClick={() => setDrawer(false)} />}
        <aside className={s.rail} aria-label="Course contents">
          <div className={s.railHead}>
            <div className={s.railTitleRow}>
              <p className={s.railTitle}>Course contents</p>
              <button type="button" className={`${s.iconBtn} ${s.railClose}`} aria-label="Close course contents" onClick={() => setDrawer(false)}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className={s.railMeta}>
              {done} of {total} lessons complete
            </p>
            <label className={s.search}>
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">Search lessons</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lessons" />
            </label>
          </div>
          <div className={s.railScroll}>
            {visible.length === 0 && <p className={s.empty}>No lessons match “{query}”.</p>}
            {visible.map((m) => {
              const isOpen = !!q || expanded.has(m.id);
              const mDone = m.lessons.filter((l) => l.done).length;
              return (
                <section key={m.id} className={s.module}>
                  <button
                    type="button"
                    className={s.moduleHead}
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      })
                    }
                  >
                    <span className="min-w-0">
                      <span className={s.moduleTitle}>{m.title}</span>
                      <span className={s.moduleMeta}>
                        {m.locked ? "Locked" : `${mDone}/${m.lessons.length} complete`}
                      </span>
                    </span>
                    {m.locked ? <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden /> : <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />}
                  </button>
                  {isOpen && (
                    <ol className={s.lessons}>
                      {m.lessons.map((l) => {
                        const current = l.id === currentId;
                        const inner = (
                          <>
                            <span className={s.status} data-state={l.done ? "done" : current ? "current" : "todo"}>
                              {l.done ? <Check className="h-3 w-3" aria-hidden /> : current ? <PlayCircle className="h-3.5 w-3.5" aria-hidden /> : <span>{flatIndex.get(l.id)}</span>}
                            </span>
                            <span className={s.lessonTitle}>{l.title}</span>
                            {l.minutes ? <span className={s.lessonMins}>{l.minutes}m</span> : null}
                          </>
                        );
                        return (
                          <li key={l.id}>
                            {l.href ? (
                              <Link href={l.href} className={s.lesson} aria-current={current ? "page" : undefined} onClick={() => setDrawer(false)}>
                                {inner}
                              </Link>
                            ) : (
                              <span className={s.lesson} data-locked aria-disabled>
                                {inner}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>
        </aside>

        <main className={s.main}>
          {stage && (
            <div className={s.theatre}>
              {stage}
              {upNext.length > 0 && (
                <nav aria-label="Up next" className={s.upNext}>
                  <p className={s.upNextLabel}>Up next</p>
                  <ol>
                    {upNext.map((l) => (
                      <li key={l.id}>
                        <Link href={l.href!} className={s.upCard}>
                          <span className={s.upNum}>{String(flatIndex.get(l.id)).padStart(2, "0")}</span>
                          <span className={s.upTitle}>{l.title}</span>
                          <span className={s.upMeta}>
                            <PlayCircle className="h-3.5 w-3.5" aria-hidden /> {l.minutes ? `${l.minutes} min` : "Lesson"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>
          )}
          <div className={s.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
