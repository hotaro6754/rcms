import { LegalPage, legalMetadata } from "@/components/site/LegalPage";
import { getPageContent } from "@/lib/site/content";
import { legalTermsPage } from "@/lib/site/pages/legal-terms";

export async function generateMetadata() {
  return legalMetadata(await getPageContent(legalTermsPage), "/legal/terms");
}

export default async function TermsPage() {
  return <LegalPage content={await getPageContent(legalTermsPage)} />;
}
