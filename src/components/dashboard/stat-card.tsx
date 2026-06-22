import type { KpiMetric } from "@/src/types/mlb-dashboard";

import { DashboardCard } from "./dashboard-card";

export function StatCard({ metric }: { metric: KpiMetric }) {
  return (
    <DashboardCard className="p-5">
      <p className="text-sm text-slate-500">{metric.label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{metric.value}</p>
      <p className="mt-2 truncate text-sm text-blue-200/90">{metric.meta}</p>
    </DashboardCard>
  );
}
