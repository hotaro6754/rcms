"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";

/**
 * Motion-owned. No GSAP anywhere in this subtree — see lib/animation-ownership.md.
 */
const COMMANDS = [
  { label: "Open Governance Room", hint: "September review", href: "/governance" },
  { label: "Review denials", hint: "CO-50 under RCA", href: "/queues" },
  { label: "Open A/R worklist", hint: "9,400 open claims", href: "/queues" },
  { label: "View payer changes", hint: "Bulletin 2026-14", href: "/policy-updates" },
  { label: "Find client", hint: "Meridian Cardiology", href: "/overview" },
  { label: "Jump to KPI", hint: "Days in A/R", href: "/metrics" },
  { label: "Create action", hint: "Assign owner and date", href: "/governance" },
  { label: "Export review", hint: "PDF for the client", href: "/governance" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-9 w-full max-w-72 items-center gap-2 rounded-md border border-input bg-card px-2.5 text-left text-micro text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Search or jump to…</span>
        <kbd className="text-data ml-auto rounded border border-border px-1.5 py-0.5 text-[11px]">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-foreground/25 p-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-lg overflow-hidden rounded-[var(--radius)] border border-border bg-popover shadow-[var(--shadow-md)]"
              initial={{ opacity: 0, y: -8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0.1, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Command label="Command palette" loop>
                <div className="flex items-center gap-2 border-b border-border px-3">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <Command.Input
                    autoFocus
                    placeholder="Search commands…"
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Command.List className="max-h-80 overflow-y-auto p-1.5">
                  <Command.Empty className="px-3 py-6 text-center text-micro text-muted-foreground">
                    Nothing matches that.
                  </Command.Empty>
                  {COMMANDS.map((c) => (
                    <Command.Item
                      key={c.label}
                      value={`${c.label} ${c.hint}`}
                      onSelect={() => {
                        setOpen(false);
                        router.push(c.href);
                      }}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2.5 text-[13.5px] data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                    >
                      <span>{c.label}</span>
                      <span className="text-data text-micro text-muted-foreground">{c.hint}</span>
                    </Command.Item>
                  ))}
                </Command.List>
              </Command>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
