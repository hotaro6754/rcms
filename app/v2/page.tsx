import { HomeView } from "@/components/atlas/HomeView";
import { NOINDEX } from "@/lib/seo";

/** Design variant of the homepage with a compact, one-screen hero. Kept out of search. */
export const revalidate = 300;
export const metadata = { ...NOINDEX, title: "RCMExcel · v2" };

export default function HomeV2() {
  return <HomeView variant="compact" />;
}
