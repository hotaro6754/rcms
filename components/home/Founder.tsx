import Image from "next/image";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import { Chapter } from "./Chapter";

/**
 * WHO WROTE IT. Set like a colophon at the back of a book: the years in a large numeral on
 * the page itself (no panel behind it), the author's name and focus, one paragraph in their
 * voice, and the experience as a ruled list. Verified facts only (defaults from
 * lib/data/founder.ts). When a portrait is chosen in the website editor it sits above the
 * numeral; until then the type carries the section on its own.
 */
export function Founder({ content: c }: { content: PageContent<typeof homePage>["founder"] }) {
  return (
    <Chapter folio="08" title={c.runningHead} className="border-t border-border">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        {/* The numeral travels with the reading column, so the left half is never a void. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {c.portrait.src && (
            <figure className="photo mb-8 aspect-[4/5] w-full max-w-[20rem] rounded-[4px]">
              {/* Media-library images are served (and access-checked) by /api/media, so they load as they are. */}
              <Image src={c.portrait.src} alt={c.portrait.alt} fill sizes="20rem" unoptimized={c.portrait.src.startsWith("/api/")} className="object-cover" />
            </figure>
          )}
          <p className="font-serif-display text-[clamp(8rem,16vw,14rem)] leading-[0.8] tracking-[-0.04em]">{c.years}</p>
          <p className="text-data mt-5 max-w-[22ch] text-[11px] leading-relaxed tracking-[0.1em] text-subtle">
            {c.yearsCaption}
          </p>
        </div>

        <div>
          <h2 data-reveal className="max-w-[20ch] text-[clamp(2rem,3.2vw,2.9rem)] leading-[1.06]">
            {c.title}
          </h2>
          <p className="mt-8 font-serif-display text-[1.35rem] leading-none">{c.name}</p>
          <p className="text-data mt-2 text-[11px] tracking-[0.06em] text-subtle">{c.focus.toUpperCase()}</p>
          {c.body.map((p, i) => (
            <p key={i} className={`${i ? "mt-4" : "mt-6"} max-w-[58ch] text-[15.5px] leading-relaxed text-secondary-foreground`}>
              {p}
            </p>
          ))}

          <dl className="mt-10 border-t-2 border-foreground">
            {c.career.map((item, i) => (
              <div key={i} className="grid gap-1 border-b border-border py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                <dt className="text-[14px] font-medium">{item.title}</dt>
                <dd className="text-[14px] leading-relaxed text-muted-foreground">{item.body}</dd>
              </div>
            ))}
          </dl>

          <SiteLink
            link={c.cta}
            className="mt-8 inline-flex min-h-11 items-center text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
          />
        </div>
      </div>
    </Chapter>
  );
}
