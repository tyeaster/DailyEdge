import { mlbTeamCatalog } from "../../data/mlb-teams.ts";
import { buildPlayerDirectory, type PlayerDirectoryEntry } from "../player-research/service.ts";
import type { DailySlateViewModel } from "../../services/daily-slate/types.ts";

export interface SearchResult {
  href: string;
  label: string;
  sublabel: string;
  type: "player" | "route" | "team";
}

const staticRoutes: SearchResult[] = [
  { href: "/", label: "Daily Slate", sublabel: "Home", type: "route" },
  { href: "/best-bets", label: "Best Bets", sublabel: "Ranked board across every market", type: "route" },
  { href: "/pitching/strikeouts", label: "Strikeouts", sublabel: "Pitching market", type: "route" },
  { href: "/hitting/hits", label: "Hits", sublabel: "Hitting market", type: "route" },
  { href: "/hitting/total-bases", label: "Total Bases", sublabel: "Hitting market", type: "route" },
  { href: "/hitting/home-runs", label: "Home Runs", sublabel: "Hitting market", type: "route" },
  { href: "/matchups/zone-intelligence", label: "Zone Intelligence", sublabel: "Matchups", type: "route" },
  { href: "/matchups/pitch-intelligence", label: "Pitch Intelligence", sublabel: "Matchups", type: "route" },
  { href: "/analysis/correlation", label: "Correlation", sublabel: "Analysis", type: "route" },
  { href: "/betting/moneyline", label: "Moneyline", sublabel: "Team betting", type: "route" },
  { href: "/betting/run-line", label: "Run Line", sublabel: "Team betting", type: "route" },
  { href: "/betting/team-totals", label: "Team Totals", sublabel: "Team betting", type: "route" },
  { href: "/betting/game-totals", label: "Game Totals", sublabel: "Team betting", type: "route" },
  { href: "/research/players", label: "Player Research", sublabel: "Research", type: "route" },
  { href: "/research/teams", label: "Team Research", sublabel: "Research", type: "route" },
  { href: "/research/ballparks", label: "Ballpark Research", sublabel: "Research", type: "route" },
];

export async function search(query: string): Promise<SearchResult[]> {
  const normalized = query.trim().toLowerCase();

  if (normalized.length === 0) {
    return [];
  }

  const { getDailySlate } = await import("../../services/daily-slate/service.ts");
  const slate = await getDailySlate();

  return buildSearchResults(normalized, slate);
}

export function buildSearchResults(normalized: string, slate: DailySlateViewModel): SearchResult[] {
  if (normalized.trim().length === 0) {
    return [];
  }

  const routeMatches = staticRoutes.filter((route) => route.label.toLowerCase().includes(normalized));
  const teamMatches = mlbTeamCatalog
    .filter(
      (team) =>
        team.name.toLowerCase().includes(normalized) ||
        team.city.toLowerCase().includes(normalized) ||
        team.abbreviation.toLowerCase().includes(normalized),
    )
    .slice(0, 5)
    .map(
      (team): SearchResult => ({
        href: "/research/teams",
        label: `${team.city} ${team.name}`,
        sublabel: `${team.league} ${team.division} · Team`,
        type: "team",
      }),
    );
  const playerMatches = buildPlayerDirectory(slate)
    .filter((player) => player.fullName.toLowerCase().includes(normalized))
    .slice(0, 5)
    .map((player): SearchResult => playerToResult(player));

  return [...routeMatches, ...teamMatches, ...playerMatches].slice(0, 12);
}

function playerToResult(player: PlayerDirectoryEntry): SearchResult {
  const href =
    player.role === "pitcher"
      ? `/pitching/strikeouts?pitcher=${player.id}`
      : `/hitting/hits?batter=${player.id}`;

  return {
    href,
    label: player.fullName,
    sublabel: `${player.team.city} ${player.team.name} · ${player.role === "pitcher" ? "Pitcher" : "Batter"}`,
    type: "player",
  };
}
