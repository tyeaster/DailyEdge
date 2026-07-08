import type { CacheProvider } from "./CacheProvider";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

export class MemoryCache implements CacheProvider {
  private readonly entries = new Map<string, CacheEntry>();

  async delete(key: string) {
    this.entries.delete(key);
  }

  async get<TValue>(key: string) {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);

      return undefined;
    }

    return entry.value as TValue;
  }

  async set<TValue>(key: string, value: TValue, ttlSeconds: number) {
    this.entries.set(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value,
    });
  }
}

export const memoryCache = new MemoryCache();
