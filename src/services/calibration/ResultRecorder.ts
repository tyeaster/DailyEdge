import type { PredictionResultRecord, ResultRecordInput } from "./types.ts";

export class ResultRecorder {
  record(input: ResultRecordInput): PredictionResultRecord {
    return {
      actualHits: input.actualHits,
      actualHomeRuns: input.actualHomeRuns,
      actualStrikeouts: input.actualStrikeouts,
      closingEdgePercent: input.closingEdgePercent,
      gameId: input.gameId,
      market: input.market,
      moneylineWinnerTeamId: input.moneylineWinnerTeamId,
      outcome: input.outcome,
      predictionId: input.predictionId,
      recordedAt: input.recordedAt ?? new Date().toISOString(),
    };
  }
}
