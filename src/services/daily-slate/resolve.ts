import type {
  BetRecommendation,
  Injury,
  Pitcher,
  Player,
  PlayerProp,
  PlayerPropCategory,
  Team,
} from "../../models/mlb.ts";

import type {
  DailySlateBet,
  DailySlateInjury,
  DailySlatePropCategory,
} from "./types.ts";

/**
 * Lenient join helpers for the daily slate. These used to be strict
 * getRequired() lookups that threw on the first unresolvable id - which
 * meant one live injury referencing a player outside today's lineups
 * (i.e. nearly every injured player, since injured players don't appear
 * in lineups) crashed the whole live build and silently fell the entire
 * slate back to mock data. Each join now degrades per-record instead:
 * skip what can't be attached to today's slate, keep everything else.
 */
export function resolveInjuries(
  injuries: Injury[],
  playerById: Record<string, Player | Pitcher>,
  teamById: Record<string, Team>,
): DailySlateInjury[] {
  return injuries.flatMap((injury): DailySlateInjury[] => {
    const team = teamById[injury.teamId];

    // An injury for a team that isn't on today's slate has no place in
    // the slate view - it belongs to a future roster/team page instead.
    if (!team) {
      return [];
    }

    const player =
      playerById[injury.playerId] ?? buildInjuryPlaceholderPlayer(injury, team);

    if (!player) {
      return [];
    }

    return [{ injury, player, team }];
  });
}

export function resolveProps(
  categoryOrder: PlayerPropCategory[],
  props: PlayerProp[],
  playerById: Record<string, Player | Pitcher>,
  teamById: Record<string, Team>,
): DailySlatePropCategory[] {
  return categoryOrder.map((label): DailySlatePropCategory => {
    return {
      label,
      props: props
        .filter((prop) => prop.category === label)
        .flatMap((prop) => {
          const player = playerById[prop.playerId];
          const team = player && teamById[player.teamId];

          if (!player || !team) {
            return [];
          }

          return [{ player, prop, team }];
        }),
    };
  });
}

export function resolveBets(
  bets: BetRecommendation[],
  playerById: Record<string, Player | Pitcher>,
  teamById: Record<string, Team>,
): DailySlateBet[] {
  return [...bets]
    .sort((left, right) => left.rank - right.rank)
    .map((bet): DailySlateBet => {
      return {
        bet,
        player: bet.playerId ? playerById[bet.playerId] : undefined,
        team: bet.teamId ? teamById[bet.teamId] : undefined,
      };
    });
}

/**
 * Injured players usually aren't in today's lineups, so a real live
 * injury can rarely be resolved to a slate player. When the injury
 * carries the player's name, surface it with a display-only placeholder
 * rather than dropping the alert; without a name there is nothing useful
 * to show, so the caller skips it.
 */
function buildInjuryPlaceholderPlayer(
  injury: Injury,
  team: Team,
): Player | undefined {
  if (!injury.playerName) {
    return undefined;
  }

  return {
    bats: "R",
    fullName: injury.playerName,
    id: injury.playerId,
    position: "—",
    teamId: team.id,
    throws: "R",
  };
}
