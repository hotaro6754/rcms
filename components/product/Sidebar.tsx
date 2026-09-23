"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Activity,
  ClipboardCheck,
  FileWarning,
  Gauge,
  LayoutGrid,
  ListChecks,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIENT } from "@/lib/data/telemetry";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/metrics", label: "Metrics", icon: Gauge },
  { href: "/queues", label: "Queues", icon: ListChecks },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/policy-updates", label: "Policy updates", icon: FileWarning },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="border-b border-border p-3">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md border border-border px-2.5 py-2 text-left transition-colors hover:bg-secondary"
        >
          <span className="text-data flex h-7 w-7 shrink-0 items-center justify-center rounded bg-foreground text-[10px] font-semibold text-background">
            MC
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium">{CLIENT.name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {CLIENT.providers} providers
            </span>
          </span>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-secondary"
                  transition={{ duration: 0.22, ease: [0.2, 0, 0.1, 1] }}
                />
              )}
              <Icon className="relative h-4 w-4 shrink-0" aria-hidden />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}

        <div className="mt-4 px-2.5 pb-1">
          <span className="label-caps text-[11px]">Review</span>
        </div>
        <Link
          href="/governance"
          aria-current={pathname === "/governance" ? "page" : undefined}
          className={cn(
            "relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors",
            pathname === "/governance"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />
          Governance Room
        </Link>
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="text-micro text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to the Academy
        </Link>
      </div>
    </aside>
  );
}
