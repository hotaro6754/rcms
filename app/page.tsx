import { getPageContent } from "@/lib/site/content";
import { homePage } from "@/lib/site/pages/home";
import { pageMeta } from "@/lib/seo";
import { HomeView } from "@/components/atlas/HomeView";

/** The homepage. The shared view lives in components/atlas/HomeView.tsx; /v2 shows the compact hero. */
export const revalidate = 300;

export async function generateMetadata() {
  const c = await getPageContent(homePage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/", absoluteTitle: true });
}

export default function Home() {
  return <HomeView variant="stack" />;
}
