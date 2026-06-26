export const MATCHUP_INTELLIGENCE_CONFIG = {
  cacheTtlSeconds: 86400,
  componentWeights: {
    contact: 0.25,
    expectedDamage: 0.25,
    movement: 0.2,
    velocity: 0.15,
    zone: 0.15,
  },
  overallWeights: {
    pitchType: 0.75,
    zone: 0.25,
  },
  ranges: {
    chaseZonePercent: { high: 32, low: 12 },
    horizontalBreakInches: { high: 16, low: 2 },
    inZonePercent: { high: 62, low: 42 },
    velocityMph: { high: 99, low: 82 },
    verticalBreakInches: { high: 18, low: 2 },
    whiffPercent: { high: 40, low: 15 },
  },
} as const;
