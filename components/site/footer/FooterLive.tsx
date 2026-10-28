"use client";

import { useEffect, useState } from "react";
import type { SiteContent } from "@/lib/site/pages/site";

const IST = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * The footer's live facts: the time in India now (sessions run in IST, evenings and
 * Saturday mornings) and how learning runs. Rendered empty on the server
 * and filled on mount, so the markup never disagrees with the clock.
 */
export function FooterLive({ content: c }: { content: SiteContent["live"] }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 text-[14px] sm:grid-cols-[repeat(3,auto)] sm:justify-start sm:gap-x-14">
      <div>
        <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">{c.timeLabel}</dt>
        <dd className="text-data mt-2 text-[1.6rem] leading-none tabular-nums" suppressHydrationWarning>
          {now ? IST.format(now) : "--:--"}
          <span className="ml-1.5 text-[11px] text-subtle">{c.timeZone}</span>
        </dd>
      </div>
      <div>
        <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">{c.coursesLabel}</dt>
        <dd className="mt-2 leading-snug text-foreground/85">{c.courses}</dd>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">{c.sessionsLabel}</dt>
        <dd className="mt-2 leading-snug text-foreground/85">{c.sessions}</dd>
      </div>
    </dl>
  );
}
