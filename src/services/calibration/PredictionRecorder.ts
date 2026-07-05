import { CALIBRATION_CONFIG } from "./config.ts";
import type { PredictionRecordInput, RecordedPrediction } from "./types.ts";

export class PredictionRecorder {
  record(input: PredictionRecordInput): RecordedPrediction {
    return {
      confidence: clamp(input.confidence),
      edgePercent: input.edgePercent,
      expectedValuePercent: input.expectedValuePercent,
      fairOdds: input.fairOdds,
      gameId: input.gameId,
      market: input.market,
      modelId: input.modelId ?? CALIBRATION_CONFIG.defaultModelId,
      modelProbability: clampProbability(input.modelProbability),
      odds: input.odds,
      playerId: input.playerId,
      predictionId: input.predictionId ?? buildPredictionId(input),
      recommendation: input.recommendation,
      sportsbook: input.sportsbook,
      teamId: input.teamId,
      timestamp: input.timestamp ?? new Date().toISOString(),
    };
  }
}

function buildPredictionId(input: PredictionRecordInput) {
  return [
    input.market,
    input.gameId,
    input.playerId ?? input.teamId ?? "market",
    input.timestamp ?? "pending",
  ].join(":");
}

function clampProbability(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
