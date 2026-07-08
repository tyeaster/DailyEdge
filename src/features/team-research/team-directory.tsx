"use client";

import { useMemo, useState } from "react";

import { Pill, ResearchCard } from "@/src/components/research";
import { cn } from "@/src/lib/cn";

import type { TeamDirectoryEntry } from "./service";

export function TeamDirectory({ teams }: { teams: TeamDirectoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState<"AL" | "ALL" | "NL">("ALL");
  const [division, setDivision] = useState<"ALL" | "Central" | "East" | "West">("ALL");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return teams.filter(({ team }) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        team.name.toLowerCase().includes(normalizedQuery) ||
        team.city.toLowerCase().includes(normalizedQuery) ||
        team.abbreviation.toLowerCase().includes(normalizedQuery);
      const matchesLeague = league === "ALL" || team.league === league;
      const matchesDivision = division === "ALL" || team.division === division;

      return matchesQuery && matchesLeague && matchesDivision;
    });
  }, [teams, query, league, division]);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-300/40 focus:outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search team, city, or abbreviation..."
          type="text"
          value={query}
        />
        <FilterSelect
          label="League"
          onChange={(value) => setLeague(value as typeof league)}
          options={["ALL", "AL", "NL"]}
          value={league}
        />
        <FilterSelect
          label="Division"
          onChange={(value) => setDivision(value as typeof division)}
          options={["ALL", "East", "Central", "West"]}
          value={division}
        />
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-500">
        {filtered.length} of {teams.length} teams
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ team }) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        className="bg-transparent text-white focus:outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option className="bg-slate-900" key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TeamCard({ team }: { team: TeamDirectoryEntry["team"] }) {
  const strength = team.strength;

  return (
    <ResearchCard>
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/70">
                {team.abbreviation} · {team.league} {team.division}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">
                {team.city} {team.name}
              </h3>
            </div>
            <Pill tone={ratingTone(strength?.overall.value)}>
              {strength?.overall.available ? `${Math.round(strength.overall.value)}/100` : "-"}
            </Pill>
          </div>
        </summary>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          <MiniStat label="Offense" value={strength?.offense} />
          <MiniStat label="Pitching" value={strength?.pitching} />
          <MiniStat label="Bullpen" value={strength?.bullpen} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Run differential {strength?.overall.available ? strength.overall.runDifferential : "-"} · source{" "}
          {strength?.source ?? "unavailable"}
        </p>
      </details>
    </ResearchCard>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value?: { available: boolean; value: number };
}) {
  return (
    <div className="rounded-lg bg-slate-950/70 p-3 text-center">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold",
          value?.available ? ratingText(value.value) : "text-slate-500",
        )}
      >
        {value?.available ? Math.round(value.value) : "-"}
      </p>
    </div>
  );
}

function ratingTone(value: number | undefined) {
  if (value === undefined) return "neutral";
  if (value >= 65) return "green";
  if (value <= 40) return "red";
  return "blue";
}

function ratingText(value: number) {
  if (value >= 65) return "text-emerald-200";
  if (value <= 40) return "text-rose-200";
  return "text-blue-100";
}
