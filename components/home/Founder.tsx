import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import { Chapter } from "./Chapter";

/**
 * WHO WROTE IT. A profile card on the left — the portrait when one is chosen in the website
 * editor, the years in a large figure, the name and focus — and on the right the heading, the
 * author's paragraphs and the experience as a structured list. Verified facts only (defaults
 * from lib/data/founder.ts); no photograph stands in for the author.
 */
export function Founder({ content: c }: { content: PageContent<typeof homePage>["founder"] }) {
  return (
    <Chapter id="author" folio="08" title={c.runningHead}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <aside data-reveal className="site-card self-start overflow-hidden lg:sticky lg:top-24">
          {c.portrait.src && (
            <figure className="relative aspect-[4/3] w-full bg-muted">
              {/* Media-library images are served (and access-checked) by /api/media, so they load as they are. */}
              <Image src={c.portrait.src} alt={c.portrait.alt} fill sizes="(min-width: 1024px) 30vw, 100vw" unoptimized={c.portrait.src.startsWith("/api/")} className="object-cover" />
            </figure>
          )}
          <div className="p-6 sm:p-7">
            <p className="tabular text-[clamp(4rem,8vw,5.5rem)] font-bold leading-none tracking-[-0.04em] text-primary">{c.years}</p>
            <p className="mt-3 max-w-[30ch] text-[12.5px] font-semibold uppercase leading-relaxed tracking-[0.06em] text-subtle">{c.yearsCaption}</p>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-[19px] font-bold">{c.name}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{c.focus}</p>
            </div>
          </div>
        </aside>

        <div>
          <h2 data-reveal className="max-w-[24ch] text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.1]">
            {c.title}
          </h2>
          {c.body.map((p, i) => (
            <p key={i} className={`${i ? "mt-4" : "mt-6"} max-w-[62ch] text-[16px] leading-relaxed text-secondary-foreground`}>
              {p}
            </p>
          ))}
          <dl data-reveal-group className="mt-10 grid gap-3 sm:grid-cols-2">
            {c.career.map((item, i) => (
              <div key={i} data-reveal-item className="rounded-lg border border-border bg-card p-5">
                <dt className="text-[15px] font-bold">{item.title}</dt>
                <dd className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{item.body}</dd>
              </div>
            ))}
          </dl>
          <SiteLink
            link={c.cta}
            className="group mt-8 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-input px-5 text-[15px] font-semibold transition-colors hover:bg-muted"
          >
            {c.cta.label}
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SiteLink>
        </div>
      </div>
    </Chapter>
  );
}
