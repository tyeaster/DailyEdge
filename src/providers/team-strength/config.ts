export const TEAM_STRENGTH_RATING_CONFIG = {
  bullpenWeight: 0.15,
  offense: {
    battingAverage: { maximum: 0.29, minimum: 0.22, weight: 0.15 },
    ops: { maximum: 0.85, minimum: 0.65, weight: 0.3 },
    runsPerGame: { maximum: 6, minimum: 3, weight: 0.3 },
    strikeoutRate: { maximum: 0.28, minimum: 0.18, weight: 0.1 },
    walkRate: { maximum: 0.12, minimum: 0.06, weight: 0.15 },
  },
  offenseWeight: 0.45,
  pitching: {
    era: { maximum: 5.5, minimum: 3, weight: 0.4 },
    runsAllowedPerGame: { maximum: 6, minimum: 3, weight: 0.35 },
    whip: { maximum: 1.45, minimum: 1.05, weight: 0.25 },
  },
  pitchingWeight: 0.4,
  runDifferential: {
    maximum: 150,
    minimum: -150,
    weight: 0.2,
  },
} as const;
