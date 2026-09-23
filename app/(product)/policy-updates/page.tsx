import { StubSurface } from "@/components/product/StubSurface";
import { METRICS } from "@/lib/data/telemetry";
import { money } from "@/lib/utils";

export const metadata = { title: "Policy updates" };

export default function PolicyUpdatesPage() {
  const denial = METRICS["denial-rate"];

  return (
    <StubSurface
      title="Payer policy updates"
      summary="The register that did not exist in August. One unmapped bulletin produced the entire denial spike, so this surface is the control that closes the gap: every payer bulletin logged, mapped to the workflows it touches, with an owner and a live date."
      facts={[
        { label: "Bulletins this quarter", value: "9", note: "1 unmapped at the time of the spike" },
        { label: "Unmapped today", value: "0", note: "2026-14 logged retroactively" },
        {
          label: "Claims affected",
          value: denial.narrative.affectedClaims?.toLocaleString("en-US") ?? "—",
          note: "Aetna commercial, CO-50",
        },
        {
          label: "Revenue at risk",
          value: money(denial.narrative.financialImpact ?? 0),
          note: "68% historical overturn",
        },
      ]}
      planned={[
        "Bulletin intake queue with a named owner and an SLA on mapping",
        "Diff view: which CPT and HCPCS codes a bulletin adds or removes",
        "Workflow impact map, so a change shows every trigger it touches",
        "Effective-date tracking with retroactive exposure calculated automatically",
        "Alerting when a denial pattern matches an unmapped bulletin",
        "Audit trail for the client review",
      ]}
    />
  );
}
