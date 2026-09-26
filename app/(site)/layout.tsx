import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="editorial pt-24 sm:pt-28">{children}</main>
      <SiteFooter />
    </>
  );
}
