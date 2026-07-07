import { eq } from "drizzle-orm";

import type { RecordedPrediction } from "@/src/services/calibration/types";

import { getDb } from "../client.ts";
import { predictions } from "../schema.ts";

export class PredictionsRepository {
  private readonly db: ReturnType<typeof getDb>;

  constructor(db: ReturnType<typeof getDb> = getDb()) {
    this.db = db;
  }

  async record(prediction: RecordedPrediction): Promise<void> {
    await this.db
      .insert(predictions)
      .values({
        confidence: prediction.confidence,
        edgePercent: prediction.edgePercent,
        expectedValuePercent: prediction.expectedValuePercent,
        fairOdds: prediction.fairOdds,
        gameId: prediction.gameId,
        market: prediction.market,
        modelId: prediction.modelId,
        modelProbability: prediction.modelProbability,
        odds: prediction.odds,
        playerId: prediction.playerId,
        predictionId: prediction.predictionId,
        recommendation: prediction.recommendation,
        sportsbook: prediction.sportsbook,
        teamId: prediction.teamId,
        timestamp: new Date(prediction.timestamp),
      })
      .onConflictDoNothing({ target: predictions.predictionId });
  }

  async findByGameId(gameId: string): Promise<RecordedPrediction[]> {
    const rows = await this.db
      .select()
      .from(predictions)
      .where(eq(predictions.gameId, gameId));

    return rows.map(toRecordedPrediction);
  }

  async findById(predictionId: string): Promise<RecordedPrediction | undefined> {
    const rows = await this.db
      .select()
      .from(predictions)
      .where(eq(predictions.predictionId, predictionId));

    return rows[0] ? toRecordedPrediction(rows[0]) : undefined;
  }
}

function toRecordedPrediction(
  row: typeof predictions.$inferSelect,
): RecordedPrediction {
  return {
    confidence: row.confidence,
    edgePercent: row.edgePercent,
    expectedValuePercent: row.expectedValuePercent,
    fairOdds: row.fairOdds,
    gameId: row.gameId,
    market: row.market as RecordedPrediction["market"],
    modelId: row.modelId,
    modelProbability: row.modelProbability,
    odds: row.odds,
    playerId: row.playerId ?? undefined,
    predictionId: row.predictionId,
    recommendation: row.recommendation,
    sportsbook: row.sportsbook ?? undefined,
    teamId: row.teamId ?? undefined,
    timestamp: row.timestamp.toISOString(),
  };
}
