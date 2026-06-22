"use client";

import { useState } from "react";

import type { GamePreview } from "@/src/types/mlb-dashboard";

import { Badge } from "@/src/components/ui";
import { cn } from "@/src/lib/cn";

import { DashboardCard } from "./dashboard-card";

export function GameCard({ game }: { game: GamePreview }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <DashboardCard
      as="article"
      className="cursor-pointer p-5"
      onClick={() => setExpanded((isExpanded) => !isExpanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((isExpanded) => !isExpanded);
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {game.gameTime}
            </p>
            <Badge className="px-2 py-0.5 text-xs" variant="neutral">
              {game.status}
            </Badge>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            {game.awayTeam} at {game.homeTeam}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{game.venue}</p>
        </div>
        <Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
          {game.confidence}%
        </Badge>
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        <GameLine label="Away SP" value={game.awayPitcher} />
        <GameLine label="Home SP" value={game.homePitcher} />
        <GameLine label="Moneyline" value={game.moneyline} />
        <GameLine label="Spread" value={game.spread} />
        <GameLine label="Total" value={game.total} />
        <GameLine label="Weather" value={game.weather} />
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm leading-6 text-slate-300">{game.detail}</p>
          </div>
        </div>
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
