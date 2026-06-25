import type { DataQuality, PredictionResult } from "../../models/mlb.ts";

import { PREDICTION_ENGINE_V1_CONFIG } from "./config.ts";

export interface PredictionDiagnostics {
  dataQuality: DataQuality;
  environment: typeof PREDICTION_ENGINE_V1_CONFIG.environment;
  inputSources: Record<string, string>;
  missingInputs: string[];
  predictionVersion: string;
  weights: typeof PREDICTION_ENGINE_V1_CONFIG.weights;
}

export class PredictionDiagnosticsService {
  create(result: PredictionResult): PredictionDiagnostics {
    return {
      dataQuality: result.dataQuality,
      environment: PREDICTION_ENGINE_V1_CONFIG.environment,
      inputSources: Object.fromEntries(
        Object.values(result.dataQuality.inputs).map((input) => [
          input.label,
          input.source,
        ]),
      ),
      missingInputs: result.dataQuality.missingInputs,
      predictionVersion: result.predictionVersion,
      weights: PREDICTION_ENGINE_V1_CONFIG.weights,
    };
  }
}

export const predictionDiagnosticsService =
  new PredictionDiagnosticsService();
