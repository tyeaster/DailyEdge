import type { Injury, Player, Team } from "@/src/models/mlb";

export function InjuryCard({
  injury,
  player,
  team,
}: {
  injury: Injury;
  player: Player;
  team: Team;
}) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-sm font-semibold text-blue-200">
        {team.abbreviation}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{player.fullName}</p>
        <p className="mt-1 text-sm text-slate-500">
          {injury.status} · {injury.expectedReturn}
        </p>
      </div>
      <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
        {injury.impactRating}
      </span>
    </div>
  );
}
