"use client";

import { useEffect, useState } from "react";
import { NEXT_COHORT } from "@/lib/data/catalog";

const IST = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * The footer's live facts: the time in India now (sessions run in IST, evenings and
 * Saturday mornings), and how far away the next cohort is. Rendered empty on the server
 * and filled on mount, so the markup never disagrees with the clock.
 */
export function FooterLive() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const days = now ? Math.ceil((new Date(`${NEXT_COHORT.iso}T00:00:00+05:30`).getTime() - now.getTime()) / 86_400_000) : null;

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 text-[14px] sm:grid-cols-[repeat(3,auto)] sm:justify-start sm:gap-x-14">
      <div>
        <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">IN INDIA NOW</dt>
        <dd className="text-data mt-2 text-[1.6rem] leading-none tabular-nums" suppressHydrationWarning>
          {now ? IST.format(now) : "--:--"}
          <span className="ml-1.5 text-[11px] text-subtle">IST</span>
        </dd>
      </div>
      <div>
        <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">NEXT COHORT</dt>
        <dd className="text-data mt-2 text-[1.6rem] leading-none tabular-nums">
          {days === null ? "--" : days > 0 ? days : 0}
          <span className="ml-1.5 text-[11px] text-subtle">{days === 1 ? "DAY" : "DAYS"} · {NEXT_COHORT.label.toUpperCase()}</span>
        </dd>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">SESSIONS</dt>
        <dd className="mt-2 leading-snug text-foreground/85">Weekday evenings and Saturday mornings, IST</dd>
      </div>
    </dl>
  );
}
