import assert from "node:assert/strict";
import test from "node:test";

import { closeDb } from "../src/persistence/client.ts";
import { PostgresCacheProvider } from "../src/cache/PostgresCacheProvider.ts";

const hasDatabase = Boolean(process.env.DATABASE_URL);

test(
  "stores and retrieves a JSON-serializable value",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const cache = new PostgresCacheProvider();
    const key = `test-cache-${Date.now()}`;

    await cache.set(key, { hello: "world", count: 3 }, 60);

    const value = await cache.get<{ count: number; hello: string }>(key);

    assert.deepEqual(value, { hello: "world", count: 3 });
  },
);

test(
  "returns undefined for a missing key",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const cache = new PostgresCacheProvider();
    const value = await cache.get(`test-cache-missing-${Date.now()}`);

    assert.equal(value, undefined);
  },
);

test(
  "expires entries after their TTL",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const cache = new PostgresCacheProvider();
    const key = `test-cache-expiring-${Date.now()}`;

    await cache.set(key, "will-expire", -1);

    const value = await cache.get(key);

    assert.equal(value, undefined);
  },
);

test(
  "overwrites an existing key with a new value and TTL",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const cache = new PostgresCacheProvider();
    const key = `test-cache-overwrite-${Date.now()}`;

    await cache.set(key, "first", 60);
    await cache.set(key, "second", 60);

    const value = await cache.get(key);

    assert.equal(value, "second");
  },
);

test(
  "delete removes a key",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const cache = new PostgresCacheProvider();
    const key = `test-cache-delete-${Date.now()}`;

    await cache.set(key, "value", 60);
    await cache.delete(key);

    const value = await cache.get(key);

    assert.equal(value, undefined);
  },
);

test(
  "pruneExpired removes only expired rows",
  { skip: !hasDatabase && "DATABASE_URL not set" },
  async () => {
    const cache = new PostgresCacheProvider();
    const expiredKey = `test-cache-prune-expired-${Date.now()}`;
    const freshKey = `test-cache-prune-fresh-${Date.now()}`;

    await cache.set(expiredKey, "old", -1);
    await cache.set(freshKey, "new", 60);

    await cache.pruneExpired();

    assert.equal(await cache.get(freshKey), "new");
  },
);

test.after(async () => {
  if (hasDatabase) {
    await closeDb();
  }
});
