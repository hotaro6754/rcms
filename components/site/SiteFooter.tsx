import Link from "next/link";
import { whatsappUrl } from "@/lib/contact";
import { FooterLive } from "./footer/FooterLive";
import { FooterNotes } from "./footer/FooterNotes";
import { FooterWordmark } from "./footer/FooterWordmark";

/** The site's index: one ruled row per section, set like the index of a book. */
const INDEX = [
  {
    title: "Learn",
    links: [
      { href: "/learning-paths", label: "Learning paths" },
      { href: "/courses", label: "Programs" },
      { href: "/pricing", label: "Pricing" },
      { href: "/mentoring", label: "1:1 mentoring" },
      { href: "/pricing", label: "Corporate accounts" },
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
      { href: "/about", label: "About the author" },
      { href: "/community", label: "Community" },
      { href: "/blog", label: "Writing" },
    ],
  },
  {
    title: "Contact",
    links: [
      { href: "/contact", label: "Write to us" },
      ...(whatsappUrl() ? [{ href: whatsappUrl()!, label: "WhatsApp" }] : []),
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/refund", label: "Refunds" },
      { href: "/legal/disclaimer", label: "Disclaimer" },
      { href: "/legal/content-governance", label: "Content governance" },
    ],
  },
];

/**
 * The file closes. One ink piece, not a CTA band stacked on a link directory: the claim
 * that opened the page is marked closed and the closing statement answers the hero. Then
 * the monthly letter beside the live facts (the time in India, when sessions run),
 * the site's index as ruled rows, the colophon, and the name set as wide as the page and
 * cut off by its bottom edge. No cards, no pills, no second background.
 */
export function SiteFooter() {
  return (
    <footer data-env="ink" className="editorial env-ink bg-background">
      <div className="mx-auto max-w-[1320px] px-6 pt-24 lg:pt-32">
        <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
          CLAIM #20481 <span aria-hidden="true" className="mx-1.5">·</span> PAID{" "}
          <span aria-hidden="true" className="mx-1.5">·</span> RECONCILED{" "}
          <span aria-hidden="true" className="mx-1.5">·</span> <span className="text-foreground">CLOSED</span>
        </p>

        <h2 className="mt-8 max-w-[18ch] text-[clamp(2.6rem,6vw,5.6rem)] leading-[1]">
          The revenue cycle is complicated. <em>Learning it doesn&rsquo;t have to be.</em>
        </h2>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            href="/learning-paths"
            className="inline-flex min-h-12 items-center rounded-[3px] bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            See the learning levels
          </Link>
          <Link
            href="/mentoring"
            className="inline-flex min-h-12 items-center text-[15px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
          >
            Or talk it through, 1:1
          </Link>
          <Link href="/pricing" className="text-data text-[12px] text-subtle underline-offset-4 hover:underline">
            Pricing
          </Link>
        </div>

        <div className="mt-24 grid gap-14 border-t border-foreground/60 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <FooterNotes />
          <div className="lg:pt-1">
            <FooterLive />
          </div>
        </div>

        {/* Index */}
        <nav aria-label="Site index" className="mt-20 border-t border-foreground/60">
          {INDEX.map((row) => (
            <div key={row.title} className="grid gap-2 border-b border-border py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
              <h3 className="text-data text-[11px] tracking-[0.12em] text-subtle sm:pt-[3px]">{row.title.toUpperCase()}</h3>
              <ul className="flex flex-wrap gap-x-7 gap-y-2">
                {row.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[15px] text-foreground/85 transition-colors hover:text-foreground hover:underline hover:underline-offset-4">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Colophon */}
        <div className="text-data mt-12 grid gap-6 text-[11px] leading-relaxed text-subtle lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
          <p>
            <span className="text-foreground">RCMS Operations Academy</span>
            <br />© 2026. Set in Newsreader and Satoshi.
          </p>
          <p className="max-w-[80ch]">
            Every claim, console and review figure on this site is illustrative teaching data; no
            real patient, provider or payer information is used. Benchmarks referenced from HFMA
            MAP Keys, no affiliation. Training content does not replace payer, CMS, HIPAA, legal,
            compliance or employer-specific guidance.
          </p>
          <a href="#top" className="inline-flex min-h-10 items-start text-foreground transition-opacity hover:opacity-70 lg:justify-self-end">
            BACK TO TOP ↑
          </a>
        </div>

        <FooterWordmark />
      </div>
    </footer>
  );
}
