"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import s from "./command-palette.module.css";

export interface CommandItem {
  label: string;
  href: string;
  group: string;
  hint?: string;
}

/** A search shortcut: "{q}" in the href is replaced with what was typed. */
export interface CommandSearch {
  label: string;
  href: string;
}

/**
 * ⌘K / Ctrl+K (or "/") opens a quick switcher: jump to any page, or send what you typed to a
 * search (students, the catalogue). Arrow keys move, Enter opens, Esc closes.
 */
export function CommandPalette({ items, searches, placeholder = "Jump to a page or search" }: { items: CommandItem[]; searches: CommandSearch[]; placeholder?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const [mac, setMac] = useState(false);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pages = t ? items.filter((i) => `${i.label} ${i.group} ${i.hint ?? ""}`.toLowerCase().includes(t)) : items;
    const finds = t ? searches.map((x) => ({ label: `${x.label}: “${q.trim()}”`, href: x.href.replace("{q}", encodeURIComponent(q.trim())), group: "Search", hint: undefined })) : [];
    return [...pages.slice(0, 12), ...finds];
  }, [q, items, searches]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const grouped = results.reduce<Record<string, (CommandItem & { index: number })[]>>((acc, r, index) => {
    (acc[r.group] ??= []).push({ ...r, index });
    return acc;
  }, {});

  return (
    <>
      <button type="button" className={s.trigger} onClick={() => setOpen(true)} aria-label="Open quick search">
        <Search aria-hidden />
        <span className={s.triggerText}>Search</span>
        <kbd>{mac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className={s.scrim} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Quick search"
              className={s.panel}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={s.field}>
                <Search aria-hidden />
                <input
                  ref={input}
                  value={q}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="cmd-list"
                  aria-activedescendant={results[active] ? `cmd-${active}` : undefined}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((a) => Math.min(results.length - 1, a + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((a) => Math.max(0, a - 1));
                    } else if (e.key === "Enter" && results[active]) go(results[active].href);
                  }}
                />
                <kbd>Esc</kbd>
              </div>
              <div id="cmd-list" role="listbox" className={s.list}>
                {results.length === 0 && <p className={s.empty}>Nothing matches “{q}”.</p>}
                {Object.entries(grouped).map(([group, rows]) => (
                  <div key={group} className={s.group}>
                    <p className={s.groupLabel}>{group}</p>
                    {rows.map((r) => (
                      <button
                        key={`${r.group}-${r.href}`}
                        id={`cmd-${r.index}`}
                        role="option"
                        aria-selected={r.index === active}
                        type="button"
                        className={s.item}
                        onMouseMove={() => setActive(r.index)}
                        onClick={() => go(r.href)}
                      >
                        <span className={s.itemLabel}>{r.label}</span>
                        {r.hint && <span className={s.itemHint}>{r.hint}</span>}
                        {r.index === active ? <CornerDownLeft aria-hidden className={s.enter} /> : <ArrowRight aria-hidden className={s.arrow} />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className={s.foot}>
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> move
                </span>
                <span>
                  <kbd>↵</kbd> open
                </span>
                <span>
                  <kbd>/</kbd> or <kbd>{mac ? "⌘" : "Ctrl"} K</kbd> anywhere
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
