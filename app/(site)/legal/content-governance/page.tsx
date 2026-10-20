import { LegalPage, legalMetadata } from "@/components/site/LegalPage";
import { getPageContent } from "@/lib/site/content";
import { legalContentGovernancePage } from "@/lib/site/pages/legal-content-governance";

export async function generateMetadata() {
  return legalMetadata(await getPageContent(legalContentGovernancePage), "/legal/content-governance");
}

export default async function ContentGovernancePage() {
  return <LegalPage content={await getPageContent(legalContentGovernancePage)} />;
}
