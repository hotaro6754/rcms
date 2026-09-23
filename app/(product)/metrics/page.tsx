import { KpiReview } from "@/components/governance/KpiReview";

export const metadata = { title: "Metrics" };

export default function MetricsPage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <header className="max-w-[68ch]">
        <p className="label-caps">Analytics</p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Metrics</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          Every KPI against its target, with the variance owned and the financial impact attached.
          This is the same table the client sees in the monthly review.
        </p>
      </header>
      <KpiReview />
    </div>
  );
}
