import { LegalPage, legalMetadata } from "@/components/site/LegalPage";
import { getPageContent } from "@/lib/site/content";
import { legalRefundPage } from "@/lib/site/pages/legal-refund";

export async function generateMetadata() {
  return legalMetadata(await getPageContent(legalRefundPage), "/legal/refund");
}

export default async function RefundPage() {
  return <LegalPage content={await getPageContent(legalRefundPage)} />;
}
