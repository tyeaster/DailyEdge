import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  CalibrationProviderMode,
  CalibrationProviderResponse,
  PredictionResultRecord,
  RecordedPrediction,
} from "./types.ts";

export interface CalibrationHistoryProvider {
  readonly id: string;
  readonly mode: CalibrationProviderMode;
  getHistory(): Promise<CalibrationProviderResponse>;
}

export class StaticCalibrationProvider implements CalibrationHistoryProvider {
  readonly id = "calibration-static";
  readonly mode: CalibrationProviderMode = "live";
  private readonly predictions: RecordedPrediction[];
  private readonly results: PredictionResultRecord[];

  constructor({
    predictions = [],
    results = [],
  }: {
    predictions?: RecordedPrediction[];
    results?: PredictionResultRecord[];
  } = {}) {
    this.predictions = predictions;
    this.results = results;
  }

  async getHistory(): Promise<CalibrationProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      mode: this.mode,
      predictions: this.predictions,
      provider: this.id,
      results: this.results,
    };
  }
}

export class MockCalibrationProvider implements CalibrationHistoryProvider {
  readonly id = "calibration-mock";
  readonly mode: CalibrationProviderMode = "mock";

  async getHistory(): Promise<CalibrationProviderResponse> {
    return {
      fetchedAt: "2026-06-22T16:00:00.000Z",
      mode: this.mode,
      predictions: buildMockPredictions(),
      provider: this.id,
      results: buildMockResults(),
    };
  }
}

export class ReplayCalibrationProvider implements CalibrationHistoryProvider {
  readonly id = "calibration-replay";
  readonly mode: CalibrationProviderMode = "replay";
  private readonly replayFile: string;

  constructor(
    replayFile =
      process.env.CALIBRATION_REPLAY_FILE ??
      path.join(process.cwd(), "replay", "calibration", "history.json"),
  ) {
    this.replayFile = replayFile;
  }

  async getHistory(): Promise<CalibrationProviderResponse> {
    const raw = await readFile(this.replayFile, "utf8");
    const parsed = JSON.parse(raw) as {
      fetchedAt?: string;
      predictions: RecordedPrediction[];
      results: PredictionResultRecord[];
    };

    return {
      fetchedAt: parsed.fetchedAt ?? new Date().toISOString(),
      mode: this.mode,
      predictions: parsed.predictions,
      provider: this.id,
      results: parsed.results,
    };
  }
}

export function getConfiguredCalibrationProvider(
  mode: CalibrationProviderMode = getCalibrationMode(),
) {
  if (mode === "replay") return new ReplayCalibrationProvider();
  if (mode === "mock") return new MockCalibrationProvider();

  return new StaticCalibrationProvider();
}

export function getCalibrationMode(): CalibrationProviderMode {
  const mode = process.env.CALIBRATION_MODE;

  if (mode === "live" || mode === "mock" || mode === "replay") return mode;

  return "mock";
}

function buildMockPredictions(): RecordedPrediction[] {
  return [
    prediction("pred-k-1", "strikeouts", 0.62, 74, 7.2, 5.9, 104, "player-wheeler", undefined, "2026-06-20T16:00:00.000Z"),
    prediction("pred-hit-1", "hits", 0.58, 68, 4.4, 3.1, -155, "player-harper", undefined, "2026-06-20T16:05:00.000Z"),
    prediction("pred-hr-1", "home-runs", 0.28, 72, 5.8, 4.5, 285, "player-judge", undefined, "2026-06-21T15:30:00.000Z"),
    prediction("pred-ml-1", "moneyline", 0.57, 79, 6.4, 5.5, 112, undefined, "team-phi", "2026-06-21T15:40:00.000Z"),
    prediction("pred-k-2", "strikeouts", 0.55, 64, 2.5, 1.2, -110, "player-cole", undefined, "2026-06-22T15:00:00.000Z"),
    prediction("pred-ml-2", "moneyline", 0.53, 61, 1.6, 0.8, -118, undefined, "team-lad", "2026-06-22T15:15:00.000Z"),
  ];
}

function buildMockResults(): PredictionResultRecord[] {
  return [
    result("pred-k-1", "strikeouts", "win", "2026-06-20T23:30:00.000Z", { actualStrikeouts: 8, closingEdgePercent: 5.8 }),
    result("pred-hit-1", "hits", "win", "2026-06-20T23:35:00.000Z", { actualHits: 2, closingEdgePercent: 2.7 }),
    result("pred-hr-1", "home-runs", "loss", "2026-06-21T23:10:00.000Z", { actualHomeRuns: 0, closingEdgePercent: 3.1 }),
    result("pred-ml-1", "moneyline", "win", "2026-06-21T23:20:00.000Z", { moneylineWinnerTeamId: "team-phi", closingEdgePercent: 4.8 }),
    result("pred-k-2", "strikeouts", "loss", "2026-06-22T23:30:00.000Z", { actualStrikeouts: 4, closingEdgePercent: 1.1 }),
    result("pred-ml-2", "moneyline", "loss", "2026-06-22T23:40:00.000Z", { moneylineWinnerTeamId: "team-atl", closingEdgePercent: -0.2 }),
  ];
}

function prediction(
  predictionId: string,
  market: RecordedPrediction["market"],
  modelProbability: number,
  confidence: number,
  edgePercent: number,
  expectedValuePercent: number,
  odds: number,
  playerId: string | undefined,
  teamId: string | undefined,
  timestamp: string,
): RecordedPrediction {
  return {
    confidence,
    edgePercent,
    expectedValuePercent,
    fairOdds: odds > 0 ? odds - 30 : odds - 18,
    gameId: `game-${predictionId}`,
    market,
    modelId: "trueline-v1",
    modelProbability,
    odds,
    playerId,
    predictionId,
    recommendation: edgePercent >= 5 ? "Play" : "Lean",
    sportsbook: "DraftKings",
    teamId,
    timestamp,
  };
}

function result(
  predictionId: string,
  market: PredictionResultRecord["market"],
  outcome: PredictionResultRecord["outcome"],
  recordedAt: string,
  extras: Partial<PredictionResultRecord>,
): PredictionResultRecord {
  return {
    gameId: `game-${predictionId}`,
    market,
    outcome,
    predictionId,
    recordedAt,
    ...extras,
  };
}
