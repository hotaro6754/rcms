import { LegalPage, legalMetadata } from "@/components/site/LegalPage";
import { getPageContent } from "@/lib/site/content";
import { legalDisclaimerPage } from "@/lib/site/pages/legal-disclaimer";

export async function generateMetadata() {
  return legalMetadata(await getPageContent(legalDisclaimerPage));
}

export default async function DisclaimerPage() {
  return <LegalPage content={await getPageContent(legalDisclaimerPage)} />;
}
