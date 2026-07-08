export const TOTAL_BASES_INTELLIGENCE_CONFIG = {
  confidence: {
    dataQualityWeight: 0.3,
    edgeWeight: 0.22,
    inputAgreementWeight: 0.24,
    scoreWeight: 0.24,
  },
  probability: {
    max: 0.78,
    min: 0.18,
    scoreMultiplier: 0.004,
    startingBase: 0.28,
  },
  projection: {
    base: 1.35,
    max: 4.2,
    min: 0.4,
    scoreMultiplier: 0.022,
  },
  scoreWeights: {
    batterQuality: 0.2,
    bullpenOpportunity: 0.08,
    environment: 0.1,
    lineupOpportunity: 0.12,
    matchup: 0.16,
    pitchIntelligence: 0.12,
    recentProduction: 0.16,
    zoneIntelligence: 0.06,
  },
  thresholds: {
    eliteEdge: 7,
    eliteScore: 82,
    leanEdge: 1.5,
    playEdge: 3,
    playScore: 66,
    strongEdge: 5,
    strongScore: 74,
  },
} as const;
