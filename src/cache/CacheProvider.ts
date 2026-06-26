export interface CacheProvider {
  delete(key: string): Promise<void>;
  get<TValue>(key: string): Promise<TValue | undefined>;
  set<TValue>(key: string, value: TValue, ttlSeconds: number): Promise<void>;
}

export const CACHE_TTL_SECONDS = {
  bullpen: 1800,
  ballpark: 86400,
  lineupConfirmed: 60,
  lineupProjected: 300,
  matchup: 86400,
  odds: 60,
  pitcher: 3600,
  pitcherGameLogs: 86400,
  recentForm: 1800,
  schedule: 300,
  teamStrength: 3600,
  weather: 600,
} as const;
