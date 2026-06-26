import Link from "next/link";

import type { BetRecommendation, Pitcher, Player, Team } from "@/src/models/mlb";

import { Badge } from "@/src/components/ui";

import { DashboardCard } from "./dashboard-card";

export function BetCard({
  bet,
  player,
  team,
}: {
  bet: BetRecommendation;
  player?: Player | Pitcher;
  team?: Team;
}) {
  const title = player?.fullName ?? team?.name ?? bet.selection;

  return (
    <DashboardCard as="article" className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {bet.selection}
          </p>
          <BetTitle player={player} title={title} />
          <p className="mt-1 text-sm text-blue-200">Line {bet.odds.displayLine}</p>
        </div>
        <Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
          {bet.recommendedUnits.toFixed(2)}u
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniMetric label="Sportsbook" value={bet.value?.sportsbookLine ?? bet.odds.displayLine} />
        <MiniMetric label="Fair Line" value={bet.value?.display.fairLine ?? "Pending"} />
        <MiniMetric label="Edge" value={bet.value?.display.edgePercent ?? "0.0%"} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="Value" value={bet.value?.valueRating ?? "No Edge"} />
        <MiniMetric label="Units" value={bet.recommendedUnits.toFixed(2)} />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">{bet.prediction.reasoning}</p>
    </DashboardCard>
  );
}

function BetTitle({
  player,
  title,
}: {
  player?: Player | Pitcher;
  title: string;
}) {
  if (player && "arsenal" in player) {
    return (
      <Link
        className="mt-3 block truncate text-lg font-semibold text-white transition hover:text-blue-200"
        href={`/pitcher-research?pitcher=${encodeURIComponent(player.id)}`}
      >
        {title}
      </Link>
    );
  }

  return <h3 className="mt-3 truncate text-lg font-semibold text-white">{title}</h3>;
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
