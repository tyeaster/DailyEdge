import { OddsSnapshotsRepository } from "../persistence/repositories/odds-snapshots-repository.ts";
import type { OddsProviderResponse } from "../providers/odds/OddsProvider.ts";

/**
 * Durably records a live odds fetch so line movement can be reconstructed
 * over time (closing-line-value, steam moves, etc. - see
 * src/services/odds-intelligence/). Only records "live" responses: mock
 * and replay data is synthetic and would just pollute real market history.
 * Never throws - a persistence hiccup should never break odds serving.
 */
export async function recordOddsSnapshot(
  response: OddsProviderResponse,
): Promise<void> {
  if (response.mode !== "live" || !process.env.DATABASE_URL) {
    return;
  }

  try {
    const repository = new OddsSnapshotsRepository();

    await repository.recordSnapshot(
      response.provider,
      response.records,
      new Date(response.fetchedAt),
    );
  } catch (error) {
    console.error(
      "[odds-snapshot-recorder] failed to record odds history:",
      error instanceof Error ? error.message : error,
    );
  }
}
