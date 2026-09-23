import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CursorGlow } from "@/components/site/CursorGlow";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CursorGlow />
      <SiteNav />
      <main className="pt-24 sm:pt-28">{children}</main>
      <SiteFooter />
    </>
  );
}
