import { CALIBRATION_CONFIG } from "./config.ts";
import { CalibrationCalculator } from "./CalibrationCalculator.ts";
import { ConfidenceCalibrationEngine } from "./ConfidenceCalibrationEngine.ts";
import { getActualProbability } from "./odds.ts";
import {
  getConfiguredCalibrationProvider,
  type CalibrationHistoryProvider,
} from "./providers.ts";
import { PredictionRecorder } from "./PredictionRecorder.ts";
import { ResultRecorder } from "./ResultRecorder.ts";
import type {
  CalibrationDashboardViewModel,
  CompletedPrediction,
  PredictionRecordInput,
  ResultRecordInput,
} from "./types.ts";

export class CalibrationService {
  private readonly calculator: CalibrationCalculator;
  private readonly confidenceCalibration: ConfidenceCalibrationEngine;
  private readonly predictionRecorder: PredictionRecorder;
  private readonly provider: CalibrationHistoryProvider;
  private readonly resultRecorder: ResultRecorder;

  constructor({
    calculator = new CalibrationCalculator(),
    confidenceCalibration = new ConfidenceCalibrationEngine(),
    predictionRecorder = new PredictionRecorder(),
    provider = getConfiguredCalibrationProvider(),
    resultRecorder = new ResultRecorder(),
  }: {
    calculator?: CalibrationCalculator;
    confidenceCalibration?: ConfidenceCalibrationEngine;
    predictionRecorder?: PredictionRecorder;
    provider?: CalibrationHistoryProvider;
    resultRecorder?: ResultRecorder;
  } = {}) {
    this.calculator = calculator;
    this.confidenceCalibration = confidenceCalibration;
    this.predictionRecorder = predictionRecorder;
    this.provider = provider;
    this.resultRecorder = resultRecorder;
  }

  recordPrediction(input: PredictionRecordInput) {
    return this.predictionRecorder.record(input);
  }

  recordResult(input: ResultRecordInput) {
    return this.resultRecorder.record(input);
  }

  async getDashboard(): Promise<CalibrationDashboardViewModel> {
    const history = await this.provider.getHistory();
    const completed = joinCompletedPredictions(
      history.predictions,
      history.results,
    );
    const scorecards = this.calculator.buildScorecards(completed);

    return {
      bestModels: [...scorecards].sort((left, right) => right.roi - left.roi).slice(0, 5),
      confidenceCurve: this.confidenceCalibration.buildConfidenceCurve(completed),
      fetchedAt: history.fetchedAt,
      marketPerformance: scorecards,
      mode: history.mode,
      overallMetrics: this.calculator.calculateSummary(completed),
      provider: history.provider,
      recentAccuracy: this.calculator.buildRecentAccuracy(completed),
      worstModels: [...scorecards].sort((left, right) => left.roi - right.roi).slice(0, 5),
    };
  }
}

export const calibrationService = new CalibrationService();

export function joinCompletedPredictions(
  predictions: Awaited<ReturnType<CalibrationHistoryProvider["getHistory"]>>["predictions"],
  results: Awaited<ReturnType<CalibrationHistoryProvider["getHistory"]>>["results"],
): CompletedPrediction[] {
  const resultByPredictionId = new Map(
    results.map((result) => [result.predictionId, result]),
  );

  return predictions
    .map((prediction) => {
      const result = resultByPredictionId.get(prediction.predictionId);

      if (!result || result.outcome === "pending") return undefined;

      const completed: CompletedPrediction = {
        actualProbability: getActualProbability(result.outcome),
        prediction,
        result,
        stake: CALIBRATION_CONFIG.defaultStake,
      };

      return completed;
    })
    .filter((item): item is CompletedPrediction => item !== undefined);
}
