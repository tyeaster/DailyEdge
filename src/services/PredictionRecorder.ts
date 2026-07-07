import { errorFields, logger } from "../lib/logger.ts";
import type { PredictionResult } from "../models/mlb.ts";
import { PredictionsRepository } from "../persistence/repositories/predictions-repository.ts";

/**
 * Durably records the moneyline half of each game's PredictionEngine
 * output. Moneyline only, deliberately: PredictionResult (this file) uses
 * OddsMarket-family semantics (moneyline/spread/total/team-total/player-prop)
 * while the predictions table/calibration/ranking use BetMarketType
 * (moneyline/run-line/team-total/game-total/strikeouts/hits/home-runs/
 * total-bases/...) - "moneyline" is the one value identical in both
 * vocabularies. Recording the other markets would require reconciling that
 * mismatch first (tracked as debt in MASTER_CHECKLIST.md), which is a
 * separate, deliberate piece of work.
 *
 * Uses a stable predictionId (gameId + market, no timestamp) with
 * onConflictDoNothing, so only the first prediction computed for a given
 * game each day is captured - roughly an "opening prediction" snapshot,
 * not a full time series like odds_snapshots. Good enough for calibration
 * V1; revisit if closing-prediction tracking turns out to matter more.
 *
 * Only called for dataSource === "live" (see daily-slate/service.ts) -
 * mock predictions would just pollute real calibration history. Never
 * throws and no-ops without DATABASE_URL, matching every other recorder
 * built this session.
 */
export async function recordMoneylinePredictions(
  predictions: PredictionResult[],
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return;
  }

  try {
    const repository = new PredictionsRepository();
    const timestamp = new Date().toISOString();

    for (const prediction of predictions) {
      await repository.record({
        confidence: prediction.confidenceScore,
        edgePercent: prediction.edgePercent,
        expectedValuePercent: prediction.expectedValuePercent,
        fairOdds: prediction.selectedFairMoneyline,
        gameId: prediction.gameId,
        market: "moneyline",
        modelId: prediction.predictionVersion,
        modelProbability: prediction.selectedWinProbability,
        odds: prediction.sportsbookMoneyline,
        predictionId: `prediction-${prediction.gameId}-moneyline`,
        recommendation: prediction.recommendation,
        sportsbook: prediction.sportsbook,
        teamId: prediction.selectedTeamId,
        timestamp,
      });
    }
  } catch (error) {
    logger.error(
      "prediction-recorder",
      "failed to record predictions",
      errorFields(error),
    );
  }
}
