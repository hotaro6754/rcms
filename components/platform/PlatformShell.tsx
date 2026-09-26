import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { PlatformNav, type NavItem } from "./PlatformNav";

/**
 * The shell for everything behind sign-in: the student academy, Trainer Studio and the
 * admin. Same masthead as the public site (mono RCMS, serif name), then the area it is,
 * set as a running head, the area's links, and who is signed in. Ruled, flat, no pills.
 */
export function PlatformShell({
  area,
  home,
  nav,
  user,
  switcher,
  children,
}: {
  area: string;
  home: string;
  nav: NavItem[];
  user: { name: string; role: string };
  /** Links to the other areas this person can open (studio, admin, academy). */
  switcher?: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="editorial flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-6">
          <Link href="/" className="flex shrink-0 items-baseline gap-2.5" aria-label="RCMS Operations Academy, public site">
            <span className="text-data text-[13px] font-semibold tracking-[0.18em]">RCMS</span>
            <span className="font-serif-display hidden text-[17px] leading-none md:inline">Operations Academy</span>
          </Link>
          <Link href={home} className="text-data shrink-0 border-l border-border pl-5 text-[11px] tracking-[0.14em] text-subtle hover:text-foreground">
            {area.toUpperCase()}
          </Link>
          <PlatformNav items={nav} />
          <div className="ml-auto flex items-center gap-5">
            {switcher?.map((s) => (
              <Link key={s.href} href={s.href} className="text-data hidden text-[11px] tracking-[0.1em] text-subtle hover:text-foreground lg:inline">
                {s.label.toUpperCase()}
              </Link>
            ))}
            <span className="hidden text-[13px] text-muted-foreground sm:inline">
              {user.name}
              {user.role !== "STUDENT" && <span className="text-data ml-2 text-[10.5px] text-subtle">{user.role}</span>}
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="border-t border-border md:hidden">
          <PlatformNav items={nav} mobile />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="text-data mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-6 py-5 text-[10.5px] tracking-[0.1em] text-subtle">
          <span>RCMS OPERATIONS ACADEMY</span>
          <span className="flex gap-5">
            <Link href="/contact" className="hover:text-foreground">HELP</Link>
            <Link href="/legal/terms" className="hover:text-foreground">TERMS</Link>
            <Link href="/legal/privacy" className="hover:text-foreground">PRIVACY</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** A page's opening inside the platform: running head, serif title, optional lede and actions. */
export function PageHead({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
      <div className="max-w-[62ch]">
        <p className="text-data text-[11px] tracking-[0.14em] text-subtle">{kicker.toUpperCase()}</p>
        <h1 className="mt-3 text-[clamp(2rem,3.6vw,3rem)] leading-[1.04]">{title}</h1>
        {lede && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-4">{actions}</div>}
    </div>
  );
}

/** A labelled, ruled section: the platform's replacement for a card. */
export function Ruled({ label, aside, children, className }: { label: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-foreground pb-2">
        {/* A running label, not a display heading: kept out of the editorial h2 serif. */}
        <p role="heading" aria-level={2} className="text-data text-[10.5px] tracking-[0.14em] text-subtle">
          {label.toUpperCase()}
        </p>
        {aside}
      </div>
      {children}
    </section>
  );
}
