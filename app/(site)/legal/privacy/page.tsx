import { LegalPage, legalMetadata } from "@/components/site/LegalPage";
import { getPageContent } from "@/lib/site/content";
import { legalPrivacyPage } from "@/lib/site/pages/legal-privacy";

export async function generateMetadata() {
  return legalMetadata(await getPageContent(legalPrivacyPage), "/legal/privacy");
}

export default async function PrivacyPage() {
  return <LegalPage content={await getPageContent(legalPrivacyPage)} />;
}
