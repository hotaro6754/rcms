import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PreviewBar } from "@/components/site/PreviewBar";
import { ThemeStyle } from "@/components/site/ThemeStyle";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="editorial pt-24 sm:pt-28">{children}</main>
      <SiteFooter />
      <PreviewBar />
      <ThemeStyle />
    </>
  );
}
