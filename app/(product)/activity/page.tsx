import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export const metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <header className="max-w-[68ch]">
        <p className="label-caps">Operations log</p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Activity</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          What the operation did, in the order it did it. Capacity moves, policy intake, quality
          decisions and escalation state changes.
        </p>
      </header>
      <section className="rounded-[var(--radius)] border border-border bg-card p-4">
        <ActivityFeed />
      </section>
    </div>
  );
}
