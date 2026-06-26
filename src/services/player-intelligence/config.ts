export const PLAYER_INTELLIGENCE_CONFIG = {
  recentFormWeights: {
    era: 0.18,
    innings: 0.16,
    pitchCount: 0.12,
    qualityStarts: 0.12,
    strikeouts: 0.24,
    trends: 0.1,
    walks: 0.08,
    whip: 0.1,
  },
  trendThresholds: {
    confidenceFloor: 45,
    moderateSlope: 0.35,
    strongSlope: 0.75,
  },
} as const;
