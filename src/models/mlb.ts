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
export type ModelFactorKey =
  | "startingPitcher"
  | "seasonStrength"
  | "teamOffense"
  | "teamPitching"
  | "lineupStrength"
  | "bullpen"
  | "homeField"
  | "sportsbookMarket"
  | "recentForm"
  | "momentum";
export type RecentFormWindow = 7 | 14 | 30;
export type DataQualityStatus = "available" | "partial" | "missing";
export type LineupStatus = "confirmed" | "projected" | "unavailable";
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

export interface OffensiveRating {
  available: boolean;
  battingAverage: number;
  ops: number;
  runsPerGame: number;
  value: number;
  walkRate: number;
  strikeoutRate: number;
}

export interface PitchingRating {
  available: boolean;
  era: number;
  runsAllowedPerGame: number;
  value: number;
  whip: number;
}

export interface BullpenRating {
  available: boolean;
  era?: number;
  fetchedAt?: string;
  inningsPitched?: number;
  recentAppearances?: number;
  recentInningsPitched?: number;
  recentPitches?: number;
  relieversUsed?: number;
  source?: "live" | "mock" | "replay" | "unavailable";
  strikeoutRate?: number;
  value: number;
  whip?: number;
  workloadRating?: number;
}

export interface OverallTeamRating {
  available: boolean;
  runDifferential: number;
  value: number;
}

export interface TeamStrength {
  bullpen: BullpenRating;
  fetchedAt: string;
  offense: OffensiveRating;
  overall: OverallTeamRating;
  pitching: PitchingRating;
  source: "live" | "mock" | "replay" | "unavailable";
}

export interface RecentFormRating {
  available: boolean;
  value: number;
}

export interface MomentumScore {
  available: boolean;
  value: number;
}

export interface RecentFormWindowStats {
  available: boolean;
  battingAverage: number;
  era: number;
  gamesPlayed: number;
  losses: number;
  ops: number;
  rating: RecentFormRating;
  runDifferential: number;
  runDifferentialPerGame: number;
  runsAllowedPerGame: number;
  runsPerGame: number;
  whip: number;
  winPercentage: number;
  wins: number;
  window: RecentFormWindow;
}

export interface TeamRecentForm {
  fetchedAt: string;
  momentum: MomentumScore;
  rating: RecentFormRating;
  source: "live" | "mock" | "replay" | "unavailable";
  windows: Record<RecentFormWindow, RecentFormWindowStats>;
}

export interface LineupPlayer {
  battingAverage: number;
  battingHand: BattingSide | "U";
  battingOrder: number;
  fullName: string;
  homeRuns: number;
  isPinchHitter: boolean;
  isStarting: boolean;
  mlbId: number;
  onBasePercentage: number;
  ops: number;
  plateAppearances: number;
  position: string;
  sluggingPercentage: number;
  strikeoutRate: number;
  wrcPlus: number | null;
}

export interface LineupHandednessBalance {
  balanceRating: number;
  left: number;
  right: number;
  switch: number;
}

export interface LineupProfile {
  averageOps: number;
  averageStrikeoutRate: number;
  averageWrcPlus: number | null;
  confirmedAt?: string;
  contactRating: number;
  fetchedAt: string;
  handedness: LineupHandednessBalance;
  lineupConfidence: number;
  missingStarPlayerIds: number[];
  missingStarterIds: number[];
  overallStrength: number;
  players: LineupPlayer[];
  powerRating: number;
  replacementQuality: number;
  source: "live" | "mock" | "replay" | "unavailable";
  status: LineupStatus;
}

export interface Team {
  abbreviation: string;
  city: string;
  division: MlbDivision;
  externalIds?: {
    mlb?: number;
  };
  id: string;
  league: MlbLeague;
  lineup?: LineupProfile;
  record?: {
    losses: number;
    winPercentage: number;
    wins: number;
  };
  recentForm?: TeamRecentForm;
  strength?: TeamStrength;
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
  externalIds?: {
    mlb?: number;
  };
  gamesStarted?: number;
  handedness: ThrowingHand;
  homeRunsPer9?: number;
  inningsPitched: number;
  losses?: number;
  statsSource?: "live" | "mock" | "replay" | "unavailable";
  statsUpdatedAt?: string;
  strikeouts?: number;
  strikeoutsPer9?: number;
  strikeoutRate: number;
  walksPer9?: number;
  whip: number;
  wins?: number;
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

export interface ModelFactorContribution {
  available: boolean;
  contributionPercent: number;
  label: string;
  probability: number;
  weight: number;
}

export interface ModelBreakdown {
  factors: Record<ModelFactorKey, ModelFactorContribution>;
  totalContributionPercent: number;
}

export interface DataQualityInput {
  label: string;
  score: number;
  source: string;
  status: DataQualityStatus;
  weight: number;
}

export interface DataQuality {
  inputs: Record<
    | "bullpen"
    | "lineups"
    | "pitchers"
    | "recentForm"
    | "sportsbook"
    | "teamStats"
    | "weather",
    DataQualityInput
  >;
  missingInputs: string[];
  score: number;
}

export interface PredictionResult {
  awayFairMoneyline: number;
  awayProjectedRuns: number;
  awayWinProbability: number;
  confidenceScore: number;
  dataQuality: DataQuality;
  edgePercent: number;
  expectedValuePercent: number;
  explanations: string[];
  gameId: string;
  homeFairMoneyline: number;
  homeProjectedRuns: number;
  homeWinProbability: number;
  impliedSportsbookProbability: number;
  modelBreakdown: ModelBreakdown;
  predictedWinnerTeamId: string;
  predictionVersion: string;
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
  externalIds?: {
    mlb?: number;
  };
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
