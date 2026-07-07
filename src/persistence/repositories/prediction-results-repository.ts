import { eq } from "drizzle-orm";

import type { PredictionResultRecord } from "@/src/services/calibration/types";

import { getDb } from "../client.ts";
import { predictionResults } from "../schema.ts";

export class PredictionResultsRepository {
  private readonly db: ReturnType<typeof getDb>;

  constructor(db: ReturnType<typeof getDb> = getDb()) {
    this.db = db;
  }

  async record(result: PredictionResultRecord): Promise<void> {
    await this.db
      .insert(predictionResults)
      .values({
        actualHits: result.actualHits,
        actualHomeRuns: result.actualHomeRuns,
        actualStrikeouts: result.actualStrikeouts,
        closingEdgePercent: result.closingEdgePercent,
        gameId: result.gameId,
        market: result.market,
        moneylineWinnerTeamId: result.moneylineWinnerTeamId,
        outcome: result.outcome,
        predictionId: result.predictionId,
        recordedAt: new Date(result.recordedAt),
      })
      .onConflictDoNothing({ target: predictionResults.predictionId });
  }

  async findByPredictionId(
    predictionId: string,
  ): Promise<PredictionResultRecord | undefined> {
    const rows = await this.db
      .select()
      .from(predictionResults)
      .where(eq(predictionResults.predictionId, predictionId));

    return rows[0] ? toPredictionResultRecord(rows[0]) : undefined;
  }

  async list(): Promise<PredictionResultRecord[]> {
    const rows = await this.db.select().from(predictionResults);

    return rows.map(toPredictionResultRecord);
  }
}

function toPredictionResultRecord(
  row: typeof predictionResults.$inferSelect,
): PredictionResultRecord {
  return {
    actualHits: row.actualHits ?? undefined,
    actualHomeRuns: row.actualHomeRuns ?? undefined,
    actualStrikeouts: row.actualStrikeouts ?? undefined,
    closingEdgePercent: row.closingEdgePercent ?? undefined,
    gameId: row.gameId,
    market: row.market as PredictionResultRecord["market"],
    moneylineWinnerTeamId: row.moneylineWinnerTeamId ?? undefined,
    outcome: row.outcome as PredictionResultRecord["outcome"],
    predictionId: row.predictionId,
    recordedAt: row.recordedAt.toISOString(),
  };
}
