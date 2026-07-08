"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Pill, ResearchCard } from "@/src/components/research";

import type { PlayerDirectoryEntry } from "./service";

export function PlayerDirectory({ players }: { players: PlayerDirectoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"ALL" | "batter" | "pitcher">("ALL");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return players.filter((player) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        player.fullName.toLowerCase().includes(normalizedQuery) ||
        player.team.abbreviation.toLowerCase().includes(normalizedQuery) ||
        player.team.name.toLowerCase().includes(normalizedQuery);
      const matchesRole = role === "ALL" || player.role === role;

      return matchesQuery && matchesRole;
    });
  }, [players, query, role]);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-300/40 focus:outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player or team..."
          type="text"
          value={query}
        />
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Role</span>
          <select
            className="bg-transparent text-white focus:outline-none"
            onChange={(event) => setRole(event.target.value as typeof role)}
            value={role}
          >
            <option className="bg-slate-900" value="ALL">All</option>
            <option className="bg-slate-900" value="pitcher">Pitchers</option>
            <option className="bg-slate-900" value="batter">Batters</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-500">
        {filtered.length} of {players.length} players on today&apos;s slate
      </p>

      <ResearchCard className="mt-4 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-600">
              <tr>
                {["Player", "Team", "Pos", "Role", "B/T", "Scout"].map((header) => (
                  <th className="border-b border-white/10 px-4 py-3" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))}
            </tbody>
          </table>
        </div>
      </ResearchCard>
    </div>
  );
}

function PlayerRow({ player }: { player: PlayerDirectoryEntry }) {
  const paramKey = player.role === "pitcher" ? "pitcher" : "batter";
  const links =
    player.role === "pitcher"
      ? [
          { href: `/pitching/strikeouts?${paramKey}=${player.id}`, label: "Strikeout Lab" },
          { href: `/matchups/pitch-intelligence?${paramKey}=${player.id}`, label: "Pitch Intel" },
          { href: `/matchups/zone-intelligence?${paramKey}=${player.id}`, label: "Zone Intel" },
        ]
      : [
          { href: `/hitting/hits?${paramKey}=${player.id}`, label: "Hits Lab" },
          { href: `/matchups/pitch-intelligence?${paramKey}=${player.id}`, label: "Pitch Intel" },
          { href: `/matchups/zone-intelligence?${paramKey}=${player.id}`, label: "Zone Intel" },
        ];

  return (
    <tr className="border-b border-white/5">
      <td className="px-4 py-3 font-semibold text-white">{player.fullName}</td>
      <td className="px-4 py-3 text-slate-300">
        {player.team.city} {player.team.name}
      </td>
      <td className="px-4 py-3 text-slate-300">{player.position}</td>
      <td className="px-4 py-3">
        <Pill tone={player.role === "pitcher" ? "blue" : "green"}>{player.role}</Pill>
      </td>
      <td className="px-4 py-3 text-slate-300">
        {player.bats ?? "-"}/{player.throws ?? "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-blue-100 transition hover:border-blue-300/40 hover:bg-blue-400/10"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </td>
    </tr>
  );
}
