import { CALIBRATION_CONFIG } from "./config.ts";
import { calculateProfitForOdds } from "./odds.ts";
import type {
  CalibrationMetricSummary,
  CompletedPrediction,
  ModelScorecard,
  PredictionAccuracyRecord,
  RecentAccuracyPoint,
} from "./types.ts";

export class CalibrationCalculator {
  calculateAccuracy(completed: CompletedPrediction): PredictionAccuracyRecord {
    const { prediction, result, stake } = completed;
    const correct = result.outcome === "win";
    const push = result.outcome === "push";
    const absoluteError = Math.abs(prediction.modelProbability - completed.actualProbability);
    const probabilityError = absoluteError * 100;
    const calibrationError = Math.abs(prediction.confidence - completed.actualProbability * 100);
    const profit = push
      ? 0
      : correct
        ? calculateProfitForOdds(prediction.odds, stake)
        : -stake;
    const roi = (profit / stake) * 100;

    return {
      absoluteError,
      calibrationError,
      confidenceAccuracy: 100 - calibrationError,
      correct,
      expectedValueAccuracy:
        prediction.expectedValuePercent === 0
          ? 0
          : 100 - Math.abs(prediction.expectedValuePercent - roi),
      predictionId: prediction.predictionId,
      probabilityError,
      profit,
      roi,
    };
  }

  calculateSummary(completed: CompletedPrediction[]): CalibrationMetricSummary {
    if (completed.length === 0) {
      return { ...CALIBRATION_CONFIG.emptyMetrics };
    }

    const records = completed.map((item) => this.calculateAccuracy(item));
    const graded = completed.filter((item) => item.result.outcome !== "pending");
    const wins = completed.filter((item) => item.result.outcome === "win").length;
    const totalProfit = records.reduce((total, item) => total + item.profit, 0);
    const totalStake = completed.reduce((total, item) => total + item.stake, 0);

    return {
      averageClv: average(
        completed.map((item) => item.prediction.edgePercent - (item.result.closingEdgePercent ?? item.prediction.edgePercent)),
      ),
      averageClosingEdge: average(
        completed.map((item) => item.result.closingEdgePercent ?? item.prediction.edgePercent),
      ),
      averageConfidence: average(completed.map((item) => item.prediction.confidence)),
      averageEdge: average(completed.map((item) => item.prediction.edgePercent)),
      averageEv: average(completed.map((item) => item.prediction.expectedValuePercent)),
      calibrationError: average(records.map((item) => item.calibrationError)),
      closingAccuracy: average(
        completed.map((item) => 100 - Math.abs(item.prediction.edgePercent - (item.result.closingEdgePercent ?? item.prediction.edgePercent))),
      ),
      confidenceAccuracy: average(records.map((item) => item.confidenceAccuracy)),
      expectedValueAccuracy: average(records.map((item) => item.expectedValueAccuracy)),
      predictionVsMarket: average(
        completed.map((item) => item.prediction.modelProbability * 100 - probabilityFromAmericanOdds(item.prediction.odds) * 100),
      ),
      predictionCount: completed.length,
      roi: totalStake === 0 ? 0 : (totalProfit / totalStake) * 100,
      winRate: graded.length === 0 ? 0 : (wins / graded.length) * 100,
    };
  }

  buildScorecards(completed: CompletedPrediction[]): ModelScorecard[] {
    const groups = new Map<string, CompletedPrediction[]>();

    for (const item of completed) {
      const key = `${item.prediction.modelId}:${item.prediction.market}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return [...groups.entries()]
      .map(([key, values]) => {
        const [modelId, market] = key.split(":");
        const summary = this.calculateSummary(values);

        return {
          averageConfidence: summary.averageConfidence,
          averageEdge: summary.averageEdge,
          averageEv: summary.averageEv,
          calibration: 100 - summary.calibrationError,
          confidenceAccuracy: summary.confidenceAccuracy,
          market: market as ModelScorecard["market"],
          modelId,
          predictionCount: summary.predictionCount,
          roi: summary.roi,
          winRate: summary.winRate,
        };
      })
      .sort((left, right) => right.roi - left.roi);
  }

  buildRecentAccuracy(completed: CompletedPrediction[]): RecentAccuracyPoint[] {
    const byDate = new Map<string, CompletedPrediction[]>();

    for (const item of completed) {
      const date = item.result.recordedAt.slice(0, 10);
      byDate.set(date, [...(byDate.get(date) ?? []), item]);
    }

    return [...byDate.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, values]) => {
        const summary = this.calculateSummary(values);

        return {
          date,
          predictionCount: values.length,
          roi: summary.roi,
          winRate: summary.winRate,
        };
      });
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function probabilityFromAmericanOdds(odds: number) {
  if (odds > 0) return 100 / (odds + 100);

  return Math.abs(odds) / (Math.abs(odds) + 100);
}
