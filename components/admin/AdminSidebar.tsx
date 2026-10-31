"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Settings,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}
export interface SidebarGroup extends NavLink {
  icon: string;
  links: NavLink[];
}
export interface SidebarSection {
  label: string;
  groups: SidebarGroup[];
}

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  copilot: Sparkles,
  website: Globe,
  courses: GraduationCap,
  assessment: ClipboardCheck,
  subscribers: Users,
  support: LifeBuoy,
  finance: Wallet,
  vendors: Store,
  reports: BarChart3,
  admin: Settings,
};

const matches = (path: string, href: string, exact = false) => path === href || (!exact && path.startsWith(href + "/"));

/** The link that best matches the address: the longest href that is the path or a parent of it. */
function activeHref(path: string, sections: SidebarSection[]) {
  const all = sections.flatMap((s) => s.groups.flatMap((g) => (g.links.length > 1 ? g.links : [g])));
  return all
    .filter((l) => matches(path, l.href, l.href === "/admin"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/**
 * The admin's left-hand navigation: sections, then groups that open into their pages. The
 * group holding the current page is open; others open on click. On narrow screens it is a
 * drawer behind the menu button in the top bar.
 */
export function AdminSidebar({ sections, footer }: { sections: SidebarSection[]; footer: React.ReactNode }) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setDrawer(false);
  }, [path]);

  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:hidden">
        <button type="button" onClick={() => setDrawer(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] hover:bg-secondary" aria-label="Open the admin menu">
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <span className="text-data text-[11px] tracking-[0.14em] text-subtle">ADMIN</span>
      </div>

      {drawer && <div className="fixed inset-0 z-50 bg-foreground/30 lg:hidden" onClick={() => setDrawer(false)} aria-hidden />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0",
          drawer ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Admin"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/admin" className="text-data text-[11px] tracking-[0.14em] text-subtle hover:text-foreground">
            ADMIN CONTROL CENTER
          </Link>
          <button type="button" onClick={() => setDrawer(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] hover:bg-secondary lg:hidden" aria-label="Close the admin menu">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <SidebarNav sections={sections} path={path} />
        <div className="shrink-0 border-t border-border px-4 py-3">
          <Link href="/" className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground" target="_blank">
            View the public site <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
          {footer}
        </div>
      </aside>
    </>
  );
}

function SidebarNav({ sections, path }: { sections: SidebarSection[]; path: string }) {
  const active = activeHref(path, sections);
  const holding = (g: SidebarGroup) => g.links.length > 1 && g.links.some((l) => l.href === active);
  const [open, setOpen] = useState<Set<string>>(() => new Set(sections.flatMap((s) => s.groups.filter(holding).map((g) => g.label))));

  // Moving to a page in another group opens that group too (and keeps the ones opened by hand).
  useEffect(() => {
    const g = sections.flatMap((s) => s.groups).find(holding);
    if (g) setOpen((o) => (o.has(g.label) ? o : new Set(o).add(g.label)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const toggle = (label: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:thin]">
      {sections.map((s) => (
        <div key={s.label} className="mb-4">
          <p className="text-data px-2 pb-1.5 text-[10px] tracking-[0.14em] text-subtle">{s.label.toUpperCase()}</p>
          <ul className="space-y-0.5">
            {s.groups.map((g) => {
              const Icon = ICONS[g.icon] ?? LayoutDashboard;
              if (g.links.length < 2) {
                const on = active === g.href;
                return (
                  <li key={g.href}>
                    <Link href={g.href} aria-current={on ? "page" : undefined} className={row(on)}>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {g.label}
                    </Link>
                  </li>
                );
              }
              const isOpen = open.has(g.label);
              const within = holding(g);
              return (
                <li key={g.label}>
                  <button type="button" onClick={() => toggle(g.label)} aria-expanded={isOpen} className={cn(row(false), within && "text-foreground", "w-full")}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1 text-left">{g.label}</span>
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-90")} aria-hidden />
                  </button>
                  {isOpen && (
                    <ul className="mb-1 ml-[18px] mt-0.5 space-y-0.5 border-l border-border pl-2">
                      {g.links.map((l) => {
                        const on = active === l.href;
                        return (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              aria-current={on ? "page" : undefined}
                              className={cn(
                                "block rounded-[3px] px-2.5 py-1.5 text-[13px] transition-colors",
                                on ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                              )}
                            >
                              {l.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const row = (on: boolean) =>
  cn(
    "flex min-h-9 items-center gap-2.5 rounded-[3px] px-2.5 text-[13.5px] transition-colors",
    on ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
  );
