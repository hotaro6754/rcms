import Image from "next/image";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import analyst from "@/public/images/photos/revenue-cycle-analyst.webp";
import { Chapter } from "./Chapter";

/**
 * "RCM isn't one process." The six things the revenue cycle is instead — a chain, a system, a
 * set of decisions, people, rules and financial outcomes — each with the plain fact that makes
 * it true, set as a grid the reader can take in at a glance. The closing line (we teach the
 * whole picture) sits beside the heading, with a photograph of the work itself.
 *
 * Everything is in normal document flow: no pinning, nothing revealed only by scrolling.
 * Cards enter once in a short stagger (PageReveals, [data-reveal-group]).
 */
export function OpeningStatement({ content: c }: { content: PageContent<typeof homePage>["problem"] }) {
  return (
    <Chapter id="problem" folio="01" title={c.runningHead}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <h2 data-reveal className="text-[clamp(2rem,3.6vw,3rem)] leading-[1.08]">
            {c.title}
          </h2>
          <div data-reveal className="mt-6 border-l-2 border-brand pl-5">
            <p className="text-[19px] font-semibold leading-snug">{c.resolutionTitle}</p>
            <p className="mt-2 max-w-[48ch] text-[16px] leading-relaxed text-muted-foreground">{c.resolutionBody}</p>
          </div>
          <figure data-reveal className="relative mt-10 aspect-[3/2] overflow-hidden rounded-xl bg-muted">
            <Image
              src={analyst}
              alt="A revenue cycle analyst working at a laptop, with a stethoscope on the desk"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
              placeholder="blur"
            />
          </figure>
        </div>

        <ol data-reveal-group className="grid content-start gap-4 sm:grid-cols-2">
          {c.lines.map((l, i) => (
            <li key={i} data-reveal-item className="site-card p-6">
              <p className="tabular text-[12px] font-semibold text-subtle">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-[20px] leading-tight">
                <span className="text-muted-foreground">{l.lead} </span>
                <strong className="font-bold text-foreground">{l.noun}</strong>
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{l.fact}</p>
            </li>
          ))}
        </ol>
      </div>
    </Chapter>
  );
}
