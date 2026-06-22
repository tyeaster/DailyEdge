import type { WeatherReport } from "@/src/types/mlb-dashboard";

import { DashboardCard } from "./dashboard-card";

export function WeatherCard({ report }: { report: WeatherReport }) {
  return (
    <DashboardCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">{report.stadium}</h3>
          <p className="mt-1 text-sm text-slate-400">{report.environment}</p>
        </div>
        <p className="text-2xl font-semibold text-white">{report.temperature}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
        <WeatherLine label="Wind" value={report.windSpeed} />
        <WeatherLine label="Direction" value={report.windDirection} />
        <WeatherLine label="Rain" value={report.rainChance} />
        <WeatherLine label="Impact" value={report.environment} />
      </div>
    </DashboardCard>
  );
}

function WeatherLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}
