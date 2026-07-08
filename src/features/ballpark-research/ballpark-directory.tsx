"use client";

import { useMemo, useState } from "react";

import { Pill, ResearchCard } from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import type { BallparkDirectoryEntry } from "./service";

export function BallparkDirectory({ ballparks }: { ballparks: BallparkDirectoryEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return ballparks;
    }

    return ballparks.filter(
      (entry) =>
        entry.ballpark.name.toLowerCase().includes(normalizedQuery) ||
        entry.homeTeam.name.toLowerCase().includes(normalizedQuery) ||
        entry.homeTeam.city.toLowerCase().includes(normalizedQuery) ||
        entry.homeTeam.abbreviation.toLowerCase().includes(normalizedQuery),
    );
  }, [ballparks, query]);

  return (
    <div>
      <input
        className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-300/40 focus:outline-none"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search ballpark, team, or city..."
        type="text"
        value={query}
      />

      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-500">
        {filtered.length} of {ballparks.length} ballparks
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <BallparkCard entry={entry} key={entry.ballpark.venueId} />
        ))}
      </div>
    </div>
  );
}

function BallparkCard({ entry }: { entry: BallparkDirectoryEntry }) {
  const { ballpark, homeTeam } = entry;

  return (
    <ResearchCard>
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/70">
                {homeTeam.abbreviation} · {homeTeam.city} {homeTeam.name}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{ballpark.name}</h3>
            </div>
            <Pill tone={ratingTone(ballpark.overallParkRating)}>
              {ballpark.source === "unavailable" ? "-" : `${Math.round(ballpark.overallParkRating)}/100`}
            </Pill>
          </div>
        </summary>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          <MiniStat label="Hitter" value={ballpark.hitterFriendlyRating} unavailable={ballpark.source === "unavailable"} />
          <MiniStat label="Pitcher" value={ballpark.pitcherFriendlyRating} unavailable={ballpark.source === "unavailable"} />
          <MiniStat label="Power" value={ballpark.powerFriendlyRating} unavailable={ballpark.source === "unavailable"} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>HR factor: {formatFactor(ballpark.homeRunFactor)}</span>
          <span>Run factor: {formatFactor(ballpark.runFactor)}</span>
          <span>Roof: {ballpark.roofType || "-"}</span>
          <span>Surface: {ballpark.surface || "-"}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">source {ballpark.source}</p>
      </details>
    </ResearchCard>
  );
}

function MiniStat({
  label,
  unavailable,
  value,
}: {
  label: string;
  unavailable: boolean;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-slate-950/70 p-3 text-center">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold", unavailable ? "text-slate-500" : ratingText(value))}>
        {unavailable ? "-" : Math.round(value)}
      </p>
    </div>
  );
}

function formatFactor(value: number | null) {
  return value === null ? "-" : value.toFixed(0);
}

function ratingTone(value: number) {
  if (value >= 65) return "green";
  if (value <= 40) return "red";
  return "blue";
}

function ratingText(value: number) {
  if (value >= 65) return "text-emerald-200";
  if (value <= 40) return "text-rose-200";
  return "text-blue-100";
}
