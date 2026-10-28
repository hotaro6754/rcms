import { getPageContent } from "@/lib/site/content";
import { sitePage } from "@/lib/site/pages/site";
import { SiteNavClient } from "./SiteNavClient";

/** The site's top bar. Loads its copy from the website editor; the bar itself is SiteNavClient. */
export async function SiteNav() {
  const c = await getPageContent(sitePage);
  return <SiteNavClient content={c.nav} />;
}
