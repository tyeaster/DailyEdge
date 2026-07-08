import { errorFields, logger } from "../lib/logger.ts";
import { GameResultsRepository } from "../persistence/repositories/game-results-repository.ts";
import {
  MLBGameResultsProvider,
  MockGameResultsProvider,
  type GameResultsProvider,
  type GameResultsProviderMode,
  type GameResultsRequest,
} from "../providers/game-results/index.ts";
import { reconcileGameResults } from "./ResultReconciler.ts";
import { historicalMarketStorageService } from "./historical-market-storage/HistoricalMarketStorageService.ts";

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
 * Fetches completed games for a date from the configured provider,
 * durably records each one via GameResultsRepository, then reconciles
 * each against any already-recorded predictions (see ResultReconciler.ts)
 * so calibration has real win/loss outcomes to read, not just raw scores.
 * Meant to be invoked by a scheduled/triggered job (none exists yet - see
 * MASTER_CHECKLIST.md), not inline in a request path, so failures are
 * logged and swallowed rather than thrown.
 */
export async function ingestGameResults(
  request: GameResultsRequest,
  provider: GameResultsProvider = getConfiguredGameResultsProvider(),
): Promise<{ reconciled: number; recorded: number }> {
  if (!process.env.DATABASE_URL) {
    return { reconciled: 0, recorded: 0 };
  }

  try {
    const response = await provider.getResults(request);
    const repository = new GameResultsRepository();

    for (const result of response.results) {
      await repository.record(result);
    }

    const { reconciled } = await reconcileGameResults(
      response.results.map((result) => result.gameId),
    );
    let settledMarkets = 0;

    for (const result of response.results) {
      const { settled } = await historicalMarketStorageService.settleGameMarkets(result);

      settledMarkets += settled;
    }

    return { reconciled: reconciled + settledMarkets, recorded: response.results.length };
  } catch (error) {
    logger.error(
      "game-results-service",
      "failed to ingest game results",
      errorFields(error),
    );

    return { reconciled: 0, recorded: 0 };
  }
}
