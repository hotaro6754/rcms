"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import type { SiteContent } from "@/lib/site/pages/site";
import { SiteLink } from "./SiteLink";

/**
 * A ruled masthead: full-width rule and surface once the page has moved, content on the
 * page column.
 *
 * Motion-owned: it hides on downward scroll and returns on upward scroll, so the page
 * gets its full height back while reading and the nav is one gesture away. It stays put
 * near the top of the document and whenever the mobile menu is open.
 *
 * Under reduced motion it simply never hides.
 *
 * Over the ink band ([data-env="ink"]) it takes the ink tokens, so the masthead reads as
 * part of that band. CSS owns that swap; Motion only ever owns the hide/show transform.
 *
 * The copy comes from the website editor, loaded by the server wrapper (SiteNav).
 */
export function SiteNavClient({ content: c }: { content: SiteContent["nav"] }) {
  const links = c.links.map((l) => l.link).filter((l) => l.label.trim());
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [ink, setInk] = useState(false);
  const anchorY = useRef(0);
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const { data: session } = useSession();
  const account = session?.user ? c.account : c.signIn;

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

  // Which environment sits under the nav: a thin band at the top of the viewport.
  useEffect(() => {
    const zones = document.querySelectorAll<HTMLElement>('[data-env="ink"]');
    if (!zones.length) {
      setInk(false);
      return;
    }
    const under = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? under.add(e.target) : under.delete(e.target)));
        setInk(under.size > 0);
      },
      { rootMargin: "0px 0px -92% 0px", threshold: 0 },
    );
    zones.forEach((z) => io.observe(z));
    return () => io.disconnect();
  }, [pathname]);

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? "-160%" : "0%" }}
      transition={{ duration: 0.32, ease: [0.2, 0, 0.1, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300",
        lifted ? "border-border bg-background/95 backdrop-blur-sm" : "border-transparent bg-transparent",
        ink && "env-ink",
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-6">
        {/* Masthead wordmark: set like the header of the claim it teaches from. */}
        <Link href="/" className="flex shrink-0 items-baseline gap-2.5">
          <span className="text-data text-[13px] font-semibold tracking-[0.18em]">{c.brandShort}</span>
          <span className="font-serif-display hidden text-[17px] leading-none sm:inline">{c.brandName}</span>
        </Link>

        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {links.map((l, i) => {
            const active = pathname === l.href;
            return (
              <li key={i}>
                <SiteLink
                  link={l}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-9 items-center px-3 text-[13px] transition-colors after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-[var(--dur-med)] hover:after:scale-x-100",
                    active ? "text-foreground after:scale-x-100" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative">{l.label}</span>
                </SiteLink>
              </li>
            );
          })}
        </ul>

        <SiteLink
          link={account}
          className="ml-auto hidden min-h-9 shrink-0 items-center text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex lg:ml-0"
        />
        <SiteLink
          link={c.cta}
          className="hidden shrink-0 items-center rounded-[3px] bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover sm:inline-flex sm:min-h-9 lg:ml-0"
        />

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="nav-mobile"
          aria-label={open ? c.closeMenu : c.openMenu}
          className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-border text-foreground lg:hidden"
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
          className="mx-auto max-w-[1320px] border-b border-border bg-background px-4 pb-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {links.map((l, i) => (
              <li key={i}>
                <SiteLink
                  link={l}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center border-b border-border px-1 text-[15px] text-secondary-foreground transition-colors hover:text-foreground"
                />
              </li>
            ))}
          </ul>
          <SiteLink
            link={account}
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center rounded-[3px] border border-border px-4 text-[14px]"
          />
          <SiteLink
            link={c.cta}
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center rounded-[3px] bg-primary px-4 text-[14px] font-medium text-primary-foreground"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[3px] border border-border text-[13.5px] text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {c.close}
          </button>
        </motion.div>
      )}
    </motion.header>
  );
}
