import type { Player, PlayerProp, Team } from "@/src/models/mlb";

import { DashboardCard } from "./dashboard-card";

export function PropCard({
  player,
  prop,
  team,
}: {
  player: Player;
  prop: PlayerProp;
  team: Team;
}) {
  return (
    <DashboardCard as="article" className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {prop.category}
          </p>
          <h3 className="mt-3 truncate text-lg font-semibold text-white">
            {player.fullName}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{team.abbreviation}</p>
        </div>
        <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-sm font-semibold text-blue-100">
          {prop.confidence.value}%
        </span>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <PropLine label="Projection" value={prop.projection} />
        <PropLine label="Sportsbook line" value={prop.odds.displayLine} />
        <PropLine label="Edge" value={`+${prop.edge.percentage.toFixed(1)}%`} />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">{prop.reasoning}</p>
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
