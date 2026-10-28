import { Fragment } from "react";
import { whatsappUrl } from "@/lib/contact";
import { getPageContent } from "@/lib/site/content";
import { sitePage } from "@/lib/site/pages/site";
import { SiteLink } from "./SiteLink";
import { FooterLive } from "./footer/FooterLive";
import { FooterNotes } from "./footer/FooterNotes";
import { FooterWordmark } from "./footer/FooterWordmark";

/**
 * The file closes. One ink piece, not a CTA band stacked on a link directory: the claim
 * that opened the page is marked closed and the closing statement answers the hero. Then
 * the monthly letter beside the live facts (the time in India, when sessions run),
 * the site's index as ruled rows, the colophon, and the name set as wide as the page and
 * cut off by its bottom edge. No cards, no pills, no second background.
 *
 * The copy comes from the website editor ("Navigation and footer").
 */
export async function SiteFooter() {
  const c = await getPageContent(sitePage);
  const whatsapp = whatsappUrl();
  const rows = c.index.rows.map((row) => ({
    title: row.title,
    links: [
      ...row.links.map((l) => l.link),
      ...(row.whatsapp && whatsapp ? [{ href: whatsapp, label: c.index.whatsappLabel }] : []),
    ],
  }));
  const status = c.closing.status;
  return (
    <footer data-env="ink" className="editorial env-ink bg-background">
      <div className="mx-auto max-w-[1320px] px-6 pt-24 lg:pt-32">
        {c.closing.show && (
          <>
            {status.length > 0 && (
              <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
                {status.map((item, i) => (
                  <Fragment key={i}>
                    {i > 0 && (
                      <>
                        {" "}
                        <span aria-hidden="true" className="mx-1.5">·</span>{" "}
                      </>
                    )}
                    {i === status.length - 1 && status.length > 1 ? <span className="text-foreground">{item}</span> : item}
                  </Fragment>
                ))}
              </p>
            )}

            <h2 className="mt-8 max-w-[18ch] text-[clamp(2.6rem,6vw,5.6rem)] leading-[1]">
              {c.closing.title}
              {c.closing.emphasis && (
                <>
                  {" "}
                  <em>{c.closing.emphasis}</em>
                </>
              )}
            </h2>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              <SiteLink
                link={c.closing.primary}
                className="inline-flex min-h-12 items-center rounded-[3px] bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              />
              <SiteLink
                link={c.closing.secondary}
                className="inline-flex min-h-12 items-center text-[15px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
              />
              <SiteLink link={c.closing.tertiary} className="text-data text-[12px] text-subtle underline-offset-4 hover:underline" />
            </div>
          </>
        )}

        <div className="mt-24 grid gap-14 border-t border-foreground/60 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          {c.notes.show && <FooterNotes content={c.notes} />}
          {c.live.show && (
            <div className="lg:pt-1">
              <FooterLive content={c.live} />
            </div>
          )}
        </div>

        {/* Index */}
        <nav aria-label="Site index" className="mt-20 border-t border-foreground/60">
          {rows.map((row, r) => (
            <div key={r} className="grid gap-2 border-b border-border py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
              <h3 className="text-data text-[11px] tracking-[0.12em] text-subtle sm:pt-[3px]">{row.title.toUpperCase()}</h3>
              <ul className="flex flex-wrap gap-x-7 gap-y-2">
                {row.links.map((l, i) => (
                  <li key={i}>
                    <SiteLink link={l} className="text-[15px] text-foreground/85 transition-colors hover:text-foreground hover:underline hover:underline-offset-4" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Colophon */}
        <div className="text-data mt-12 grid gap-6 text-[11px] leading-relaxed text-subtle lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
          <p>
            <span className="text-foreground">{c.colophon.name}</span>
            <br />
            {c.colophon.line}
          </p>
          <p className="max-w-[80ch]">{c.colophon.disclaimer}</p>
          <SiteLink
            link={c.colophon.backToTop}
            className="inline-flex min-h-10 items-start text-foreground transition-opacity hover:opacity-70 lg:justify-self-end"
          />
        </div>

        {c.wordmark.show && <FooterWordmark text={c.wordmark.text} />}
      </div>
    </footer>
  );
}
