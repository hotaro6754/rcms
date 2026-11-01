import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import cases from "@/public/images/figma/claim-remittance-report.webp";

/**
 * Directly under the hero: what the page covers, as four counts taken from the content itself
 * (the stages in the data, the published levels, the role ladder, the sessions on sale), each a
 * link to its section. Nothing here is a business metric; a count that is zero is left out.
 * The illustration (made with Figma) shows the three documents the page follows: the claim,
 * the remittance and the month-end report.
 */
export function AtAGlance({ caption, items }: { caption: string; items: { count: number; label: string; href: string }[] }) {
  const shown = items.filter((i) => i.count > 0);
  return (
    <section aria-label="At a glance" className="border-b border-border bg-[var(--surface-tint)]">
      <div className="mx-auto grid max-w-[1280px] items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <figure className="hidden lg:block">
          <Image src={cases} alt="" sizes="(min-width: 1280px) 520px, 40vw" className="h-auto w-full" />
          <figcaption className="mt-2 text-[13px] text-subtle">{caption}</figcaption>
        </figure>
        <ul data-reveal-group className="grid grid-cols-2 gap-3">
          {shown.map((i) => (
            <li key={i.href} data-reveal-item>
              <Link href={i.href} data-interactive className="site-card group flex h-full flex-col p-5">
                <span className="tabular text-[2.25rem] font-bold leading-none tracking-[-0.03em] text-primary">{i.count}</span>
                <span className="mt-2 text-[14px] leading-snug text-muted-foreground">{i.label}</span>
                <ArrowRight aria-hidden className="mt-3 h-4 w-4 text-brand transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-subtle lg:hidden">{caption}</p>
      </div>
    </section>
  );
}
