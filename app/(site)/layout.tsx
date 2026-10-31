import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PreviewBar } from "@/components/site/PreviewBar";
import { ThemeStyle } from "@/components/site/ThemeStyle";
import { PageStyles } from "@/components/site/PageStyles";
import { SiteScope } from "@/components/site/SiteScope";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteScope>
        <SiteNav />
        <main className="editorial pt-24 sm:pt-28">{children}</main>
        <SiteFooter />
      </SiteScope>
      <PreviewBar />
      <ThemeStyle />
      <PageStyles />
    </>
  );
}
