export const HOME_RUN_INTELLIGENCE_CONFIG = {
  confidence: {
    dataQualityWeight: 0.35,
    edgeWeight: 0.2,
    inputAgreementWeight: 0.25,
    scoreWeight: 0.2,
  },
  probability: {
    max: 0.25,
    min: 0.005,
    scoreMultiplier: 0.00135,
    startingBase: 0.02,
  },
  scoreWeights: {
    batterPower: 0.24,
    bullpenOpportunity: 0.08,
    environment: 0.16,
    lineupOpportunity: 0.12,
    pitchMatch: 0.16,
    pitcherRisk: 0.14,
    zoneMatch: 0.1,
  },
  thresholds: {
    eliteScore: 82,
    leanScore: 58,
    playEdgePercent: 2,
    playScore: 68,
    strongEdgePercent: 4,
    strongScore: 76,
  },
} as const;
