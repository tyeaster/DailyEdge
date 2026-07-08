export const MONEYLINE_INTELLIGENCE_CONFIG = {
  confidence: {
    edgeWeight: 0.2,
    inputAgreementWeight: 0.25,
    predictionConfidenceWeight: 0.25,
    teamGradeWeight: 0.3,
  },
  homeField: {
    baseAdvantage: 57,
    roadBaseline: 48,
  },
  scoreWeights: {
    bullpen: 0.15,
    defense: 0.06,
    environment: 0.08,
    homeField: 0.08,
    matchup: 0.14,
    offense: 0.22,
    startingPitching: 0.27,
  },
  thresholds: {
    bestBetEdge: 5,
    bestBetGrade: 76,
    leanEdge: 1,
    playEdge: 2.5,
    playGrade: 64,
    strongEdge: 4,
    strongGrade: 70,
  },
} as const;
