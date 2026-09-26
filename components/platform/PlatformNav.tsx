"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  /** Match only the exact path (for an area's home). */
  exact?: boolean;
}

/** The area's links. The current one is underlined; nothing else changes. */
export function PlatformNav({ items, mobile = false }: { items: NavItem[]; mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Section" className={cn(mobile ? "flex overflow-x-auto px-4 [scrollbar-width:none]" : "hidden items-center gap-1 md:flex")}>
      {items.map((n) => {
        const on = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 text-[13px] transition-colors md:min-h-9",
              "after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:bg-current after:transition-transform",
              on ? "text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:text-foreground",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
