"use client";

import { useState } from "react";

import type { Game, Pitcher, Team, Weather } from "@/src/models/mlb";

import { Badge } from "@/src/components/ui";
import { cn } from "@/src/lib/cn";
import { formatAmericanOdds, formatPercentage } from "@/src/lib/odds";

import { DashboardCard } from "./dashboard-card";

export function GameCard({
  awayPitcher,
  awayTeam,
  game,
  homePitcher,
  homeTeam,
  weather,
}: {
  awayPitcher: Pitcher;
  awayTeam: Team;
  game: Game;
  homePitcher: Pitcher;
  homeTeam: Team;
  weather: Weather;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = game.status
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
  const prediction = game.prediction;
  const predictedWinner = prediction
    ? prediction.predictedWinnerTeamId === homeTeam.id
      ? homeTeam
      : awayTeam
    : undefined;
  const predictedWinnerProbability =
    prediction?.predictedWinnerTeamId === homeTeam.id
      ? prediction.homeWinProbability
      : prediction?.awayWinProbability;

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
              {formatGameTime(game.scheduledAt)}
            </p>
            <Badge className="px-2 py-0.5 text-xs" variant="neutral">
              {status}
            </Badge>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            {awayTeam.name} at {homeTeam.name}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{game.venue}</p>
        </div>
        <Badge
          className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
          variant={prediction?.recommendation === "Pass" ? "neutral" : "success"}
        >
          {prediction?.recommendation ?? "Pending"}
        </Badge>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Starting Pitchers
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <PitcherSummary pitcher={awayPitcher} />
          <span className="text-xs font-semibold uppercase text-slate-600">vs</span>
          <PitcherSummary align="right" pitcher={homePitcher} />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Team Comparison
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <TeamSummary team={awayTeam} />
          <span className="pt-1 text-xs font-semibold uppercase text-slate-600">
            vs
          </span>
          <TeamSummary align="right" team={homeTeam} />
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        <GameLine
          label="Predicted winner"
          value={predictedWinner?.name ?? "Pending"}
        />
        <GameLine
          label="Win probability"
          value={
            predictedWinnerProbability === undefined
              ? "Pending"
              : formatPercentage(predictedWinnerProbability * 100)
          }
        />
        <GameLine
          label="Projected score"
          value={
            prediction
              ? `${awayTeam.abbreviation} ${prediction.awayProjectedRuns.toFixed(1)} - ${homeTeam.abbreviation} ${prediction.homeProjectedRuns.toFixed(1)}`
              : "Pending"
          }
        />
        <GameLine
          label="Model fair line"
          value={
            prediction
              ? formatAmericanOdds(prediction.selectedFairMoneyline)
              : "Pending"
          }
        />
        <GameLine
          label="Sportsbook line"
          value={prediction?.sportsbookLine ?? game.odds.moneyline.displayLine}
        />
        <GameLine
          label="Edge"
          value={
            prediction ? formatPercentage(prediction.edgePercent) : "0.0%"
          }
        />
        <GameLine
          label="Expected value"
          value={
            prediction
              ? formatPercentage(prediction.expectedValuePercent)
              : "0.0%"
          }
        />
        <GameLine
          label="Confidence"
          value={`${prediction?.confidenceScore ?? game.confidence.value}%`}
        />
        <GameLine label="Spread" value={game.odds.spread.displayLine} />
        <GameLine label="Total" value={game.odds.total.displayLine} />
        <GameLine label="Weather" value={weather.summary} />
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
            {prediction ? (
              <ul className="space-y-2 text-sm leading-6 text-slate-300">
                {prediction.explanations.map((explanation) => (
                  <li key={explanation}>{explanation}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-slate-300">{game.detail}</p>
            )}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function TeamSummary({
  align = "left",
  team,
}: {
  align?: "left" | "right";
  team: Team;
}) {
  const alignment = align === "right" ? "text-right" : "text-left";

  return (
    <div className={cn("min-w-0", alignment)}>
      <p className="text-sm font-semibold text-white">{team.abbreviation}</p>
      <div className="mt-2 space-y-1 text-xs text-slate-400">
        <p>Offense {formatRating(team.strength?.offense.value)}</p>
        <p>Pitching {formatRating(team.strength?.pitching.value)}</p>
        <p>
          Bullpen{" "}
          {formatRating(
            team.strength?.bullpen.value,
            team.strength?.bullpen.available,
          )}
        </p>
        <p>Overall {formatRating(team.strength?.overall.value)}</p>
      </div>
    </div>
  );
}

function formatRating(value: number | undefined, available = true) {
  return available && value !== undefined ? String(value) : "—";
}

function PitcherSummary({
  align = "left",
  pitcher,
}: {
  align?: "left" | "right";
  pitcher: Pitcher;
}) {
  const alignment = align === "right" ? "text-right" : "text-left";

  return (
    <div className={cn("min-w-0", alignment)}>
      <p className="truncate text-sm font-semibold text-white">
        {pitcher.fullName}
      </p>
      <div className="mt-2 space-y-1 text-xs text-slate-400">
        <p>ERA {formatPitcherStat(pitcher.era, 2)}</p>
        <p>WHIP {formatPitcherStat(pitcher.whip, 2)}</p>
        <p>K/9 {formatPitcherStat(pitcher.strikeoutsPer9, 1)}</p>
      </div>
    </div>
  );
}

function formatPitcherStat(value: number | undefined, digits: number) {
  return value && value > 0 ? value.toFixed(digits) : "—";
}

function formatGameTime(scheduledAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(scheduledAt));
}

function GameLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.025] px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}
