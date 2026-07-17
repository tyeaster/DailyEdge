/**
 * Merge two record lists keyed by id, with `preferred` winning on
 * collisions. Used to blend historical-market-storage records with the
 * older per-market repositories during the transition to the unified
 * market ledger.
 */
export function mergeById<T>(
  preferred: T[],
  fallback: T[],
  getId: (item: T) => string,
): T[] {
  const merged = new Map<string, T>();

  for (const item of fallback) {
    merged.set(getId(item), item);
  }

  for (const item of preferred) {
    merged.set(getId(item), item);
  }

  return [...merged.values()];
}
