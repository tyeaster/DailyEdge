import { americanOddsToImpliedProbability } from "../lib/odds.ts";
import { errorFields, logger } from "../lib/logger.ts";
import type { Game } from "../models/mlb.ts";
import { OddsSnapshotsRepository } from "../persistence/repositories/odds-snapshots-repository.ts";
import type { OddsProviderResponse } from "../providers/odds/OddsProvider.ts";
import { historicalMarketStorageService } from "./historical-market-storage/HistoricalMarketStorageService.ts";
import type { PredictionResult } from "../models/mlb.ts";
import type { BetMarketType } from "./ranking/types.ts";

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
    logger.error(
      "odds-snapshot-recorder",
      "failed to record odds history",
      errorFields(error),
    );
  }
}

/**
 * Durably records each game's already-resolved moneyline price (see
 * applyOddsToGames() in src/services/odds/game-odds.ts), with gameId
 * populated - unlike recordOddsSnapshot() above, which persists raw
 * provider records that don't carry our internal gameId (the odds<->game
 * match only happens via team-name matching, not a stable ID). This is
 * what DurableOddsIntelligenceProvider reads. Moneyline only, matching
 * the scope of prediction recording. Only records dataSource === "live"
 * games with a real (non-placeholder) price. Never throws.
 */
export async function recordGameOddsSnapshots(
  games: Game[],
  dataSource: "live" | "mock",
): Promise<void> {
  if (dataSource !== "live" || !process.env.DATABASE_URL) {
    return;
  }

  try {
    const repository = new OddsSnapshotsRepository();
    const capturedAt = new Date();

    for (const game of games) {
      const moneyline = game.odds.moneyline;

      if (!moneyline || !Number.isFinite(moneyline.price) || moneyline.price === 0) {
        continue;
      }

      await repository.recordGameSnapshot({
        americanOdds: moneyline.price,
        capturedAt,
        gameId: game.id,
        impliedProbability:
          moneyline.impliedProbability ??
          americanOddsToImpliedProbability(moneyline.price),
        market: "moneyline",
        provider: "oddspipe",
        sportsbook: moneyline.sportsbook,
      });
    }
  } catch (error) {
    logger.error(
      "odds-snapshot-recorder",
      "failed to record game odds snapshots",
      errorFields(error),
    );
  }
}

/**
 * Records the resolved Daily Slate market ledger used by calibration,
 * backtesting, odds intelligence, and future optimization. Game-level markets
 * are available once odds have been applied to games; moneyline rows also
 * receive PredictionEngine values because those are already calculated today.
 */
export async function recordHistoricalGameMarkets({
  dataSource,
  games,
  predictions,
}: {
  dataSource: "live" | "mock";
  games: Game[];
  predictions: PredictionResult[];
}): Promise<void> {
  if (dataSource !== "live" || !process.env.DATABASE_URL) {
    return;
  }

  const predictionByGameId = new Map(
    predictions.map((prediction) => [prediction.gameId, prediction]),
  );

  for (const game of games) {
    const prediction = predictionByGameId.get(game.id);

    await Promise.all([
      recordGameMarket(game, "moneyline", prediction),
      recordGameMarket(game, "run-line"),
      recordGameMarket(game, "game-total"),
    ]);
  }
}

async function recordGameMarket(
  game: Game,
  market: Extract<BetMarketType, "game-total" | "moneyline" | "run-line">,
  prediction?: PredictionResult,
) {
  const odds =
    market === "moneyline"
      ? game.odds.moneyline
      : market === "run-line"
        ? game.odds.spread
        : game.odds.total;

  if (!odds || !Number.isFinite(odds.price) || odds.price === 0) {
    return;
  }

  await historicalMarketStorageService.recordSnapshot({
    capturedAt: odds.updatedAt ?? new Date().toISOString(),
    currentOdds: odds.price,
    edgePercent: market === "moneyline" ? prediction?.edgePercent : undefined,
    expectedValuePercent:
      market === "moneyline" ? prediction?.expectedValuePercent : undefined,
    fairOdds: market === "moneyline" ? prediction?.selectedFairMoneyline : undefined,
    gameId: game.id,
    line: odds.line,
    market,
    openingOdds: odds.openingLine ?? odds.price,
    predictionId:
      market === "moneyline" && prediction
        ? `${prediction.predictionVersion}:${prediction.gameId}:moneyline`
        : undefined,
    provider: "daily-slate",
    selection: odds.displayLine,
    snapshotId: [
      "daily-slate",
      game.id,
      market,
      odds.sportsbook,
      odds.updatedAt ?? "current",
    ].join(":"),
    sportsbook: odds.sportsbook,
    teamId: market === "moneyline" ? prediction?.selectedTeamId : undefined,
    trueLineProbability:
      market === "moneyline" ? prediction?.selectedWinProbability : undefined,
    updatedAt: odds.updatedAt ?? new Date().toISOString(),
  });
}
