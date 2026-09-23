import type { Metadata } from "next";
import { GovernanceRoom } from "@/components/governance/GovernanceRoom";
import { CLIENT } from "@/lib/data/telemetry";

export const metadata: Metadata = {
  title: `Governance Room — ${CLIENT.reviewPeriod}`,
  description:
    "Conduct the monthly operating review: KPI variance, escalations, root cause, risk, capacity and the actions you leave with.",
};

export default function GovernancePage() {
  return <GovernanceRoom />;
}
