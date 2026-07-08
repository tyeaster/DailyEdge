import type { BullpenRating } from "../../models/mlb.ts";

import { BULLPEN_RATING_CONFIG } from "./config.ts";

export type BullpenAggregate = {
  appearances: number;
  battersFaced: number;
  earnedRuns: number;
  hits: number;
  outs: number;
  pitches: number;
  relieversUsed: number;
  strikeouts: number;
  walks: number;
};

export function calculateBullpenRating({
  fetchedAt,
  recent,
  season,
  source,
}: {
  fetchedAt: string;
  recent: BullpenAggregate;
  season: BullpenAggregate;
  source: BullpenRating["source"];
}): BullpenRating {
  const inningsPitched = season.outs / 3;

  if (inningsPitched <= 0) {
    return createUnavailableBullpen(fetchedAt);
  }

  const era = (season.earnedRuns * 9) / inningsPitched;
  const whip = (season.walks + season.hits) / inningsPitched;
  const strikeoutRate =
    season.battersFaced > 0 ? season.strikeouts / season.battersFaced : 0;
  const recentInningsPitched = recent.outs / 3;
  const workloadRating = calculateWorkloadRating({
    inningsPitched: recentInningsPitched,
    pitches: recent.pitches,
  });
  const config = BULLPEN_RATING_CONFIG.rating;
  const value =
    normalizeInverse(era, config.era) * config.era.weight +
    normalizeInverse(whip, config.whip) * config.whip.weight +
    normalizePositive(strikeoutRate, config.strikeoutRate) *
      config.strikeoutRate.weight +
    workloadRating * config.workload.weight;

  return {
    available: true,
    era: round(era, 2),
    fetchedAt,
    inningsPitched: round(inningsPitched, 1),
    recentAppearances: recent.appearances,
    recentInningsPitched: round(recentInningsPitched, 1),
    recentPitches: recent.pitches,
    relieversUsed: recent.relieversUsed,
    source,
    strikeoutRate: round(strikeoutRate, 3),
    value: Math.round(clamp(value, 0, 100)),
    whip: round(whip, 2),
    workloadRating: Math.round(workloadRating),
  };
}

export function calculateWorkloadRating({
  inningsPitched,
  pitches,
}: {
  inningsPitched: number;
  pitches: number;
}) {
  const config = BULLPEN_RATING_CONFIG.workload;
  const inningsAvailability =
    100 - clamp((inningsPitched / config.inningsMaximum) * 100, 0, 100);
  const pitchAvailability =
    100 - clamp((pitches / config.pitchesMaximum) * 100, 0, 100);

  return (inningsAvailability + pitchAvailability) / 2;
}

export function createUnavailableBullpen(
  fetchedAt = new Date().toISOString(),
): BullpenRating {
  return {
    available: false,
    fetchedAt,
    source: "unavailable",
    value: 50,
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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
