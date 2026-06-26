import type { BattingSide, DataSourceMode, ThrowingHand } from "../../models/mlb.ts";

export type MatchupProviderMode = "live" | "mock" | "replay";

export type MatchupDataSource = Extract<DataSourceMode, "live" | "mock" | "replay" | "unavailable">;

export interface PitchUsage {
  pitchName: string;
  pitchType: string;
  usagePercent: number;
}

export interface PitchMovement {
  horizontalBreakInches: number | null;
  verticalBreakInches: number | null;
}

export interface AverageReleasePoint {
  extensionFeet: number | null;
  xFeet: number | null;
  zFeet: number | null;
}

export interface PitchLocation {
  frequencyPercent: number;
  plateX: number | null;
  plateZ: number | null;
  zone: number | null;
}

export interface PitchHeatMapCell {
  count?: string;
  damageRating?: number;
  frequencyPercent: number;
  handedness?: BattingSide;
  whiffPercent?: number;
  xBucket: number;
  zBucket: number;
  zone: number | null;
}

export interface PitchHeatMap {
  cells: PitchHeatMapCell[];
  sampleSize: number;
}

export interface ZoneHeatMap {
  cells: PitchHeatMapCell[];
  sampleSize: number;
}

export interface PitchProfile {
  averageReleasePoint: AverageReleasePoint;
  averageVelocityMph: number | null;
  groundBallPercent: number | null;
  hardHitPercent: number | null;
  horizontalBreakInches: number | null;
  heatMap: PitchHeatMap;
  locations: PitchLocation[];
  locationsByCount?: Record<string, PitchLocation[]>;
  locationsVsLHH?: PitchLocation[];
  locationsVsRHH?: PitchLocation[];
  movement: PitchMovement;
  pitchName: string;
  pitchType: string;
  putAwayPercent: number | null;
  sampleSize: number;
  spinRateRpm: number | null;
  strikePercent: number | null;
  usagePercent: number;
  verticalBreakInches: number | null;
  whiffPercent: number | null;
  zonePercent: number | null;
}

export interface PitchArsenal {
  dataQuality: number;
  fetchedAt: string;
  handedness: ThrowingHand | "U";
  overallQuality: number;
  pitcherId: string;
  pitcherMlbId?: number;
  pitcherName: string;
  primaryPitchType: string | null;
  profiles: PitchProfile[];
  season: number;
  source: MatchupDataSource;
}

export interface BatterPitchProfile {
  average: number | null;
  barrelPercent: number | null;
  chasePercent: number | null;
  contactPercent: number | null;
  expectedBattingAverage: number | null;
  expectedDamageRating: number;
  expectedSlugging: number | null;
  hardHitPercent: number | null;
  pitchName: string;
  pitchType: string;
  runValue: number | null;
  sampleSize: number;
  slugging: number | null;
  swingPercent: number | null;
  takePercent: number | null;
  whiffPercent: number | null;
}

export interface BatterMatchupProfile {
  batterId: string;
  batterMlbId?: number;
  batterName: string;
  bats: BattingSide | "U";
  dataQuality: number;
  fetchedAt: string;
  pitchProfiles: BatterPitchProfile[];
  season: number;
  source: MatchupDataSource;
}

export interface MatchupScoreExplanation {
  label: string;
  value: number;
}

export interface ZoneMatch {
  reasons: string[];
  score: number;
}

export interface PitchTypeMatch {
  batterDamageRating: number;
  contactMatch: number;
  expectedDamageMatch: number;
  movementMatch: number;
  pitchName: string;
  pitchType: string;
  reasons: string[];
  sampleSize: number;
  score: number;
  usagePercent: number;
  velocityMatch: number;
  zoneMatch: ZoneMatch;
}

export interface OverallPitchMatch {
  arsenalDataQuality: number;
  batterDataQuality: number;
  fetchedAt: string;
  inputSources: string[];
  missingInputs: string[];
  pitchTypeMatches: PitchTypeMatch[];
  pitcherId: string;
  reasons: string[];
  score: number;
  source: MatchupDataSource;
  zoneMatch: ZoneMatch;
}

export interface MatchupRequest {
  asOfDate?: string;
  batterIds?: string[];
  batterMlbIds?: number[];
  batterNames?: string[];
  pitcherId: string;
  pitcherMlbId?: number;
  pitcherName?: string;
  season: number;
}

export interface MatchupProviderResponse {
  arsenal: PitchArsenal;
  batterProfiles: BatterMatchupProfile[];
  fetchedAt: string;
  mode: MatchupProviderMode;
  provider: string;
  request: MatchupRequest;
}
