export const BULLPEN_RATING_CONFIG = {
  recentDays: 3,
  rating: {
    era: { maximum: 5.5, minimum: 2.5, weight: 0.35 },
    strikeoutRate: { maximum: 0.3, minimum: 0.16, weight: 0.2 },
    whip: { maximum: 1.55, minimum: 1.05, weight: 0.3 },
    workload: { weight: 0.15 },
  },
  workload: {
    inningsMaximum: 18,
    pitchesMaximum: 300,
  },
} as const;
