import { eq, lt } from "drizzle-orm";

import { getDb } from "../persistence/client.ts";
import { cacheEntries } from "../persistence/schema.ts";
import type { CacheProvider } from "./CacheProvider.ts";

/**
 * Postgres-backed CacheProvider - survives restarts and is shared across
 * server instances, unlike MemoryCache. Uses the same database as
 * everything else in src/persistence/ rather than requiring a separate
 * Redis/KV account, so it's usable today without new external
 * infrastructure. Not the default cache anywhere yet (see
 * MASTER_CHECKLIST.md) - opt-in per service until its latency
 * characteristics (a DB round-trip vs. an in-memory lookup) have been
 * weighed against each service's actual TTLs.
 */
export class PostgresCacheProvider implements CacheProvider {
  private readonly db: ReturnType<typeof getDb>;

  constructor(db: ReturnType<typeof getDb> = getDb()) {
    this.db = db;
  }

  async get<TValue>(key: string): Promise<TValue | undefined> {
    const rows = await this.db
      .select()
      .from(cacheEntries)
      .where(eq(cacheEntries.key, key));
    const entry = rows[0];

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt.getTime() <= Date.now()) {
      await this.delete(key);

      return undefined;
    }

    return entry.value as TValue;
  }

  async set<TValue>(
    key: string,
    value: TValue,
    ttlSeconds: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.db
      .insert(cacheEntries)
      .values({ expiresAt, key, value: value as object })
      .onConflictDoUpdate({
        set: { expiresAt, value: value as object },
        target: cacheEntries.key,
      });
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(cacheEntries).where(eq(cacheEntries.key, key));
  }

  /** Removes all expired rows. Not called automatically - invoke from a
   * scheduled job if/when one exists (see MASTER_CHECKLIST.md), otherwise
   * expired rows simply get skipped and lazily deleted on next read. */
  async pruneExpired(): Promise<number> {
    const deleted = await this.db
      .delete(cacheEntries)
      .where(lt(cacheEntries.expiresAt, new Date()))
      .returning({ key: cacheEntries.key });

    return deleted.length;
  }
}
