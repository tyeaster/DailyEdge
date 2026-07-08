import type { PredictionResultRecord } from "../calibration/types.ts";
import type {
  BacktestSettings,
  HistoricalSlate,
} from "./types.ts";

export class StrategyEvaluator {
  selectBets(slates: HistoricalSlate[], settings: BacktestSettings) {
    const selected: Array<{
      date: string;
      prediction: HistoricalSlate["calibrationRecords"]["predictions"][number];
      result: PredictionResultRecord;
    }> = [];

    for (const slate of slates.filter((item) => isDateInRange(item.date, settings))) {
      const resultById = new Map(
        slate.calibrationRecords.results.map((result) => [result.predictionId, result]),
      );
      const daily = slate.calibrationRecords.predictions
        .map((prediction) => {
          const result = resultById.get(prediction.predictionId);

          return result ? { date: slate.date, prediction, result } : undefined;
        })
        .filter((item): item is NonNullable<typeof item> => item !== undefined)
        .filter(({ prediction }) => matchesSettings(prediction, settings))
        .sort((left, right) => right.prediction.expectedValuePercent - left.prediction.expectedValuePercent);

      selected.push(...daily.slice(0, settings.maximumBetsPerDay ?? daily.length));
    }

    return selected;
  }
}

function isDateInRange(date: string, settings: BacktestSettings) {
  if (settings.dateFrom && date < settings.dateFrom) return false;
  if (settings.dateTo && date > settings.dateTo) return false;

  return true;
}

function matchesSettings(
  prediction: HistoricalSlate["calibrationRecords"]["predictions"][number],
  settings: BacktestSettings,
) {
  if (settings.market && prediction.market !== settings.market) return false;
  if (settings.markets && !settings.markets.includes(prediction.market)) return false;
  if (
    settings.minimumConfidence !== undefined &&
    prediction.confidence < settings.minimumConfidence
  ) {
    return false;
  }
  if (settings.minimumEdge !== undefined && prediction.edgePercent < settings.minimumEdge) {
    return false;
  }
  if (
    settings.minimumEv !== undefined &&
    prediction.expectedValuePercent < settings.minimumEv
  ) {
    return false;
  }
  if (settings.sportsbook && prediction.sportsbook !== settings.sportsbook) return false;
  if (settings.playerId && prediction.playerId !== settings.playerId) return false;
  if (settings.teamId && prediction.teamId !== settings.teamId) return false;
  if (settings.favoriteOnly && prediction.odds > 0) return false;
  if (settings.underdogOnly && prediction.odds < 0) return false;

  return true;
}
