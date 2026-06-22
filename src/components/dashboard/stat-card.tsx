import type { KpiMetric } from "@/src/types/mlb-dashboard";

import { cn } from "@/src/lib/cn";

import { DashboardCard } from "./dashboard-card";

const toneClasses: Record<NonNullable<KpiMetric["tone"]>, string> = {
  amber: "text-amber-100",
  blue: "text-blue-100",
  emerald: "text-emerald-100",
};

export function StatCard({ metric }: { metric: KpiMetric }) {
  return (
    <DashboardCard as="article" className="p-5">
      <p className="text-sm text-slate-500">{metric.label}</p>
      <p
        className={cn(
          "mt-3 text-3xl font-semibold tracking-tight text-white",
          metric.tone && toneClasses[metric.tone],
        )}
      >
        {metric.value}
      </p>
      <p className="mt-2 truncate text-sm text-blue-200/90">{metric.meta}</p>
    </DashboardCard>
  );
}
