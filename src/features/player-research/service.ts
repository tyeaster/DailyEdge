import type { LineupPlayer, Pitcher, Player, Team } from "../../models/mlb.ts";
import type { DailySlateViewModel } from "../../services/daily-slate/types.ts";

export interface PlayerDirectoryEntry {
  bats?: string;
  fullName: string;
  id: string;
  position: string;
  role: "batter" | "pitcher";
  team: Team;
  throws?: string;
}

export async function getPlayerDirectory(): Promise<PlayerDirectoryEntry[]> {
  const { getDailySlate } = await import("../../services/daily-slate/service.ts");
  const slate = await getDailySlate();

  return buildPlayerDirectory(slate);
}

export function buildPlayerDirectory(slate: DailySlateViewModel): PlayerDirectoryEntry[] {
  const entries = new Map<string, PlayerDirectoryEntry>();

  for (const game of slate.games) {
    addPitcher(entries, game.awayPitcher, game.awayTeam);
    addPitcher(entries, game.homePitcher, game.homeTeam);
    addLineup(entries, game.awayTeam);
    addLineup(entries, game.homeTeam);
  }

  for (const category of slate.propCategories) {
    for (const prop of category.props) {
      addPlayer(entries, prop.player, prop.team);
    }
  }

  return Array.from(entries.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function addPitcher(entries: Map<string, PlayerDirectoryEntry>, pitcher: Pitcher, team: Team) {
  if (pitcher.fullName === "Probable starter TBD") {
    return;
  }

  entries.set(pitcher.id, {
    bats: pitcher.bats,
    fullName: pitcher.fullName,
    id: pitcher.id,
    position: pitcher.position,
    role: "pitcher",
    team,
    throws: pitcher.throws,
  });
}

function addPlayer(entries: Map<string, PlayerDirectoryEntry>, player: Player | Pitcher, team: Team) {
  if (entries.has(player.id)) {
    return;
  }

  entries.set(player.id, {
    bats: player.bats,
    fullName: player.fullName,
    id: player.id,
    position: player.position,
    role: "arsenal" in player ? "pitcher" : "batter",
    team,
    throws: player.throws,
  });
}

function addLineup(entries: Map<string, PlayerDirectoryEntry>, team: Team) {
  for (const lineupPlayer of team.lineup?.players ?? []) {
    const id = buildLineupPlayerId(lineupPlayer);

    if (entries.has(id)) {
      continue;
    }

    entries.set(id, {
      bats: lineupPlayer.battingHand === "U" ? undefined : lineupPlayer.battingHand,
      fullName: lineupPlayer.fullName,
      id,
      position: lineupPlayer.position,
      role: "batter",
      team,
    });
  }
}

function buildLineupPlayerId(lineupPlayer: LineupPlayer) {
  return `mlb-player-${lineupPlayer.mlbId}`;
}
