import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small presentational pieces shared by the admin, learner and vendor areas. Server-safe.
 */

export const FIELD =
  "min-h-10 w-full rounded-[3px] border border-input bg-card px-3 text-[14px] outline-none transition-colors focus:border-foreground focus-visible:ring-2 focus-visible:ring-ring/40";
export const TEXTAREA =
  "w-full rounded-[3px] border border-input bg-card px-3 py-2 text-[14px] leading-relaxed outline-none transition-colors focus:border-foreground focus-visible:ring-2 focus-visible:ring-ring/40";
export const BTN =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[3px] bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50";
export const BTN_OUTLINE =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[3px] border border-input bg-card px-4 text-[13.5px] font-medium transition-colors hover:bg-secondary disabled:opacity-50";
export const LINK = "underline decoration-input underline-offset-4 hover:decoration-foreground";

export function Field({ label, hint, children, htmlFor, className }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-micro font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-[13.5px]">
      <input type="hidden" name={name} value="" />
      <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
      <span>
        {label}
        {hint && <span className="block text-[12px] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

const TONES: Record<string, string> = {
  green: "bg-success-bg text-success",
  amber: "bg-warning-bg text-warning",
  red: "bg-danger-bg text-danger",
  grey: "bg-secondary text-secondary-foreground",
  ink: "bg-foreground text-background",
};

export function Pill({ children, tone = "grey", className }: { children: ReactNode; tone?: keyof typeof TONES | string; className?: string }) {
  return <span className={cn("text-data inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10.5px] uppercase tracking-[0.06em]", TONES[tone] ?? TONES.grey, className)}>{children}</span>;
}

const STATUS_TONE: Record<string, string> = {
  PUBLISHED: "green",
  APPROVED: "green",
  ACTIVE: "green",
  GRADED: "green",
  EXECUTED: "green",
  PAID: "green",
  RESOLVED: "green",
  CONFIRMED: "green",
  ACCEPTED: "green",
  COMPLETED: "green",
  RECONCILED: "green",
  SCHEDULED: "ink",
  ACADEMIC_REVIEW: "amber",
  COMPLIANCE_REVIEW: "amber",
  UNDER_REVISION: "amber",
  IN_DEVELOPMENT: "grey",
  PENDING: "amber",
  PENDING_REVIEW: "amber",
  REQUESTED: "amber",
  SUBMITTED: "amber",
  WAITING: "amber",
  ESCALATED: "red",
  SUSPENDED: "red",
  REJECTED: "red",
  FAILED: "red",
  ARCHIVED: "grey",
  DRAFT: "grey",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <Pill tone={STATUS_TONE[status] ?? "grey"}>{label ?? status.replace(/_/g, " ").toLowerCase()}</Pill>;
}

export function SubNav({ items, current }: { items: { href: string; label: string; show?: boolean }[]; current?: string }) {
  const shown = items.filter((i) => i.show !== false);
  if (shown.length < 2) return null;
  return (
    <nav aria-label="Section pages" className="mb-8 flex flex-wrap gap-x-1 gap-y-1 border-b border-border">
      {shown.map((i) => {
        const on = current === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors", on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-8 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-[56ch] text-micro leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Panel({ title, aside, children, className }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius)] border border-border bg-card", className)}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          {aside}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, note, href }: { label: string; value: ReactNode; note?: ReactNode; href?: string }) {
  const body = (
    <>
      <dt className="text-data text-[10.5px] tracking-[0.12em] text-subtle">{label.toUpperCase()}</dt>
      <dd className="font-serif-display mt-2 text-[clamp(1.9rem,3vw,2.6rem)] leading-none">{value}</dd>
      {note && <dd className="mt-1.5 text-[12.5px] text-muted-foreground">{note}</dd>}
    </>
  );
  const list = <dl>{body}</dl>;
  return <div className="border-t-2 border-foreground pb-5 pr-4 pt-3">{href ? <Link href={href} className="block hover:opacity-80">{list}</Link> : list}</div>;
}

export function Table({ head, children, empty, minWidth = "48rem" }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead className="border-b border-border">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="label-caps px-4 py-2.5 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-2.5 align-top", className)}>
      {children}
    </td>
  );
}

export const DATE = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
export const DATETIME = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function when(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const v = typeof d === "string" ? new Date(d) : d;
  return (withTime ? DATETIME : DATE).format(v);
}

export function inr(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return "—";
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });
}

export function dateInput(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}
