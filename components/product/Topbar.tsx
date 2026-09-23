"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { CLIENT } from "@/lib/data/telemetry";
import { ESCALATIONS } from "@/lib/data/governance";

const TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/metrics": "Metrics",
  "/queues": "Queues",
  "/roster": "Roster",
  "/policy-updates": "Policy updates",
  "/activity": "Activity",
  "/governance": "Governance Room",
};

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Overview";
  const openEscalations = ESCALATIONS.filter((e) => e.status !== "resolved").length;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-micro">
          <span className="text-muted-foreground">{CLIENT.name}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />
          <span className="font-medium text-foreground">{title}</span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <CommandPalette />

          <span className="text-data hidden rounded-md border border-input px-2.5 py-1.5 text-micro text-muted-foreground md:inline">
            {CLIENT.reviewPeriod}
          </span>

          <button
            type="button"
            aria-label={`Notifications, ${openEscalations} open escalations`}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-input transition-colors hover:bg-secondary"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {openEscalations > 0 && (
              <span className="text-data absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                {openEscalations}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label="Account menu"
            className="text-data flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-[11px] font-semibold"
          >
            HS
          </button>
        </div>
      </div>
    </header>
  );
}
