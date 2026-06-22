export interface CacheProvider {
  delete(key: string): Promise<void>;
  get<TValue>(key: string): Promise<TValue | undefined>;
  set<TValue>(key: string, value: TValue, ttlSeconds: number): Promise<void>;
}

export const CACHE_TTL_SECONDS = {
  odds: 60,
  schedule: 300,
} as const;
