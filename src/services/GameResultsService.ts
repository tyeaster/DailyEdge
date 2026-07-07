import { GameResultsRepository } from "../persistence/repositories/game-results-repository.ts";
import {
  MLBGameResultsProvider,
  MockGameResultsProvider,
  type GameResultsProvider,
  type GameResultsProviderMode,
  type GameResultsRequest,
} from "../providers/game-results/index.ts";

export function getGameResultsMode(): GameResultsProviderMode {
  const mode = process.env.GAME_RESULTS_MODE;

  if (mode === "live" || mode === "replay" || mode === "mock") {
    return mode;
  }

  return "live";
}

export function getConfiguredGameResultsProvider(
  mode: GameResultsProviderMode = getGameResultsMode(),
): GameResultsProvider {
  if (mode === "mock") {
    return new MockGameResultsProvider();
  }

  // No replay provider exists yet (see MASTER_CHECKLIST.md) - "replay" and
  // "live" both resolve to the live provider until one is built.
  return new MLBGameResultsProvider();
}

/**
 * Fetches completed games for a date from the configured provider and
 * durably records each one via GameResultsRepository. Meant to be invoked
 * by a scheduled/triggered job (none exists yet - see MASTER_CHECKLIST.md),
 * not inline in a request path, so failures are logged and swallowed
 * rather than thrown.
 */
export async function ingestGameResults(
  request: GameResultsRequest,
  provider: GameResultsProvider = getConfiguredGameResultsProvider(),
): Promise<{ recorded: number }> {
  if (!process.env.DATABASE_URL) {
    return { recorded: 0 };
  }

  try {
    const response = await provider.getResults(request);
    const repository = new GameResultsRepository();

    for (const result of response.results) {
      await repository.record(result);
    }

    return { recorded: response.results.length };
  } catch (error) {
    console.error(
      "[game-results-service] failed to ingest game results:",
      error instanceof Error ? error.message : error,
    );

    return { recorded: 0 };
  }
}
