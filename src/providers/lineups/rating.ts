import type {
  BattingSide,
  LineupPlayer,
  LineupProfile,
  LineupStatus,
} from "../../models/mlb.ts";

import { LINEUP_RATING_CONFIG } from "./config.ts";

export type LineupPlayerInput = Omit<
  LineupPlayer,
  "isPinchHitter" | "isStarting" | "wrcPlus"
> & {
  isPinchHitter?: boolean;
  isStarting?: boolean;
  wrcPlus?: number | null;
};

export function buildLineupProfile({
  baselinePlayerIds,
  confirmedAt,
  fetchedAt,
  players,
  rosterPlayers,
  source,
  status,
}: {
  baselinePlayerIds: number[];
  confirmedAt?: string;
  fetchedAt: string;
  players: LineupPlayerInput[];
  rosterPlayers: LineupPlayerInput[];
  source: LineupProfile["source"];
  status: LineupStatus;
}): LineupProfile {
  if (players.length === 0) {
    return createUnavailableLineup(fetchedAt);
  }

  const normalizedPlayers = players
    .slice(0, 9)
    .map((player) => normalizePlayer(player));
  const playerIds = new Set(normalizedPlayers.map((player) => player.mlbId));
  const starPlayers = [...rosterPlayers]
    .filter((player) => player.plateAppearances >= 50)
    .sort((left, right) => playerQuality(right) - playerQuality(left))
    .slice(0, LINEUP_RATING_CONFIG.starCount);
  const missingStarPlayerIds = starPlayers
    .filter((player) => !playerIds.has(player.mlbId))
    .map((player) => player.mlbId);
  const missingStarterIds =
    status === "confirmed"
      ? baselinePlayerIds.filter((playerId) => !playerIds.has(playerId))
      : [];
  const replacements =
    status === "confirmed"
      ? normalizedPlayers.filter(
          (player) => !baselinePlayerIds.includes(player.mlbId),
        )
      : [];
  const qualifiedPlayers = normalizedPlayers.filter(
    (player) => player.plateAppearances > 0,
  );
  const averageOps =
    qualifiedPlayers.length > 0
      ? average(qualifiedPlayers.map((player) => player.ops))
      : 0.75;
  const averageStrikeoutRate = average(
    qualifiedPlayers.length > 0
      ? qualifiedPlayers.map((player) => player.strikeoutRate)
      : [0.22],
  );
  const availableWrcPlus = normalizedPlayers
    .map((player) => player.wrcPlus)
    .filter((value): value is number => value !== null);
  const contactRating = calculateContactRating(normalizedPlayers);
  const powerRating = calculatePowerRating(normalizedPlayers);
  const handedness = calculateHandednessBalance(
    normalizedPlayers.map((player) => player.battingHand),
  );
  const replacementQuality =
    replacements.length === 0
      ? 100
      : Math.round(average(replacements.map((player) => playerQuality(player))));
  const overallStrength = calculateOverallLineupStrength({
    averageOps,
    balanceRating: handedness.balanceRating,
    contactRating,
    missingStars: missingStarPlayerIds.length,
    powerRating,
  });

  return {
    averageOps: round(averageOps, 3),
    averageStrikeoutRate: round(averageStrikeoutRate, 3),
    averageWrcPlus:
      availableWrcPlus.length > 0
        ? Math.round(average(availableWrcPlus))
        : null,
    confirmedAt,
    contactRating,
    fetchedAt,
    handedness,
    lineupConfidence:
      status === "confirmed"
        ? LINEUP_RATING_CONFIG.confidence.confirmed
        : LINEUP_RATING_CONFIG.confidence.projected,
    missingStarPlayerIds,
    missingStarterIds,
    overallStrength,
    players: normalizedPlayers,
    powerRating,
    replacementQuality,
    source,
    status,
  };
}

export function createUnavailableLineup(
  fetchedAt = new Date().toISOString(),
): LineupProfile {
  return {
    averageOps: 0,
    averageStrikeoutRate: 0,
    averageWrcPlus: null,
    contactRating: 50,
    fetchedAt,
    handedness: {
      balanceRating: 50,
      left: 0,
      right: 0,
      switch: 0,
    },
    lineupConfidence: 0,
    missingStarPlayerIds: [],
    missingStarterIds: [],
    overallStrength: 50,
    players: [],
    powerRating: 50,
    replacementQuality: 50,
    source: "unavailable",
    status: "unavailable",
  };
}

export function calculateContactRating(players: LineupPlayerInput[]) {
  const qualifiedPlayers = players.filter(
    (player) => player.plateAppearances > 0,
  );

  if (qualifiedPlayers.length === 0) {
    return 50;
  }

  const config = LINEUP_RATING_CONFIG.contact;

  return Math.round(
    average(
      qualifiedPlayers.map(
        (player) =>
          normalizePositive(player.battingAverage, config.battingAverage) *
            config.battingAverage.weight +
          normalizeInverse(player.strikeoutRate, config.strikeoutRate) *
            config.strikeoutRate.weight,
      ),
    ),
  );
}

export function calculatePowerRating(players: LineupPlayerInput[]) {
  const qualifiedPlayers = players.filter(
    (player) => player.plateAppearances > 0,
  );

  if (qualifiedPlayers.length === 0) {
    return 50;
  }

  const config = LINEUP_RATING_CONFIG.power;

  return Math.round(
    average(
      qualifiedPlayers.map((player) => {
        const homeRunRate =
          player.plateAppearances > 0
            ? player.homeRuns / player.plateAppearances
            : 0;

        return (
          normalizePositive(player.sluggingPercentage, config.slugging) *
            config.slugging.weight +
          normalizePositive(homeRunRate, config.homeRunRate) *
            config.homeRunRate.weight
        );
      }),
    ),
  );
}

function calculateOverallLineupStrength({
  averageOps,
  balanceRating,
  contactRating,
  missingStars,
  powerRating,
}: {
  averageOps: number;
  balanceRating: number;
  contactRating: number;
  missingStars: number;
  powerRating: number;
}) {
  const config = LINEUP_RATING_CONFIG.overall;
  const opsRating = normalizePositive(averageOps, {
    maximum: 0.9,
    minimum: 0.6,
  });
  const value =
    opsRating * config.opsWeight +
    contactRating * config.contactWeight +
    powerRating * config.powerWeight +
    balanceRating * config.balanceWeight -
    missingStars * config.starAbsencePenalty;

  return Math.round(clamp(value, 0, 100));
}

function calculateHandednessBalance(hands: Array<BattingSide | "U">) {
  const left = hands.filter((hand) => hand === "L").length;
  const right = hands.filter((hand) => hand === "R").length;
  const switchHitters = hands.filter((hand) => hand === "S").length;
  const effectiveLeft = left + switchHitters / 2;
  const effectiveRight = right + switchHitters / 2;
  const total = effectiveLeft + effectiveRight;
  const imbalance =
    total > 0 ? Math.abs(effectiveLeft - effectiveRight) / total : 0.5;

  return {
    balanceRating: Math.round((1 - imbalance) * 100),
    left,
    right,
    switch: switchHitters,
  };
}

function playerQuality(player: LineupPlayerInput) {
  if (player.plateAppearances <= 0) {
    return 50;
  }

  const config = LINEUP_RATING_CONFIG.playerQuality;
  const contact =
    normalizePositive(player.battingAverage, {
      maximum: 0.3,
      minimum: 0.2,
    }) *
      0.4 +
    normalizeInverse(player.strikeoutRate, {
      maximum: 0.32,
      minimum: 0.12,
    }) *
      0.6;
  const power =
    normalizePositive(player.sluggingPercentage, {
      maximum: 0.6,
      minimum: 0.3,
    }) *
      0.7 +
    normalizePositive(
      player.plateAppearances > 0
        ? player.homeRuns / player.plateAppearances
        : 0,
      { maximum: 0.08, minimum: 0.01 },
    ) *
      0.3;

  return (
    normalizePositive(player.ops, { maximum: 0.9, minimum: 0.6 }) *
      config.opsWeight +
    normalizePositive(player.onBasePercentage, {
      maximum: 0.42,
      minimum: 0.27,
    }) *
      config.onBaseWeight +
    contact * config.contactWeight +
    power * config.powerWeight
  );
}

function normalizePlayer(player: LineupPlayerInput): LineupPlayer {
  return {
    ...player,
    isPinchHitter: player.isPinchHitter ?? false,
    isStarting: player.isStarting ?? true,
    wrcPlus: player.wrcPlus ?? null,
  };
}

function normalizePositive(
  value: number,
  range: { maximum: number; minimum: number },
) {
  return clamp((value - range.minimum) / (range.maximum - range.minimum), 0, 1) *
    100;
}

function normalizeInverse(
  value: number,
  range: { maximum: number; minimum: number },
) {
  return clamp((range.maximum - value) / (range.maximum - range.minimum), 0, 1) *
    100;
}

function average(values: number[]) {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
