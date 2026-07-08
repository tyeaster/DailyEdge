import type { Game, Pitcher, Player, PlayerProp, Team } from "../../models/mlb.ts";
import type { NormalizedOddsRecord } from "../../providers/odds/OddsProvider.ts";

/**
 * Pure matching logic for live player-prop odds, kept in its own
 * relative-imports-only module (unlike live-mlb-provider.ts, which is full
 * of @/-aliased value imports that only resolve inside Next.js's module
 * resolver, not under `node --experimental-strip-types`) so it's directly
 * unit-testable with a synthetic schedule and fake odds records.
 */
export function matchLivePropsToSchedule(
  records: NormalizedOddsRecord[],
  schedule: { games: Game[]; pitchers: Pitcher[]; teams: Team[] },
): PlayerProp[] {
  const battersByName = buildNameIndex(buildLineupBatters(schedule.teams));
  const pitchersByName = buildNameIndex(schedule.pitchers);
  const gameByTeamId = buildGameByTeamIdIndex(schedule.games);

  return records.flatMap((record, index): PlayerProp[] => {
    if (!record.propCategory || !record.playerName) {
      return [];
    }

    const player =
      record.propCategory === "Strikeouts"
        ? pitchersByName.get(normalizeName(record.playerName))
        : battersByName.get(normalizeName(record.playerName));
    const game = player && gameByTeamId.get(player.teamId);

    if (!player || !game) {
      return [];
    }

    const side = record.side === "under" ? "Under" : "Over";
    const line = record.line ?? 0;
    const displayLine = `${side} ${line}`;

    return [
      {
        category: record.propCategory,
        confidence: { label: "Medium", value: 50 },
        edge: { percentage: 0, rating: "C" },
        gameId: game.id,
        id: `oddspipe-prop-${record.id ?? index}`,
        odds: {
          displayLine,
          id: `odds-oddspipe-prop-${record.id ?? index}`,
          line,
          market: "player-prop",
          movement: "Live",
          price: record.americanOdds,
          sportsbook: record.sportsbook,
          updatedAt: record.updatedAt,
        },
        playerId: player.id,
        projection: displayLine,
        reasoning: "Live sportsbook line from OddsPipe. Model edge scoring not yet computed for this market.",
      },
    ];
  });
}

export function buildLineupBatters(teams: Team[]): Player[] {
  return teams.flatMap((team) =>
    (team.lineup?.players ?? []).map(
      (lineupPlayer): Player => ({
        bats: lineupPlayer.battingHand === "U" ? "R" : lineupPlayer.battingHand,
        externalIds: { mlb: lineupPlayer.mlbId },
        fullName: lineupPlayer.fullName,
        id: `mlb-player-${lineupPlayer.mlbId}`,
        position: lineupPlayer.position,
        teamId: team.id,
        throws: "R",
      }),
    ),
  );
}

function buildNameIndex<TData extends { fullName: string }>(players: TData[]) {
  return new Map(players.map((player) => [normalizeName(player.fullName), player]));
}

function buildGameByTeamIdIndex(games: Game[]) {
  const index = new Map<string, Game>();

  for (const game of games) {
    index.set(game.awayTeamId, game);
    index.set(game.homeTeamId, game);
  }

  return index;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}
