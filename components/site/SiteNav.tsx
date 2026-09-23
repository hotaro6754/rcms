"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#top", label: "Overview" },
  { href: "/#metrics", label: "The metric" },
  { href: "/#governance", label: "Governance" },
  { href: "/#tracks", label: "Tracks" },
];

/**
 * Floating pill navigation.
 *
 * Motion-owned: it hides on downward scroll and returns on upward scroll, so the page
 * gets its full height back while reading and the nav is one gesture away. It stays put
 * near the top of the document and whenever the mobile menu is open.
 *
 * Under reduced motion it simply never hides.
 */
export function SiteNav() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const anchorY = useRef(0);
  const { scrollY } = useScroll();
  const pathname = usePathname();

  /**
   * Anchor is the last position at which the nav changed state. We use a generous
   * buffer to eliminate flickering on small scrolls or trackpads.
   */
  useMotionValueEvent(scrollY, "change", (y) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLifted(y > 20);

    if (y < 200 || reduced || open) {
      setHidden(false);
      anchorY.current = y;
    } else if (y > anchorY.current + 50) {
      setHidden(true);
      anchorY.current = y;
    } else if (y < anchorY.current - 40) {
      setHidden(false);
      anchorY.current = y;
    }
  });

  useEffect(() => setOpen(false), [pathname]);

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? "-160%" : "0%" }}
      transition={{ duration: 0.32, ease: [0.2, 0, 0.1, 1] }}
      className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-6"
    >
      <nav
        aria-label="Primary"
        className={cn(
          "mx-auto flex max-w-[76rem] items-center gap-3 rounded-full border border-border px-2 py-2 pl-4 transition-shadow duration-300",
          lifted ? "bg-card/92 shadow-[var(--shadow-lift)] backdrop-blur-xl" : "bg-card/70 backdrop-blur-md",
        )}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="text-data rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-semibold leading-none text-background">
            RCMS
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
            Operations <span className="font-normal text-muted-foreground">Academy</span>
          </span>
        </Link>

        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium transition-colors",
                    active ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative">{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/#governance"
          className="ml-auto hidden shrink-0 items-center rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover sm:inline-flex sm:min-h-10 lg:ml-0"
        >
          Open Governance
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="nav-mobile"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
        >
          {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
        </button>
      </nav>

      {open && (
        <motion.div
          id="nav-mobile"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-auto mt-2 max-w-[76rem] overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-lift)] lg:hidden"
        >
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium text-secondary-foreground transition-colors hover:bg-secondary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/#governance"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-[14px] font-medium text-primary-foreground"
          >
            Open Governance
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-[13.5px] text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Close
          </button>
        </motion.div>
      )}
    </motion.header>
  );
}
