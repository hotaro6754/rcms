"use client";

import { usePathname } from "next/navigation";

/**
 * Marks the public site with the current address, so a page's own style (PageStyles) applies
 * to that page only. It wraps the navigation, page and footer, and paints the background
 * itself so a page's background colour fills the whole window.
 */
export function SiteScope({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="site-scope min-h-dvh bg-background text-foreground" data-site-path={path}>
      {children}
    </div>
  );
}
