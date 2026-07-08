import type { HistoricalSlate } from "../backtesting/types.ts";
import type {
  PredictionResultRecord,
  RecordedPrediction,
} from "../calibration/types.ts";
import type {
  OddsClosingRecord,
  OddsHistoryRecord,
} from "../odds-intelligence/types.ts";
import type { BetCandidate, BetSupportingFactor } from "../ranking/types.ts";
import type {
  HistoricalMarketResult,
  HistoricalMarketSnapshot,
} from "./types.ts";

const DEFAULT_CONFIDENCE = 50;
const DEFAULT_DATA_QUALITY = 70;

export function toRecordedPrediction(
  snapshot: HistoricalMarketSnapshot,
): RecordedPrediction | undefined {
  if (
    !snapshot.predictionId ||
    snapshot.trueLineProbability === undefined ||
    snapshot.fairOdds === undefined ||
    snapshot.edgePercent === undefined ||
    snapshot.expectedValuePercent === undefined
  ) {
    return undefined;
  }

  return {
    confidence: DEFAULT_CONFIDENCE,
    edgePercent: snapshot.edgePercent,
    expectedValuePercent: snapshot.expectedValuePercent,
    fairOdds: snapshot.fairOdds,
    gameId: snapshot.gameId,
    market: snapshot.market,
    modelId: "historical-market-storage-v1",
    modelProbability: snapshot.trueLineProbability,
    odds: snapshot.currentOdds,
    playerId: snapshot.playerId,
    predictionId: snapshot.predictionId,
    recommendation: recommendationFromEdge(snapshot.edgePercent),
    sportsbook: snapshot.sportsbook,
    teamId: snapshot.teamId,
    timestamp: snapshot.capturedAt,
  };
}

export function toPredictionResultRecord({
  result,
  snapshot,
}: {
  result: HistoricalMarketResult;
  snapshot: HistoricalMarketSnapshot;
}): PredictionResultRecord | undefined {
  if (!snapshot.predictionId) {
    return undefined;
  }

  return {
    actualHits: snapshot.market === "hits" ? result.actualStat : undefined,
    actualHomeRuns: snapshot.market === "home-runs" ? result.actualStat : undefined,
    actualStrikeouts: snapshot.market === "strikeouts" ? result.actualStat : undefined,
    closingEdgePercent: snapshot.edgePercent,
    gameId: snapshot.gameId,
    market: snapshot.market,
    outcome: result.outcome,
    predictionId: snapshot.predictionId,
    recordedAt: result.settledAt,
  };
}

export function toOddsHistoryRecord(
  snapshot: HistoricalMarketSnapshot,
): OddsHistoryRecord | undefined {
  if (
    !snapshot.predictionId ||
    snapshot.trueLineProbability === undefined ||
    snapshot.fairOdds === undefined
  ) {
    return undefined;
  }

  return {
    currentLine: snapshot.line,
    currentOdds: snapshot.currentOdds,
    fairOdds: snapshot.fairOdds,
    gameId: snapshot.gameId,
    market: snapshot.market,
    openingLine: snapshot.line,
    openingOdds: snapshot.openingOdds,
    playerId: snapshot.playerId,
    predictionId: snapshot.predictionId,
    probability: snapshot.trueLineProbability,
    sportsbook: snapshot.sportsbook,
    teamId: snapshot.teamId,
    timestamp: snapshot.capturedAt,
  };
}

export function toOddsClosingRecord(
  snapshot: HistoricalMarketSnapshot,
): OddsClosingRecord | undefined {
  if (!snapshot.predictionId || snapshot.closingOdds === undefined) {
    return undefined;
  }

  return {
    closingLine: snapshot.line,
    closingOdds: snapshot.closingOdds,
    predictionId: snapshot.predictionId,
    timestamp: snapshot.updatedAt,
  };
}

export function toBetCandidate(
  snapshot: HistoricalMarketSnapshot,
): BetCandidate | undefined {
  if (
    snapshot.trueLineProbability === undefined ||
    snapshot.fairOdds === undefined ||
    snapshot.edgePercent === undefined ||
    snapshot.expectedValuePercent === undefined
  ) {
    return undefined;
  }

  return {
    betId: snapshot.predictionId ?? snapshot.snapshotId,
    confidence: DEFAULT_CONFIDENCE,
    dataQuality: DEFAULT_DATA_QUALITY,
    edgePercent: snapshot.edgePercent,
    expectedValuePercent: snapshot.expectedValuePercent,
    fairOdds: snapshot.fairOdds,
    marketType: snapshot.market,
    modelProbability: snapshot.trueLineProbability,
    player: snapshot.playerId
      ? { id: snapshot.playerId, name: snapshot.playerId }
      : undefined,
    recommendation: recommendationFromEdge(snapshot.edgePercent),
    sportsbook: snapshot.sportsbook,
    sportsbookOdds: snapshot.currentOdds,
    supportingFactors: buildSupportingFactors(snapshot),
    team: snapshot.teamId ? { id: snapshot.teamId, name: snapshot.teamId } : undefined,
    timestamp: snapshot.capturedAt,
    variance: varianceForMarket(snapshot.market),
  };
}

export function buildHistoricalSlates({
  predictions,
  results,
}: {
  predictions: RecordedPrediction[];
  results: PredictionResultRecord[];
}): HistoricalSlate[] {
  const resultByPredictionId = new Map(
    results.map((result) => [result.predictionId, result]),
  );
  const slatesByDate = new Map<string, HistoricalSlate>();

  for (const prediction of predictions) {
    const date = prediction.timestamp.slice(0, 10);
    const slate = slatesByDate.get(date) ?? {
      calibrationRecords: { predictions: [], results: [] },
      date,
      slateId: `historical-market-${date}`,
    };

    slate.calibrationRecords.predictions.push(prediction);

    const result = resultByPredictionId.get(prediction.predictionId);

    if (result) {
      slate.calibrationRecords.results.push(result);
    }

    slatesByDate.set(date, slate);
  }

  return [...slatesByDate.values()];
}

function recommendationFromEdge(edgePercent: number) {
  if (edgePercent >= 7) return "Strong Play";
  if (edgePercent >= 4) return "Play";
  if (edgePercent >= 1.5) return "Lean";
  return "Pass";
}

function buildSupportingFactors(
  snapshot: HistoricalMarketSnapshot,
): BetSupportingFactor[] {
  return [
    {
      key: "marketStorage",
      label: "Historical Market Storage",
      score: DEFAULT_DATA_QUALITY,
      summary: "Candidate was reconstructed from durable sportsbook market history.",
    },
    {
      key: "edge",
      label: "Stored Edge",
      score: Math.max(0, Math.min(100, (snapshot.edgePercent ?? 0) * 10)),
      summary: "Stored edge was captured with the market snapshot.",
    },
  ];
}

function varianceForMarket(market: HistoricalMarketSnapshot["market"]) {
  if (market === "home-runs" || market === "parlay") return 85;
  if (market === "strikeouts" || market === "total-bases") return 58;
  if (market === "hits" || market === "run-line") return 48;
  return 35;
}
