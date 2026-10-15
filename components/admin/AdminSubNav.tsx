"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Link_ {
  href: string;
  label: string;
}

/** The second row of the admin navigation: the pages inside the current section. */
export function AdminSubNav({ groups }: { groups: (Link_ & { links: Link_[] })[] }) {
  const path = usePathname();
  const group = [...groups]
    .filter((g) => g.href !== "/admin")
    .sort((a, b) => b.href.length - a.href.length)
    .find((g) => path === g.href || path.startsWith(g.href + "/") || g.links.some((l) => path === l.href || path.startsWith(l.href + "/")));
  if (!group || group.links.length < 2) return null;
  const active = [...group.links].sort((a, b) => b.href.length - a.href.length).find((l) => path === l.href || path.startsWith(l.href + "/"));
  return (
    <nav aria-label={`${group.label} pages`} className="flex flex-wrap gap-x-1 border-b border-border">
      {group.links.map((l) => {
        const on = active?.href === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors", on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
