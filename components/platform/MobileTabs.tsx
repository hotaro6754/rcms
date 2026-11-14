"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, GraduationCap, LifeBuoy, UserRound, type LucideIcon } from "lucide-react";
import type { NavItem } from "./PlatformNav";
import s from "./mobile-tabs.module.css";

const ICON: Record<string, LucideIcon> = {
  "/academy": GraduationCap,
  "/library": BookOpen,
  "/certificates": Award,
  "/support": LifeBuoy,
  "/account": UserRound,
};

/** Phones: the student's main areas as a thumb-reach tab bar, the way learning apps do it. */
export function MobileTabs({ items }: { items: NavItem[] }) {
  const path = usePathname();
  // Inside a lesson the player owns the screen (its own bar and contents drawer).
  if (items.length < 2 || /^\/academy\/[^/]+\/[^/]+/.test(path)) return null;
  return (
    <nav className={s.bar} aria-label="Main">
      {items.map((it) => {
        const Icon = ICON[it.href] ?? GraduationCap;
        const on = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
        return (
          <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className={s.tab}>
            <span className={s.icon}>
              <Icon aria-hidden />
            </span>
            <span className={s.label}>{it.label.replace(/^My /, "")}</span>
          </Link>
        );
      })}
    </nav>
  );
}
