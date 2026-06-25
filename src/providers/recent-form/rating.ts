import type {
  MomentumScore,
  RecentFormRating,
  RecentFormWindow,
  RecentFormWindowStats,
  TeamRecentForm,
} from "../../models/mlb.ts";

import { RECENT_FORM_CONFIG } from "./config.ts";

export type RecentFormWindowInput = {
  battingAverage?: number;
  era?: number;
  gamesPlayed?: number;
  losses?: number;
  ops?: number;
  runsAllowed?: number;
  runsScored?: number;
  whip?: number;
  wins?: number;
  window: RecentFormWindow;
};

export function calculateRecentFormWindow(
  input: RecentFormWindowInput,
): RecentFormWindowStats {
  const gamesPlayed = finite(input.gamesPlayed);

  if (gamesPlayed <= 0) {
    return createNeutralWindow(input.window);
  }

  const wins = finite(input.wins);
  const losses = finite(input.losses);
  const runsScored = finite(input.runsScored);
  const runsAllowed = finite(input.runsAllowed);
  const runsPerGame = runsScored / gamesPlayed;
  const runsAllowedPerGame = runsAllowed / gamesPlayed;
  const runDifferential = runsScored - runsAllowed;
  const runDifferentialPerGame = runDifferential / gamesPlayed;
  const winPercentage =
    wins + losses > 0 ? wins / (wins + losses) : 0.5;
  const battingAverage = finite(input.battingAverage);
  const ops = finite(input.ops);
  const era = finite(input.era);
  const whip = finite(input.whip);
  const config = RECENT_FORM_CONFIG.rating;
  const value =
    normalizePositive(winPercentage, config.winPercentage) *
      config.winPercentage.weight +
    normalizePositive(runsPerGame, config.runsPerGame) *
      config.runsPerGame.weight +
    normalizeInverse(runsAllowedPerGame, config.runsAllowedPerGame) *
      config.runsAllowedPerGame.weight +
    normalizePositive(runDifferentialPerGame, config.runDifferentialPerGame) *
      config.runDifferentialPerGame.weight +
    normalizePositive(ops, config.ops) * config.ops.weight +
    normalizePositive(battingAverage, config.battingAverage) *
      config.battingAverage.weight +
    normalizeInverse(era, config.era) * config.era.weight +
    normalizeInverse(whip, config.whip) * config.whip.weight;

  return {
    available: true,
    battingAverage,
    era,
    gamesPlayed,
    losses,
    ops,
    rating: { available: true, value: roundScore(value) },
    runDifferential,
    runDifferentialPerGame,
    runsAllowedPerGame,
    runsPerGame,
    whip,
    winPercentage,
    wins,
    window: input.window,
  };
}

export function calculateRecentFormRating(
  windows: Record<RecentFormWindow, RecentFormWindowStats>,
): RecentFormRating {
  const activeWindows = RECENT_FORM_CONFIG.windows
    .map((window) => ({
      stats: windows[window],
      weight: RECENT_FORM_CONFIG.windowWeights[window],
    }))
    .filter(({ stats }) => stats.available);
  const totalWeight = activeWindows.reduce(
    (total, item) => total + item.weight,
    0,
  );

  if (totalWeight === 0) {
    return { available: false, value: 50 };
  }

  return {
    available: true,
    value: Math.round(
      activeWindows.reduce(
        (total, item) => total + item.stats.rating.value * item.weight,
        0,
      ) / totalWeight,
    ),
  };
}

export function calculateMomentumScore(
  windows: Record<RecentFormWindow, RecentFormWindowStats>,
): MomentumScore {
  const short = windows[7];
  const baseline = windows[30];

  if (!short.available || !baseline.available) {
    return { available: false, value: 50 };
  }

  const ranges = RECENT_FORM_CONFIG.trendRanges;
  const config = RECENT_FORM_CONFIG.momentum;
  const winScore = normalizePositive(
    short.winPercentage,
    ranges.winPercentage,
  );
  const runDifferentialScore = normalizePositive(
    short.runDifferentialPerGame,
    ranges.runDifferentialPerGame,
  );
  const offenseTrendScore = normalizePositive(
    short.ops - baseline.ops,
    ranges.ops,
  );
  const pitchingTrendScore =
    (normalizePositive(baseline.era - short.era, ranges.era) +
      normalizePositive(baseline.whip - short.whip, ranges.whip)) /
    2;
  const value =
    winScore * config.winPercentageWeight +
    runDifferentialScore * config.runDifferentialWeight +
    offenseTrendScore * config.offenseTrendWeight +
    pitchingTrendScore * config.pitchingTrendWeight;

  return { available: true, value: roundScore(value) };
}

export function buildTeamRecentForm({
  fetchedAt,
  source,
  windows,
}: {
  fetchedAt: string;
  source: TeamRecentForm["source"];
  windows: Record<RecentFormWindow, RecentFormWindowStats>;
}): TeamRecentForm {
  return {
    fetchedAt,
    momentum: calculateMomentumScore(windows),
    rating: calculateRecentFormRating(windows),
    source,
    windows,
  };
}

export function createUnavailableRecentForm(
  fetchedAt = new Date().toISOString(),
): TeamRecentForm {
  const windows = {
    7: createNeutralWindow(7),
    14: createNeutralWindow(14),
    30: createNeutralWindow(30),
  };

  return buildTeamRecentForm({
    fetchedAt,
    source: "unavailable",
    windows,
  });
}

function createNeutralWindow(
  window: RecentFormWindow,
): RecentFormWindowStats {
  return {
    available: false,
    battingAverage: 0,
    era: 0,
    gamesPlayed: 0,
    losses: 0,
    ops: 0,
    rating: { available: false, value: 50 },
    runDifferential: 0,
    runDifferentialPerGame: 0,
    runsAllowedPerGame: 0,
    runsPerGame: 0,
    whip: 0,
    winPercentage: 0.5,
    wins: 0,
    window,
  };
}

function normalizePositive(
  value: number,
  range: { maximum: number; minimum: number },
) {
  return clamp01((value - range.minimum) / (range.maximum - range.minimum)) * 100;
}

function normalizeInverse(
  value: number,
  range: { maximum: number; minimum: number },
) {
  return (
    clamp01((range.maximum - value) / (range.maximum - range.minimum)) * 100
  );
}

function finite(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function roundScore(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}
