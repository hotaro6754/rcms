import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LEVELS, inr, PROGRAMS } from "@/lib/data/catalog";

const COLUMNS = [
  {
    title: "Learn",
    links: [
      { href: "/learning-paths", label: "Learning paths" },
      { href: "/courses", label: "Programs" },
      { href: "/pricing", label: "Pricing and tracks" },
      { href: "/mentoring", label: "One-to-one mentoring" },
      { href: "/pricing#corporate", label: "Corporate cohorts" },
    ],
  },
  {
    title: "Practice",
    links: [
      { href: "/overview", label: "Operations console" },
      { href: "/governance", label: "Governance Room" },
      { href: "/queues", label: "Denial inventory" },
      { href: "/metrics", label: "KPI library" },
      { href: "/roster", label: "Capacity and roster" },
    ],
  },
  {
    title: "Academy",
    links: [
      { href: "/about", label: "About the founder" },
      { href: "/community", label: "Community" },
      { href: "/blog", label: "Writing" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/terms", label: "Terms and conditions" },
      { href: "/legal/refund", label: "Refund policy" },
      { href: "/legal/disclaimer", label: "Disclaimer" },
    ],
  },
];

export function SiteFooter() {
  const cheapest = Math.min(...PROGRAMS.map((p) => p.price));

  return (
    <footer className="border-t border-border">
      {/* Closing argument. A single dark band anchors the page and gives the last
          call to action somewhere to sit that is not another white card. */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-[1320px] px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
            <div>
              <p className="text-data text-[12.5px] tracking-[0.02em] text-background/60">
                Next cohort opens 6 October 2026
              </p>
              <h2 className="mt-6 max-w-[18ch] text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.02] text-background">
                The next promotion is a metrics conversation.
              </h2>
            </div>
            <div>
              <p className="max-w-[46ch] text-[14.5px] leading-relaxed text-background/70">
                Start where you actually are. The five levels map what you own now against what
                the role above expects, and programs begin at {inr(cheapest)}.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/learning-paths"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-background px-5 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
                >
                  Find your level
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/mentoring"
                  className="inline-flex min-h-11 items-center rounded-full border border-background/25 px-5 text-sm font-medium text-background transition-colors hover:bg-background/10"
                >
                  Book mentoring
                </Link>
              </div>
            </div>
          </div>

          {/* The five levels restated as the closing thesis. */}
          <ol id="levels" className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-background/15 bg-background/15 sm:grid-cols-2 lg:grid-cols-5">
            {LEVELS.map((l) => (
              <li
                key={l.n}
                className="group bg-foreground px-5 py-5 transition-colors duration-200 hover:!bg-white cursor-pointer"
              >
                <span className="text-data text-micro text-background/45 transition-colors duration-200 group-hover:!text-neutral-500">
                  {String(l.n).padStart(2, "0")}
                </span>
                <p className="mt-2 text-[15px] font-semibold text-background transition-colors duration-200 group-hover:!text-neutral-950">
                  {l.verb}
                </p>
                <p className="mt-1.5 text-micro leading-relaxed text-background/60 transition-colors duration-200 group-hover:!text-neutral-600">
                  {l.title}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Directory */}
      <div className="bg-secondary">
        <div className="mx-auto max-w-[1320px] px-6 py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="text-data rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-semibold leading-none text-background">
                  RCMS
                </span>
                <span className="text-[15px] font-semibold tracking-tight">
                  Operations <span className="font-normal text-muted-foreground">Academy</span>
                </span>
              </Link>
              <p className="mt-4 max-w-[38ch] text-micro leading-relaxed text-muted-foreground">
                Structured training for US healthcare revenue cycle professionals, from first job
                to executive accountability. Built by a practitioner still on the floor.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href="https://wa.me/919999999999"
                  className="inline-flex min-h-10 items-center rounded-full border border-input bg-card px-4 text-micro font-medium transition-colors hover:bg-background"
                >
                  WhatsApp
                </a>
                <Link
                  href="/contact"
                  className="inline-flex min-h-10 items-center rounded-full border border-input bg-card px-4 text-micro font-medium transition-colors hover:bg-background"
                >
                  Email
                </Link>
              </div>
            </div>

            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="label-caps">{col.title}</h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[13.5px] text-secondary-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-border pt-6 text-micro text-muted-foreground lg:flex-row lg:items-start lg:justify-between">
            <span>© 2026 RCMS Operations Academy. All rights reserved.</span>
            <p className="max-w-[70ch] leading-relaxed">
              Console and Governance Room figures are illustrative teaching data; no real patient,
              provider or payer information is used anywhere on this site. Benchmarks referenced
              from HFMA MAP Keys, no affiliation. Training content does not replace payer, CMS,
              HIPAA, legal, compliance or employer-specific guidance.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
