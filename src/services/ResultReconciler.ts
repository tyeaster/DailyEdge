import { GameResultsRepository } from "../persistence/repositories/game-results-repository.ts";
import { PredictionResultsRepository } from "../persistence/repositories/prediction-results-repository.ts";
import { PredictionsRepository } from "../persistence/repositories/predictions-repository.ts";

/**
 * Joins a single completed game's durable result (game_results) against
 * any durably recorded predictions for that game (predictions), writing a
 * PredictionResultRecord per matching moneyline prediction. This is the
 * link Sections 8e/8g both flagged as missing: results and predictions
 * were each recorded independently, but nothing cross-referenced them.
 *
 * Moneyline only, for the same reason predictions recording is moneyline
 * only (see PredictionRecorder.ts) - a moneyline prediction's outcome is
 * simply whether its predicted team matches the game's winning team.
 * Never throws; no-ops without DATABASE_URL.
 */
export async function reconcileGameResult(
  gameId: string,
): Promise<{ reconciled: number }> {
  if (!process.env.DATABASE_URL) {
    return { reconciled: 0 };
  }

  try {
    const gameResultsRepository = new GameResultsRepository();
    const gameResult = await gameResultsRepository.findByGameId(gameId);

    if (!gameResult) {
      return { reconciled: 0 };
    }

    const predictionsRepository = new PredictionsRepository();
    const predictions = await predictionsRepository.findByGameId(gameId);
    const moneylinePredictions = predictions.filter(
      (prediction) => prediction.market === "moneyline",
    );

    const resultsRepository = new PredictionResultsRepository();
    const recordedAt = new Date().toISOString();

    for (const prediction of moneylinePredictions) {
      await resultsRepository.record({
        gameId,
        market: "moneyline",
        moneylineWinnerTeamId: gameResult.winningTeamId,
        outcome: prediction.teamId === gameResult.winningTeamId ? "win" : "loss",
        predictionId: prediction.predictionId,
        recordedAt,
      });
    }

    return { reconciled: moneylinePredictions.length };
  } catch (error) {
    console.error(
      "[result-reconciler] failed to reconcile game result:",
      error instanceof Error ? error.message : error,
    );

    return { reconciled: 0 };
  }
}

export async function reconcileGameResults(
  gameIds: string[],
): Promise<{ reconciled: number }> {
  let total = 0;

  for (const gameId of gameIds) {
    const { reconciled } = await reconcileGameResult(gameId);

    total += reconciled;
  }

  return { reconciled: total };
}
