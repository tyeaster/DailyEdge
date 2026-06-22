import type { GamePreview } from "@/src/types/mlb-dashboard";

import { Badge } from "@/src/components/ui";

import { DashboardCard } from "./dashboard-card";

export function GameCard({ game }: { game: GamePreview }) {
  return (
    <DashboardCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {game.time}
          </p>
          <h3 className="mt-3 text-lg font-semibold text-white">
            {game.awayTeam} at {game.homeTeam}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{game.starters}</p>
        </div>
        <Badge className="border-blue-300/20 bg-blue-400/10 text-blue-100">
          {game.confidence}
        </Badge>
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        <GameLine label="Moneyline" value={game.moneyline} />
        <GameLine label="Spread" value={game.spread} />
        <GameLine label="Total" value={game.total} />
        <GameLine label="Weather" value={game.weatherIcon} />
      </div>
    </DashboardCard>
  );
}

function GameLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.025] px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}
