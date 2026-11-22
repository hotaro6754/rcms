import { PreviewBar } from "@/components/site/PreviewBar";
import { ThemeStyle } from "@/components/site/ThemeStyle";
import { PageStyles } from "@/components/site/PageStyles";
import { SiteScope } from "@/components/site/SiteScope";
import { AtlasFooter, AtlasHeader } from "@/components/atlas/Chrome";
import { Preloader } from "@/components/atlas/Preloader";

/**
 * Every public page under app/(site) shares the homepage's Atlas chrome (top bar and footer)
 * and the Atlas tokens set on .site-scope in app/globals.css, so the whole site reads as one
 * brand. The website editor's theme and per-page styles still apply on top.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteScope>
        <Preloader />
        <AtlasHeader />
        <main className="editorial pt-24 sm:pt-28">{children}</main>
        <AtlasFooter />
      </SiteScope>
      <PreviewBar />
      <ThemeStyle />
      <PageStyles />
    </>
  );
}
