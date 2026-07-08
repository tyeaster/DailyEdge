export const RECENT_FORM_CONFIG = {
  momentum: {
    offenseTrendWeight: 0.25,
    pitchingTrendWeight: 0.25,
    runDifferentialWeight: 0.3,
    winPercentageWeight: 0.2,
  },
  rating: {
    battingAverage: { maximum: 0.29, minimum: 0.21, weight: 0.1 },
    era: { maximum: 6, minimum: 2.5, weight: 0.15 },
    ops: { maximum: 0.9, minimum: 0.6, weight: 0.2 },
    runDifferentialPerGame: { maximum: 2.5, minimum: -2.5, weight: 0.25 },
    runsAllowedPerGame: { maximum: 6.5, minimum: 2.5, weight: 0.1 },
    runsPerGame: { maximum: 6.5, minimum: 2.5, weight: 0.1 },
    whip: { maximum: 1.6, minimum: 1, weight: 0.05 },
    winPercentage: { maximum: 0.8, minimum: 0.2, weight: 0.05 },
  },
  trendRanges: {
    era: { maximum: 1.5, minimum: -1.5 },
    ops: { maximum: 0.12, minimum: -0.12 },
    runDifferentialPerGame: { maximum: 2.5, minimum: -2.5 },
    whip: { maximum: 0.25, minimum: -0.25 },
    winPercentage: { maximum: 0.8, minimum: 0.2 },
  },
  windowWeights: {
    7: 0.45,
    14: 0.35,
    30: 0.2,
  },
  windows: [7, 14, 30],
} as const;
