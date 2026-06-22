import type { BetPreview } from "@/src/types/mlb-dashboard";

import { Badge } from "@/src/components/ui";

import { DashboardCard } from "./dashboard-card";

export function BetCard({ bet }: { bet: BetPreview }) {
  return (
    <DashboardCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {bet.betType}
          </p>
          <h3 className="mt-3 truncate text-lg font-semibold text-white">{bet.player}</h3>
          <p className="mt-1 text-sm text-blue-200">{bet.sportsbookLine}</p>
        </div>
        <Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
          {bet.recommendedUnits}
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniMetric label="Projection" value={bet.modelProjection} />
        <MiniMetric label="Edge" value={bet.edge} />
        <MiniMetric label="Conf." value={bet.confidence} />
      </div>
    </DashboardCard>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
