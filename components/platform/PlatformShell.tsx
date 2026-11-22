import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { PlatformNav, type NavItem } from "./PlatformNav";
import { Wordmark } from "@/components/brand/Wordmark";
import { BRAND } from "@/lib/brand";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";
import { MobileTabs } from "./MobileTabs";
import { CommandPalette } from "@/components/command/CommandPalette";

/**
 * The shell for everything behind sign-in: the student academy, Trainer Studio and the
 * admin. Same masthead as the public site (mono RCM, serif Excel), then the area it is,
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
    <div className="rcx flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link href="/" className="flex shrink-0 items-baseline gap-2.5" aria-label={`${BRAND.name}, public site`}>
            <Wordmark />
          </Link>
          <Link href={home} className="text-data hidden shrink-0 border-l border-border pl-5 text-[11px] tracking-[0.14em] text-subtle hover:text-foreground sm:inline">
            {area.toUpperCase()}
          </Link>
          <PlatformNav items={nav} />
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            {switcher?.map((s) => (
              <Link key={s.href} href={s.href} className="text-data hidden text-[11px] tracking-[0.1em] text-subtle hover:text-foreground lg:inline">
                {s.label.toUpperCase()}
              </Link>
            ))}
            <span className="hidden whitespace-nowrap text-[13px] text-muted-foreground lg:inline">
              {user.name}
              {user.role !== "STUDENT" && <span className="text-data ml-2 text-[10.5px] text-subtle">{user.role}</span>}
            </span>
            <span className="hidden sm:inline-flex">
              <CommandPalette
                items={[...nav, ...(switcher ?? [])].map((n) => ({ label: n.label, href: n.href, group: "Go to" }))}
                searches={[{ label: "Search the course catalogue", href: "/catalog?q={q}" }]}
                placeholder="Jump to a page or search courses"
              />
            </span>
            <ThemeSwitch compact />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 pb-28 md:pb-0">{children}</main>
      <MobileTabs items={nav} />
      <footer className="hidden md:block">
        <div className="text-data mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-6 py-5 text-[10.5px] tracking-[0.1em] text-subtle">
          <span>{BRAND.caps}</span>
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
    <div className="flex flex-wrap items-end justify-between gap-6 pb-6">
      <div className="max-w-[62ch]">
        <p className="x-kicker">{kicker}</p>
        <h1 className="x-display mt-3 text-[clamp(2.2rem,4vw,3.4rem)]">{title}</h1>
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
      <div className="flex items-baseline justify-between gap-4 pb-3">
        {/* A running label, not a display heading: kept out of the editorial h2 serif. */}
        <p role="heading" aria-level={2} className="x-lab text-muted-foreground">
          {label}
        </p>
        {aside}
      </div>
      {children}
    </section>
  );
}
