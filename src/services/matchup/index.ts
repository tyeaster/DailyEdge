export {
  MATCHUP_INTELLIGENCE_CONFIG,
} from "./config.ts";
export {
  calculateOverallPitchMatch,
  calculatePitchTypeMatch,
  calculatePitchZoneMatch,
  getConfiguredMatchupProvider,
  matchupService,
  MatchupService,
} from "./MatchupService.ts";
export {
  buildBatterMatchupProfiles,
  buildNeutralBatterProfiles,
  buildNeutralPitchArsenal,
  buildPitchArsenal,
} from "./normalization.ts";
export type { StatcastPitchRow } from "./normalization.ts";
export type {
  AverageReleasePoint,
  BatterMatchupProfile,
  BatterPitchProfile,
  MatchupDataSource,
  MatchupProviderMode,
  MatchupProviderResponse,
  MatchupRequest,
  OverallPitchMatch,
  PitchArsenal,
  PitchHeatMap,
  PitchHeatMapCell,
  PitchLocation,
  PitchMovement,
  PitchProfile,
  PitchTypeMatch,
  PitchUsage,
  ZoneHeatMap,
  ZoneMatch,
} from "./types.ts";
