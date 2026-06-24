export type MlbLeague = "AL" | "NL";
export type MlbDivision = "East" | "Central" | "West";
export type BattingSide = "L" | "R" | "S";
export type ThrowingHand = "L" | "R";
export type GameStatus = "scheduled" | "confirmed" | "line-watch" | "weather-watch" | "roof-watch";
export type OddsMarket = "moneyline" | "spread" | "total" | "team-total" | "player-prop";
export type ValueRating = "No Edge" | "Lean" | "Play" | "Strong Play" | "Elite";
export type PredictionRecommendation =
  | "Pass"
  | "Lean"
  | "Play"
  | "Strong Play"
  | "Best Bet";
export type PlayerPropCategory =
  | "Strikeouts"
  | "Hits"
  | "Runs"
  | "RBI"
  | "Home Runs"
  | "Total Bases";

export interface ConfidenceScore {
  label: "Low" | "Medium" | "High" | "Elite";
  value: number;
}

export interface EdgeScore {
  percentage: number;
  rating: "S" | "A" | "B" | "C";
}

export interface ValueAssessment {
  display: {
    edgePercent: string;
    fairLine: string;
    modelProbability: string;
    sportsbookImpliedProbability: string;
  };
  edgePercent: number;
  fairLine: number;
  modelProbability: number;
  recommendation: string;
  sportsbookImpliedProbability: number;
  sportsbookLine: string;
  valueRating: ValueRating;
}

export interface Team {
  abbreviation: string;
  city: string;
  division: MlbDivision;
  id: string;
  league: MlbLeague;
  record?: {
    losses: number;
    winPercentage: number;
    wins: number;
  };
  name: string;
}

export interface Player {
  bats: BattingSide;
  fullName: string;
  id: string;
  position: string;
  teamId: string;
  throws: ThrowingHand;
}

export interface Pitcher extends Player {
  arsenal: string[];
  era: number;
  handedness: ThrowingHand;
  inningsPitched: number;
  strikeoutRate: number;
  whip: number;
}

export interface Odds {
  displayLine: string;
  id: string;
  impliedProbability?: number;
  line: number;
  market: OddsMarket;
  movement: string;
  openingLine?: number;
  outcomes?: Array<{
    impliedProbability: number;
    line?: number;
    price: number;
    selection: string;
    side?: "away" | "home" | "over" | "under";
    sportsbook: string;
    updatedAt: string;
  }>;
  price: number;
  sportsbook: string;
  updatedAt?: string;
}

export interface Weather {
  gameId: string;
  hitterFriendlyRating: number;
  humidityPercent: number | null;
  id: string;
  pitcherFriendlyRating: number;
  rainChancePercent: number;
  stadium: string;
  summary: string;
  temperatureF: number;
  windDirection: string;
  windMph: number;
}

export interface Injury {
  expectedReturn: string;
  id: string;
  impactRating: number;
  playerId: string;
  status: "Probable" | "Questionable" | "Day-to-day" | "10-day IL" | "15-day IL";
  teamId: string;
}

export interface Prediction {
  confidence: ConfidenceScore;
  edge: EdgeScore;
  gameId: string;
  id: string;
  market: OddsMarket;
  playerId?: string;
  projection: string;
  reasoning: string;
  teamId?: string;
}

export interface PredictionResult {
  awayFairMoneyline: number;
  awayProjectedRuns: number;
  awayWinProbability: number;
  confidenceScore: number;
  edgePercent: number;
  expectedValuePercent: number;
  explanations: string[];
  gameId: string;
  homeFairMoneyline: number;
  homeProjectedRuns: number;
  homeWinProbability: number;
  impliedSportsbookProbability: number;
  predictedWinnerTeamId: string;
  projectedTotalRuns: number;
  recommendation: PredictionRecommendation;
  selectedFairMoneyline: number;
  selectedTeamId: string;
  selectedWinProbability: number;
  sportsbook: string;
  sportsbookLine: string;
  sportsbookMoneyline: number;
  sportsbookUpdatedAt?: string;
}

export interface PlayerProp {
  category: PlayerPropCategory;
  confidence: ConfidenceScore;
  edge: EdgeScore;
  gameId: string;
  id: string;
  odds: Odds;
  playerId: string;
  projection: string;
  reasoning: string;
}

export interface BetRecommendation {
  confidence: ConfidenceScore;
  edge: EdgeScore;
  gameId: string;
  id: string;
  odds: Odds;
  playerId?: string;
  modelProbability: number;
  rank: number;
  recommendedUnits: number;
  selection: string;
  teamId?: string;
  prediction: Prediction;
  value?: ValueAssessment;
}

export interface Game {
  awayPitcherId: string;
  awayTeamId: string;
  confidence: ConfidenceScore;
  detail: string;
  homePitcherId: string;
  homeTeamId: string;
  id: string;
  modelProbability: number;
  odds: {
    moneyline: Odds;
    spread: Odds;
    total: Odds;
  };
  prediction?: PredictionResult;
  scheduledAt: string;
  status: GameStatus;
  venue: string;
  value?: ValueAssessment;
  weatherId: string;
}
