import { CALIBRATION_CONFIG } from "./config.ts";
import type { CompletedPrediction, ConfidenceBucket } from "./types.ts";

export class ConfidenceCalibrationEngine {
  buildConfidenceCurve(completed: CompletedPrediction[]): ConfidenceBucket[] {
    return CALIBRATION_CONFIG.bucketRanges.map((range) => {
      const bucket = completed.filter((item) => {
        const confidence = item.prediction.confidence;

        return confidence >= range.min && confidence < range.max;
      });
      const predictedWinPercent =
        bucket.length === 0
          ? midpoint(range.min, range.max)
          : average(bucket.map((item) => item.prediction.confidence));
      const actualWinPercent =
        bucket.length === 0
          ? 0
          : (bucket.filter((item) => item.result.outcome === "win").length / bucket.length) *
            100;
      const difference = actualWinPercent - predictedWinPercent;

      return {
        actualWinPercent,
        calibrationScore: bucket.length === 0 ? 0 : Math.max(0, 100 - Math.abs(difference)),
        count: bucket.length,
        difference,
        label: range.label,
        predictedWinPercent,
        range: {
          max: range.max,
          min: range.min,
        },
      };
    });
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function midpoint(min: number, max: number) {
  if (max > 100) return 95;

  return (min + max) / 2;
}
