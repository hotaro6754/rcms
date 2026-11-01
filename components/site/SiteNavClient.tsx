"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { gsap } from "@/lib/gsap/register";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import type { SiteContent } from "@/lib/site/pages/site";
import { Wordmark } from "@/components/brand/Wordmark";
import { SiteLink } from "./SiteLink";

type Nav = SiteContent["nav"];
type MenuDef = Nav["menus"][number];

/** The path part of an address, for matching the page being read ("/catalog?level=x" → "/catalog"). */
const pathOf = (href: string) => href.split(/[?#]/)[0] || "/";

/** Items grouped under their column headings, in the order the headings first appear. */
function columns(items: MenuDef["items"]) {
  const out: { heading: string; items: MenuDef["items"] }[] = [];
  for (const it of items) {
    if (!it.link.label.trim()) continue;
    const col = out.find((c) => c.heading === it.group.trim());
    if (col) col.items.push(it);
    else out.push({ heading: it.group.trim(), items: [it] });
  }
  return out;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The site's top bar: the wordmark, the menus, the account link and one button.
 *
 * Desktop: each menu opens a panel under the bar, with the menu's introduction and main link on
 * the left and its items, grouped under column headings, on the right. Panels open on click,
 * on hover (after a short pause, so passing over the bar does not flash them) and from the
 * keyboard; Escape or a click outside closes them and returns focus to the menu's button.
 * A menu with no items is a plain link.
 *
 * Phones and tablets: the menu button opens a full-height sheet where each menu is a section
 * that expands in place.
 *
 * The bar never hides while scrolling: it is always where the reader expects it. GSAP owns
 * the panel's entrance (a short fade and rise, items staggered); under reduced motion it simply
 * appears. Copy comes from the website editor ("Navigation and footer").
 */
export function SiteNavClient({ content: c }: { content: Nav }) {
  const menus = c.menus.filter((m) => m.label.trim());
  const fallback = c.links.map((l) => l.link).filter((l) => l.label.trim());
  const [open, setOpen] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [section, setSection] = useState<number | null>(null);
  const [lifted, setLifted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const account = session?.user ? c.account : c.signIn;
  const bar = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const hoverTimer = useRef<number | undefined>(undefined);
  /** When a panel last opened by hover: a click right after it should not close it again. */
  const hoverOpenedAt = useRef(0);
  const uid = useId();

  const close = useCallback((refocus = false) => {
    setOpen((current) => {
      if (refocus && current !== null) buttons.current[current]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A new page closes everything.
  useEffect(() => {
    setOpen(null);
    setSheet(false);
    setSection(null);
  }, [pathname]);

  // Escape and clicks outside close the desktop panel.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onDown = (e: PointerEvent) => !bar.current?.contains(e.target as Node) && close();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  // The phone sheet locks the page behind it and closes on Escape.
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  // Panel entrance.
  useEffect(() => {
    const el = panel.current;
    if (open === null || !el || reduced()) return;
    const tween = gsap.timeline({ defaults: { ease: "power2.out" } });
    tween
      .fromTo(el, { y: -6 }, { y: 0, duration: 0.2 })
      .fromTo(el.querySelectorAll("[data-menu-item]"), { opacity: 0.3, y: 4 }, { opacity: 1, y: 0, duration: 0.2, stagger: 0.015 }, 0.03);
    return () => {
      tween.kill();
    };
  }, [open]);

  const hoverOpen = (i: number) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      hoverOpenedAt.current = Date.now();
      setOpen(i);
    }, open === null ? 120 : 0);
  };
  const hoverLeave = () => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpen(null), 220);
  };

  const isActive = (m: MenuDef) => {
    const paths = [m.overview.href, ...m.items.map((it) => it.link.href)].map(pathOf).filter((p) => p !== "/");
    return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  };

  const current = open === null ? null : menus[open];

  return (
    <header
      ref={bar}
      onMouseLeave={hoverLeave}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b bg-background transition-[border-color,box-shadow] duration-200",
        lifted || open !== null ? "border-border shadow-[0_1px_3px_rgb(14_26_51/0.06)]" : "border-transparent",
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center rounded-md">
          <Wordmark />
        </Link>

        <ul className="ml-6 hidden items-center gap-0.5 lg:flex">
          {menus.length
            ? menus.map((m, i) => {
                const active = isActive(m);
                if (!m.items.some((it) => it.link.label.trim())) {
                  return (
                    <li key={i}>
                      <SiteLink
                        link={{ label: m.label, href: m.overview.href }}
                        aria-current={active ? "page" : undefined}
                        onMouseEnter={() => close()}
                        className={cn(
                          "inline-flex h-10 items-center rounded-md px-3 text-[14px] font-medium transition-colors hover:bg-muted hover:text-foreground",
                          active ? "text-foreground" : "text-secondary-foreground",
                        )}
                      />
                    </li>
                  );
                }
                const expanded = open === i;
                return (
                  <li key={i} onMouseEnter={() => hoverOpen(i)}>
                    <button
                      ref={(el) => {
                        buttons.current[i] = el;
                      }}
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`${uid}-panel`}
                      onClick={() => {
                        window.clearTimeout(hoverTimer.current);
                        const justHovered = expanded && Date.now() - hoverOpenedAt.current < 500;
                        setOpen(expanded && !justHovered ? null : i);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setOpen(i);
                          requestAnimationFrame(() => panel.current?.querySelector<HTMLAnchorElement>("a")?.focus());
                        }
                      }}
                      className={cn(
                        "relative inline-flex h-10 items-center gap-1 rounded-md px-3 text-[14px] font-medium transition-colors hover:bg-muted hover:text-foreground",
                        expanded || active ? "text-foreground" : "text-secondary-foreground",
                        expanded && "bg-muted",
                      )}
                    >
                      {m.label}
                      <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 opacity-60 transition-transform duration-200", expanded && "rotate-180")} />
                      {active && <span aria-hidden className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand" />}
                    </button>
                  </li>
                );
              })
            : fallback.map((l, i) => (
                <li key={i}>
                  <SiteLink link={l} className="inline-flex h-10 items-center rounded-md px-3 text-[14px] font-medium text-secondary-foreground hover:bg-muted hover:text-foreground" />
                </li>
              ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <SiteLink
            link={account}
            className="hidden h-10 items-center rounded-md px-3 text-[14px] font-medium text-secondary-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          />
          <SiteLink
            link={c.cta}
            className="hidden h-10 items-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover sm:inline-flex"
          />
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-expanded={sheet}
            aria-controls={`${uid}-sheet`}
            aria-label={c.openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground lg:hidden"
          >
            <Menu className="h-4.5 w-4.5" aria-hidden />
          </button>
        </div>
      </nav>

      {/* Desktop panel */}
      {current && (
        <div
          ref={panel}
          id={`${uid}-panel`}
          onMouseEnter={() => window.clearTimeout(hoverTimer.current)}
          className="absolute inset-x-0 top-full hidden border-b border-border bg-background shadow-[0_18px_40px_-24px_rgb(14_26_51/0.28)] lg:block"
        >
          <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="border-r border-border pr-8" data-menu-item>
              <p className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">{current.label}</p>
              {current.intro && <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{current.intro}</p>}
              <SiteLink
                link={current.overview}
                onClick={() => close()}
                className="group mt-5 inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-brand hover:underline hover:underline-offset-4"
              >
                {current.overview.label}
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </SiteLink>
            </div>
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              {columns(current.items).map((col, k) => (
                <div key={k} className={cn(columns(current.items).length === 1 && "md:col-span-2")}>
                  {col.heading && <p className="eyebrow mb-2 px-3">{col.heading}</p>}
                  <ul className={cn("grid gap-0.5", columns(current.items).length === 1 && "md:grid-cols-2")}>
                    {col.items.map((it, j) => (
                      <li key={j} data-menu-item>
                        <SiteLink
                          link={it.link}
                          onClick={() => close()}
                          aria-current={pathOf(it.link.href) === pathname && !it.link.href.includes("#") ? "page" : undefined}
                          className="group block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted focus-visible:bg-muted"
                        >
                          <span className="flex items-center gap-1.5 text-[14.5px] font-medium text-foreground">
                            {it.link.label}
                            <ArrowRight aria-hidden className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                          </span>
                          {it.description && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{it.description}</span>}
                        </SiteLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Phone and tablet sheet */}
      {sheet && (
        <div id={`${uid}-sheet`} role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
            <Link href="/" onClick={() => setSheet(false)} className="flex items-center rounded-md">
              <Wordmark />
            </Link>
            <button
              type="button"
              autoFocus
              onClick={() => setSheet(false)}
              aria-label={c.closeMenu}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border"
            >
              <X className="h-4.5 w-4.5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
            <ul className="divide-y divide-border">
              {(menus.length ? menus : fallback.map((l) => ({ label: l.label, overview: l, intro: "", items: [] }))).map((m, i) => {
                const hasItems = m.items.some((it) => it.link.label.trim());
                if (!hasItems)
                  return (
                    <li key={i}>
                      <SiteLink link={{ label: m.label, href: m.overview.href }} onClick={() => setSheet(false)} className="flex min-h-14 items-center text-[17px] font-semibold" />
                    </li>
                  );
                const expanded = section === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`${uid}-sec-${i}`}
                      onClick={() => setSection(expanded ? null : i)}
                      className="flex min-h-14 w-full items-center justify-between text-left text-[17px] font-semibold"
                    >
                      {m.label}
                      <ChevronDown aria-hidden className={cn("h-4.5 w-4.5 text-subtle transition-transform duration-200", expanded && "rotate-180")} />
                    </button>
                    {expanded && (
                      <div id={`${uid}-sec-${i}`} className="pb-4">
                        {columns(m.items).map((col, k) => (
                          <Fragment key={k}>
                            {col.heading && <p className="eyebrow mt-3 mb-1">{col.heading}</p>}
                            <ul>
                              {col.items.map((it, j) => (
                                <li key={j}>
                                  <SiteLink link={it.link} onClick={() => setSheet(false)} className="block rounded-md py-2.5 pr-2">
                                    <span className="block text-[15px] font-medium">{it.link.label}</span>
                                    {it.description && <span className="block text-[13px] text-muted-foreground">{it.description}</span>}
                                  </SiteLink>
                                </li>
                              ))}
                            </ul>
                          </Fragment>
                        ))}
                        <SiteLink
                          link={m.overview}
                          onClick={() => setSheet(false)}
                          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-brand"
                        >
                          {m.overview.label} <ArrowRight aria-hidden className="h-4 w-4" />
                        </SiteLink>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="grid shrink-0 gap-2 border-t border-border p-4 sm:grid-cols-2 sm:px-6">
            <SiteLink link={account} onClick={() => setSheet(false)} className="flex min-h-12 items-center justify-center rounded-md border border-border text-[15px] font-medium" />
            <SiteLink link={c.cta} onClick={() => setSheet(false)} className="flex min-h-12 items-center justify-center rounded-md bg-primary text-[15px] font-semibold text-primary-foreground" />
          </div>
        </div>
      )}
    </header>
  );
}
