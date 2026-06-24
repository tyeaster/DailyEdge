export type PitcherStatsProviderMode = "live" | "mock" | "replay";

export type PitcherStats = {
  era: number;
  gamesStarted: number;
  homeRunsPer9: number;
  inningsPitched: number;
  losses: number;
  strikeoutRate: number;
  strikeouts: number;
  strikeoutsPer9: number;
  walksPer9: number;
  whip: number;
  wins: number;
};

export type PitcherStatsRequest = {
  fallbackStats?: PitcherStats;
  pitcherId: number;
  season: number;
};

export type PitcherStatsProviderResponse = {
  fetchedAt: string;
  mode: PitcherStatsProviderMode;
  pitcherId: number;
  provider: string;
  season: number;
  stats?: PitcherStats;
};

export interface PitcherStatsProvider {
  readonly id: string;
  getPitcherStats(
    request: PitcherStatsRequest,
  ): Promise<PitcherStatsProviderResponse>;
}
