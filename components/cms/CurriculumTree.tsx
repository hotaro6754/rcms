"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, Plus } from "lucide-react";
import { createLessonAction, createModuleAction, moveLessonAction, moveModuleAction } from "@/lib/actions/cms";
import { cn } from "@/lib/utils";

export interface TreeLesson {
  id: string;
  title: string;
  state: string;
  hasAssessment: boolean;
  freePreview: boolean;
}

export interface TreeModule {
  id: string;
  title: string;
  state: string;
  lessons: TreeLesson[];
}

type Drag = { kind: "module"; id: string } | { kind: "lesson"; id: string; moduleId: string } | null;

const STATE_DOT: Record<string, string> = {
  PUBLISHED: "bg-success",
  DRAFT: "bg-input",
  ARCHIVED: "bg-danger/60",
};

const STATE_WORD: Record<string, string> = { PUBLISHED: "ready", DRAFT: "draft", ARCHIVED: "archived" };

function fd(entries: Record<string, string | undefined>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) if (v !== undefined) f.set(k, v);
  return f;
}

/**
 * The curriculum tree. Drag a module to reorder modules; drag a lesson onto another lesson to
 * place it there (in the same module or another), or onto a module's header to move it to the
 * end of that module. Every drag has a keyboard equivalent: the arrow buttons on each row,
 * and "Move to" in the lesson editor. The server validates every move.
 */
export function CurriculumTree({ courseId, modules, selected, canEdit }: { courseId: string; modules: TreeModule[]; selected: string; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const run = (p: Promise<{ ok: boolean; error?: string } | { ok: true; data?: unknown }>) =>
    start(async () => {
      setError(null);
      const res = (await p) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "That did not work.");
      router.refresh();
    });

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return modules
      .filter((m) => showArchived || m.state !== "ARCHIVED")
      .map((m) => ({
        ...m,
        lessons: m.lessons.filter((l) => (showArchived || l.state !== "ARCHIVED") && (!f || l.title.toLowerCase().includes(f) || m.title.toLowerCase().includes(f))),
      }))
      .filter((m) => !f || m.title.toLowerCase().includes(f) || m.lessons.length > 0);
  }, [modules, filter, showArchived]);

  const dropOnModule = (targetModuleId: string) => {
    if (!drag || !canEdit) return;
    if (drag.kind === "module" && drag.id !== targetModuleId) {
      const ids = modules.map((m) => m.id).filter((id) => id !== drag.id);
      ids.splice(ids.indexOf(targetModuleId), 0, drag.id);
      run(moveModuleAction(fd({ courseId, order: JSON.stringify(ids) })));
    }
    if (drag.kind === "lesson") {
      const target = modules.find((m) => m.id === targetModuleId);
      run(moveLessonAction(fd({ courseId, id: drag.id, targetModuleId, position: String(target?.lessons.filter((l) => l.id !== drag.id).length ?? 0) })));
    }
  };

  const dropOnLesson = (moduleId: string, lessonId: string) => {
    if (!drag || drag.kind !== "lesson" || drag.id === lessonId || !canEdit) return;
    const target = modules.find((m) => m.id === moduleId)!;
    const siblings = target.lessons.map((l) => l.id).filter((id) => id !== drag.id);
    run(moveLessonAction(fd({ courseId, id: drag.id, targetModuleId: moduleId, position: String(siblings.indexOf(lessonId)) })));
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="flex flex-col gap-2">
        <label htmlFor="tree-filter" className="sr-only">
          Filter the curriculum
        </label>
        <input id="tree-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter modules and lessons" className="min-h-9 w-full rounded-[3px] border border-input bg-card px-3 text-[13px]" />
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-danger pl-2.5 text-micro text-danger">
          {error}
        </p>
      )}

      <Link href={`/admin/content/courses/${courseId}`} className={cn("rounded-[3px] px-2 py-1.5 text-[13px] font-semibold", selected === "course" ? "bg-secondary" : "hover:bg-secondary/60")}>
        Course details
      </Link>

      <ol className="flex flex-col gap-1.5">
        {visible.map((m, mi) => {
          const open = !collapsed.has(m.id) || !!filter;
          const sel = selected === `module:${m.id}`;
          return (
            <li key={m.id} className={cn("rounded-[3px] border", over === m.id ? "border-foreground" : "border-border")}>
              <div
                draggable={canEdit}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  setDrag({ kind: "module", id: m.id });
                }}
                onDragEnd={() => {
                  setDrag(null);
                  setOver(null);
                }}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  setOver(m.id);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  dropOnModule(m.id);
                }}
                className={cn("flex items-center gap-1 px-1.5 py-1", sel ? "bg-secondary" : "")}
              >
                {canEdit && <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-subtle" aria-hidden />}
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => (c.has(m.id) ? new Set([...c].filter((x) => x !== m.id)) : new Set([...c, m.id])))}
                  aria-expanded={open}
                  aria-label={`${open ? "Collapse" : "Expand"} ${m.title}`}
                  className="rounded p-0.5 hover:bg-secondary"
                >
                  {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
                </button>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATE_DOT[m.state])} title={STATE_WORD[m.state]} aria-hidden />
                <Link href={`/admin/content/courses/${courseId}?item=module:${m.id}`} className="min-w-0 flex-1 truncate py-1 text-[13px] font-medium hover:underline">
                  <span className="text-data mr-1.5 text-[11px] text-subtle">{String(mi + 1).padStart(2, "0")}</span>
                  {m.title}
                  <span className="sr-only"> ({STATE_WORD[m.state]})</span>
                </Link>
                {canEdit && !filter && (
                  <>
                    <button type="button" disabled={pending || mi === 0} onClick={() => run(moveModuleAction(fd({ courseId, id: m.id, direction: "up" })))} className="rounded p-1 hover:bg-secondary disabled:opacity-30" aria-label={`Move ${m.title} up`}>
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button type="button" disabled={pending || mi === visible.length - 1} onClick={() => run(moveModuleAction(fd({ courseId, id: m.id, direction: "down" })))} className="rounded p-1 hover:bg-secondary disabled:opacity-30" aria-label={`Move ${m.title} down`}>
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </>
                )}
              </div>

              {open && (
                <ol className="border-t border-border py-1">
                  {m.lessons.length === 0 && <li className="px-7 py-1.5 text-[12px] text-muted-foreground">No lessons</li>}
                  {m.lessons.map((l, li) => {
                    const lsel = selected === `lesson:${l.id}`;
                    return (
                      <li
                        key={l.id}
                        draggable={canEdit}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.effectAllowed = "move";
                          setDrag({ kind: "lesson", id: l.id, moduleId: m.id });
                        }}
                        onDragEnd={() => {
                          setDrag(null);
                          setOver(null);
                        }}
                        onDragOver={(e) => {
                          if (drag?.kind !== "lesson") return;
                          e.preventDefault();
                          e.stopPropagation();
                          setOver(l.id);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOver(null);
                          dropOnLesson(m.id, l.id);
                        }}
                        className={cn("flex items-center gap-1 py-0.5 pl-5 pr-1.5", lsel ? "bg-secondary" : "", over === l.id ? "border-t-2 border-foreground" : "")}
                      >
                        {canEdit && <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-subtle" aria-hidden />}
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATE_DOT[l.state])} title={STATE_WORD[l.state]} aria-hidden />
                        <Link href={`/admin/content/courses/${courseId}?item=lesson:${l.id}`} className={cn("min-w-0 flex-1 truncate py-1 text-[12.5px] hover:underline", l.state === "ARCHIVED" && "text-muted-foreground line-through")}>
                          {l.title}
                          <span className="sr-only"> ({STATE_WORD[l.state]})</span>
                        </Link>
                        {l.hasAssessment && <span className="text-data text-[9.5px] text-subtle" title="Has an assessment">QZ</span>}
                        {l.freePreview && <span className="text-data text-[9.5px] text-subtle" title="Free preview">FREE</span>}
                        {canEdit && !filter && (
                          <>
                            <button type="button" disabled={pending || li === 0} onClick={() => run(moveLessonAction(fd({ courseId, id: l.id, direction: "up" })))} className="rounded p-0.5 hover:bg-secondary disabled:opacity-30" aria-label={`Move ${l.title} up`}>
                              <ChevronUp className="h-3 w-3" aria-hidden />
                            </button>
                            <button type="button" disabled={pending || li === m.lessons.length - 1} onClick={() => run(moveLessonAction(fd({ courseId, id: l.id, direction: "down" })))} className="rounded p-0.5 hover:bg-secondary disabled:opacity-30" aria-label={`Move ${l.title} down`}>
                              <ChevronDown className="h-3 w-3" aria-hidden />
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                  {canEdit && (
                    <li className="pl-5 pr-1.5 pt-1">
                      {adding === m.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const title = new FormData(e.currentTarget).get("title") as string;
                            run(createLessonAction(fd({ moduleId: m.id, title })));
                            setAdding(null);
                          }}
                          className="flex gap-1"
                        >
                          <input name="title" autoFocus required minLength={3} placeholder="Lesson title" aria-label="New lesson title" className="min-h-8 min-w-0 flex-1 rounded-[3px] border border-input bg-card px-2 text-[12.5px]" />
                          <button className="rounded-[3px] bg-primary px-2 text-[12px] text-primary-foreground">Add</button>
                        </form>
                      ) : (
                        <button type="button" onClick={() => setAdding(m.id)} className="inline-flex items-center gap-1 py-1 text-[12px] text-muted-foreground hover:text-foreground">
                          <Plus className="h-3 w-3" aria-hidden /> Add lesson
                        </button>
                      )}
                    </li>
                  )}
                </ol>
              )}
            </li>
          );
        })}
      </ol>

      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const title = new FormData(form).get("title") as string;
            run(createModuleAction(fd({ courseId, title })));
            form.reset();
          }}
          className="flex gap-1 border-t border-border pt-3"
        >
          <input name="title" required minLength={3} placeholder="New module title" aria-label="New module title" className="min-h-9 min-w-0 flex-1 rounded-[3px] border border-input bg-card px-2.5 text-[13px]" />
          <button disabled={pending} className="rounded-[3px] bg-primary px-3 text-[12.5px] font-medium text-primary-foreground">
            Add module
          </button>
        </form>
      )}
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> ready for release ·{" "}
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-input" aria-hidden /> draft ·{" "}
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-danger/60" aria-hidden /> archived
      </p>
    </div>
  );
}
