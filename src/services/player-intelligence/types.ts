import type {
  Game,
  Pitcher,
  Player,
  PlayerProp,
  PredictionResult,
  Team,
  WeatherProfile,
} from "../../models/mlb.ts";

export type PlayerIntelligenceMode = "live" | "mock" | "replay";
export type PlayerIntelligenceSource =
  | "live"
  | "mock"
  | "replay"
  | "unavailable";
export type TrendDirection = "up" | "down" | "flat";
export type TrendStrength = "weak" | "moderate" | "strong";

export interface PitcherGameLog {
  averageVelocityMph?: number | null;
  battersFaced: number;
  date: string;
  decision: string | null;
  earnedRuns: number;
  flyBalls: number | null;
  gameScore: number | null;
  groundBalls: number | null;
  hits: number;
  homeAway: "away" | "home" | "unknown";
  inningsPitched: number;
  opponent: string;
  pitchCount: number;
  result: string | null;
  strikeouts: number;
  walks: number;
}

export interface PitcherGameLogRequest {
  asOfDate?: string;
  fallbackLogs?: PitcherGameLog[];
  pitcherId: number;
  season: number;
}

export interface PitcherGameLogProviderResponse {
  fetchedAt: string;
  logs: PitcherGameLog[];
  mode: PlayerIntelligenceMode;
  pitcherId: number;
  provider: string;
  season: number;
}

export interface BatterGameLog {
  atBats: number;
  averageExitVelocityMph: number | null;
  averageLaunchAngleDegrees: number | null;
  barrels: number | null;
  date: string;
  doubles: number;
  hardHits: number | null;
  hbp: number;
  hits: number;
  homeAway: "away" | "home" | "unknown";
  homeRuns: number;
  opponent: string;
  opposingPitcherHand: "L" | "R" | "U";
  plateAppearances: number;
  rbi: number;
  runs: number;
  singles: number;
  stolenBases: number;
  strikeouts: number;
  totalBases: number;
  triples: number;
  walks: number;
}

export interface BatterGameLogRequest {
  asOfDate?: string;
  batterId: number;
  fallbackLogs?: BatterGameLog[];
  season: number;
}

export interface BatterGameLogProviderResponse {
  batterId: number;
  fetchedAt: string;
  logs: BatterGameLog[];
  mode: PlayerIntelligenceMode;
  provider: string;
  season: number;
}

export interface RollingPitcherStats {
  averageBattersFaced: number;
  averageInnings: number;
  averagePitchCount: number;
  averageStrikeouts: number;
  era: number;
  games: number;
  qualityStartPercent: number;
  sixPlusInningPercent: number;
  strikeouts: number;
  walks: number;
  whip: number;
  oneHundredPitchPercent: number;
}

export interface PitcherRollingSummary {
  away: RollingPitcherStats;
  day: RollingPitcherStats;
  home: RollingPitcherStats;
  last10: RollingPitcherStats;
  last3: RollingPitcherStats;
  last5: RollingPitcherStats;
  night: RollingPitcherStats;
  season: RollingPitcherStats;
}

export interface RollingBatterStats {
  atBats: number;
  battingAverage: number;
  barrelPercent: number;
  doubles: number;
  games: number;
  hardHitPercent: number;
  hits: number;
  homeRuns: number;
  isolatedPower: number;
  onBasePercentage: number;
  onBasePlusSlugging: number;
  plateAppearances: number;
  sluggingPercentage: number;
  strikeoutPercent: number;
  totalBases: number;
  walkPercent: number;
}

export interface BatterRollingSummary {
  away: RollingBatterStats;
  day: RollingBatterStats;
  home: RollingBatterStats;
  last10: RollingBatterStats;
  last3: RollingBatterStats;
  last5: RollingBatterStats;
  night: RollingBatterStats;
  season: RollingBatterStats;
  vsLHP: RollingBatterStats;
  vsRHP: RollingBatterStats;
}

export interface TrendSignal {
  confidence: number;
  direction: TrendDirection;
  explanation: string;
  key: string;
  label: string;
  strength: TrendStrength;
}

export interface ConsistencyMetrics {
  ceiling: number;
  consistencyScore: number;
  expectedRange: {
    high: number;
    low: number;
  };
  floor: number;
  mean: number;
  median: number;
  metric: string;
  standardDeviation: number;
}

export interface PitcherRecentFormScore {
  explanation: string;
  score: number;
}

export interface BatterProfile {
  average: number;
  averageExitVelocityMph: number | null;
  averageLaunchAngleDegrees: number | null;
  babip: number;
  barrelPercent: number;
  battingAverage: number;
  chasePercent: number | null;
  contactPercent: number | null;
  flyBallPercent: number;
  groundBallPercent: number;
  hardHitPercent: number;
  isolatedPower: number;
  lineDrivePercent: number;
  onBasePercentage: number;
  onBasePlusSlugging: number;
  oppositePercent: number | null;
  pullPercent: number | null;
  sluggingPercentage: number;
  strikeoutPercent: number;
  sweetSpotPercent: number | null;
  swingPercent: number | null;
  walkPercent: number;
  whiffPercent: number | null;
  zoneContactPercent: number | null;
}

export interface BatterRecentFormScore {
  explanation: string;
  score: number;
}

export interface BatterConsistencyMetrics {
  consistencyScore: number;
  expectedHitRange: {
    high: number;
    low: number;
  };
  expectedTotalBaseRange: {
    high: number;
    low: number;
  };
  floor: number;
  ceiling: number;
  median: number;
  standardDeviation: number;
}

export interface ProjectionContext {
  marketLine?: string;
  modelProjection?: string;
  prop?: PlayerProp;
}

export interface PlayerContext {
  ballpark?: Game["ballpark"];
  game?: Game;
  lineup?: Team["lineup"];
  opponent?: Team;
  prediction?: PredictionResult;
  team?: Team;
  weather?: WeatherProfile;
}

export interface PitcherIntelligence {
  consistency: ConsistencyMetrics;
  context: PlayerContext;
  fetchedAt: string;
  gameLogs: PitcherGameLog[];
  pitcher: Pitcher;
  profile: Pitcher;
  projectionContext: ProjectionContext;
  recentForm: PitcherRecentFormScore;
  rolling: PitcherRollingSummary;
  seasonStatistics: Pitcher;
  source: PlayerIntelligenceSource;
  trends: TrendSignal[];
}

export interface BatterIntelligence {
  available: true;
  batter: Player;
  consistency: BatterConsistencyMetrics;
  context: PlayerContext;
  fetchedAt: string;
  gameLogs: BatterGameLog[];
  player: Player;
  profile: BatterProfile;
  projectionContext: ProjectionContext;
  recentForm: BatterRecentFormScore;
  rolling: BatterRollingSummary;
  source: PlayerIntelligenceSource;
  trends: TrendSignal[];
}

export interface BatterIntelligencePlaceholder {
  available: false;
  player: Player;
  reason: string;
}
