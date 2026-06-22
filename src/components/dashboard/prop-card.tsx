import type { PitcherProp } from "@/src/types/mlb-dashboard";

import { DashboardCard } from "./dashboard-card";

export function PropCard({ prop }: { prop: PitcherProp }) {
  return (
    <DashboardCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Pitcher Prop
          </p>
          <h3 className="mt-3 text-lg font-semibold text-white">{prop.pitcher}</h3>
        </div>
        <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-sm font-semibold text-blue-100">
          {prop.confidence}
        </span>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <PropLine label="Projection" value={prop.projection} />
        <PropLine label="Vegas line" value={prop.vegasLine} />
        <PropLine label="Edge" value={prop.edge} />
        <PropLine label="Opponent K%" value={prop.opponentKRate} />
      </div>
    </DashboardCard>
  );
}

function PropLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}
