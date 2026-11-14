import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small presentational pieces shared by the admin, learner and vendor areas. Server-safe.
 */

export const FIELD =
  "min-h-11 w-full rounded-xl border border-transparent bg-secondary px-3.5 text-[14px] outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
export const TEXTAREA =
  "w-full rounded-xl border border-transparent bg-secondary px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
export const BTN =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground transition-[transform,background-color] hover:-translate-y-px hover:bg-primary-hover disabled:opacity-50";
export const BTN_OUTLINE =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-secondary px-5 text-[13.5px] font-semibold transition-colors hover:bg-muted disabled:opacity-50";
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
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", TONES[tone] ?? TONES.grey, className)}>{children}</span>;
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
    <nav aria-label="Section pages" className="mb-8 flex flex-wrap gap-1.5">
      {shown.map((i) => {
        const on = current === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={cn("rounded-full px-4 py-2 text-[13px] font-semibold transition-colors", on ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground")}
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
    <div className="rounded-[20px] bg-card px-5 py-10 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-[56ch] text-micro leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Panel({ title, aside, children, className }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[20px] bg-card", className)}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <h2 className="x-lab">{title}</h2>
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
      <dt className="x-lab text-muted-foreground">{label}</dt>
      <dd className="x-fig mt-3 text-[clamp(2.2rem,3.4vw,3rem)]">{value}</dd>
      {note && <dd className="mt-1.5 text-[12.5px] text-muted-foreground">{note}</dd>}
    </>
  );
  const list = <dl>{body}</dl>;
  return <div className="rounded-[20px] bg-card p-4">{href ? <Link href={href} className="block hover:opacity-80">{list}</Link> : list}</div>;
}

export function Table({ head, children, empty, minWidth = "48rem" }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-[20px] bg-card p-1.5">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="label-caps px-4 py-2.5 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:hover]:bg-secondary/60 [&>tr]:border-t [&>tr]:border-border">{children}</tbody>
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
