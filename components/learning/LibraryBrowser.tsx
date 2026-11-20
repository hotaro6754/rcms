"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, BookOpen, Presentation, Search, X } from "lucide-react";
import s from "./library.module.css";

export interface Material {
  id: string;
  title: string;
  format: "SLIDES" | "READING";
  size: string | null;
  pages: number | null;
  ready: boolean;
  course: string;
  courseSlug: string;
  module: string;
  lesson: string;
  lessonId: string;
}

type Filter = "ALL" | "SLIDES" | "READING";

/** Search and filter the learner's slide decks and readings; each opens inside its lesson. */
export function LibraryBrowser({ items }: { items: Material[] }) {
  const [q, setQ] = useState("");
  const [format, setFormat] = useState<Filter>("ALL");
  const [course, setCourse] = useState<string | null>(null);
  const courses = useMemo(() => [...new Set(items.map((i) => i.course))], [items]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (i) => (format === "ALL" || i.format === format) && (!course || i.course === course) && (!t || `${i.title} ${i.lesson} ${i.module} ${i.course}`.toLowerCase().includes(t)),
    );
  }, [items, q, format, course]);

  const groups = useMemo(() => {
    const m = new Map<string, Material[]>();
    for (const i of shown) m.set(i.course, [...(m.get(i.course) ?? []), i]);
    return [...m.entries()];
  }, [shown]);

  const count = (f: Filter) => items.filter((i) => (f === "ALL" || i.format === f) && (!course || i.course === course)).length;

  return (
    <div className={s.browser}>
      <div className={s.toolbar}>
        <label className={s.search}>
          <Search aria-hidden />
          <span className="sr-only">Search materials</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search decks and readings" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X aria-hidden />
            </button>
          )}
        </label>
        <div className={s.seg} role="radiogroup" aria-label="Format">
          {(["ALL", "SLIDES", "READING"] as Filter[]).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={format === f} onClick={() => setFormat(f)}>
              {f === "SLIDES" ? <Presentation aria-hidden /> : f === "READING" ? <BookOpen aria-hidden /> : null}
              {f === "ALL" ? "All" : f === "SLIDES" ? "Slides" : "Reading"}
              <span className={s.n}>{count(f)}</span>
            </button>
          ))}
        </div>
      </div>

      {courses.length > 1 && (
        <div className={s.courseChips} role="group" aria-label="Course">
          <button type="button" aria-pressed={!course} onClick={() => setCourse(null)}>
            All courses
          </button>
          {courses.map((c) => (
            <button key={c} type="button" aria-pressed={course === c} onClick={() => setCourse(course === c ? null : c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className={s.none}>
          <p>Nothing matches{q ? ` “${q}”` : ""}.</p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setFormat("ALL");
              setCourse(null);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        groups.map(([name, list]) => (
          <section key={name} className={s.group} aria-label={name}>
            <div className={s.groupHead}>
              <h2 className={`x-display ${s.groupTitle}`}>{name}</h2>
              <Link href={`/academy/${list[0].courseSlug}`} className={s.groupLink}>
                Course contents <ArrowUpRight aria-hidden />
              </Link>
            </div>
            <motion.ul layout className={s.grid}>
              <AnimatePresence initial={false}>
                {list.map((m, i) => {
                  const href = `/academy/${m.courseSlug}/${m.lessonId}?format=${m.format === "SLIDES" ? "slides" : "reading"}`;
                  const body = (
                    <>
                      <span className={s.thumb} data-format={m.format} aria-hidden>
                        {m.format === "SLIDES" ? (
                          <span className={s.deck}>
                            <b />
                            <em />
                            <em />
                            <em />
                          </span>
                        ) : (
                          <span className={s.sheet}>
                            <b />
                            {Array.from({ length: 7 }, (_, k) => (
                              <em key={k} style={{ width: `${92 - ((k * 13) % 30)}%` }} />
                            ))}
                          </span>
                        )}
                        <span className={s.badge}>
                          {m.format === "SLIDES" ? <Presentation aria-hidden /> : <BookOpen aria-hidden />}
                          {m.format === "SLIDES" ? "Slides" : "Reading"}
                        </span>
                      </span>
                      <span className={s.cardBody}>
                        <span className={s.cardTitle}>{m.title}</span>
                        <span className={s.cardWhere}>
                          {m.module.replace(/^\d+\.\s*/, "")} · {m.lesson}
                        </span>
                        <span className={s.cardMeta}>
                          {m.ready ? (
                            <>
                              {m.pages ? `${m.pages} ${m.format === "SLIDES" ? "slides" : "pages"}` : "View-only"}
                              {m.size ? ` · ${m.size}` : ""}
                            </>
                          ) : (
                            "Being prepared"
                          )}
                          {m.ready && (
                            <span className={s.open}>
                              Open <ArrowUpRight aria-hidden />
                            </span>
                          )}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <motion.li key={m.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.02 }}>
                      {m.ready ? (
                        <Link href={href} className={s.card}>
                          {body}
                        </Link>
                      ) : (
                        <div className={s.card} data-pending>
                          {body}
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          </section>
        ))
      )}
    </div>
  );
}
