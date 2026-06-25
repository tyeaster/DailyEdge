export const LINEUP_RATING_CONFIG = {
  confidence: {
    confirmed: 100,
    projected: 65,
  },
  contact: {
    battingAverage: { maximum: 0.3, minimum: 0.2, weight: 0.4 },
    strikeoutRate: { maximum: 0.32, minimum: 0.12, weight: 0.6 },
  },
  overall: {
    balanceWeight: 0.1,
    contactWeight: 0.25,
    opsWeight: 0.45,
    powerWeight: 0.2,
    starAbsencePenalty: 4,
  },
  playerQuality: {
    contactWeight: 0.25,
    onBaseWeight: 0.1,
    opsWeight: 0.4,
    powerWeight: 0.25,
  },
  power: {
    homeRunRate: { maximum: 0.08, minimum: 0.01, weight: 0.3 },
    slugging: { maximum: 0.6, minimum: 0.3, weight: 0.7 },
  },
  recentProjectionDays: 7,
  starCount: 3,
} as const;
