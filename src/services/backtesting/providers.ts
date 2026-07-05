import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  BacktestProviderMode,
  HistoricalSlate,
  HistoricalSlateProviderResponse,
} from "./types.ts";

export interface HistoricalSlateProvider {
  readonly id: string;
  readonly mode: BacktestProviderMode;
  getSlates(): Promise<HistoricalSlateProviderResponse>;
}

export class StaticHistoricalSlateProvider implements HistoricalSlateProvider {
  readonly id = "backtesting-static";
  readonly mode: BacktestProviderMode = "live";
  private readonly slates: HistoricalSlate[];

  constructor(slates: HistoricalSlate[] = []) {
    this.slates = slates;
  }

  async getSlates(): Promise<HistoricalSlateProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      mode: this.mode,
      provider: this.id,
      slates: this.slates,
    };
  }
}

export class MockHistoricalSlateProvider implements HistoricalSlateProvider {
  readonly id = "backtesting-mock";
  readonly mode: BacktestProviderMode = "mock";

  async getSlates(): Promise<HistoricalSlateProviderResponse> {
    return {
      fetchedAt: "2026-06-25T16:00:00.000Z",
      mode: this.mode,
      provider: this.id,
      slates: buildMockHistoricalSlates(),
    };
  }
}

export class ReplayHistoricalSlateProvider implements HistoricalSlateProvider {
  readonly id = "backtesting-replay";
  readonly mode: BacktestProviderMode = "replay";
  private readonly replayFile: string;

  constructor(
    replayFile =
      process.env.BACKTEST_REPLAY_FILE ??
      path.join(process.cwd(), "replay", "backtesting", "historical-slates.json"),
  ) {
    this.replayFile = replayFile;
  }

  async getSlates(): Promise<HistoricalSlateProviderResponse> {
    const raw = await readFile(this.replayFile, "utf8");
    const parsed = JSON.parse(raw) as {
      fetchedAt?: string;
      slates: HistoricalSlate[];
    };

    return {
      fetchedAt: parsed.fetchedAt ?? new Date().toISOString(),
      mode: this.mode,
      provider: this.id,
      slates: parsed.slates,
    };
  }
}

export function getConfiguredHistoricalSlateProvider(
  mode: BacktestProviderMode = getBacktestMode(),
) {
  if (mode === "replay") return new ReplayHistoricalSlateProvider();
  if (mode === "mock") return new MockHistoricalSlateProvider();

  return new StaticHistoricalSlateProvider();
}

export function buildMockHistoricalSlates(): HistoricalSlate[] {
  return [
    slate("2026-06-20", [
      prediction("bt-k-1", "strikeouts", "win", 0.62, 74, 7.2, 5.9, 104, "player-wheeler", undefined, "DraftKings"),
      prediction("bt-hit-1", "hits", "win", 0.58, 68, 4.4, 3.1, -155, "player-harper", undefined, "DraftKings"),
      prediction("bt-ml-1", "moneyline", "loss", 0.53, 61, 1.6, 0.8, -118, undefined, "team-lad", "FanDuel"),
    ]),
    slate("2026-06-21", [
      prediction("bt-hr-1", "home-runs", "loss", 0.28, 72, 5.8, 4.5, 285, "player-judge", undefined, "DraftKings"),
      prediction("bt-ml-2", "moneyline", "win", 0.57, 79, 6.4, 5.5, 112, undefined, "team-phi", "DraftKings"),
    ]),
    slate("2026-06-22", [
      prediction("bt-k-2", "strikeouts", "loss", 0.55, 64, 2.5, 1.2, -110, "player-cole", undefined, "DraftKings"),
      prediction("bt-hit-2", "hits", "push", 0.56, 66, 3.1, 2.3, -125, "player-soto", undefined, "FanDuel"),
      prediction("bt-ml-3", "moneyline", "win", 0.61, 82, 8.1, 6.8, 135, undefined, "team-sea", "DraftKings"),
    ]),
  ];
}

function slate(date: string, rows: ReturnType<typeof prediction>[]): HistoricalSlate {
  return {
    calibrationRecords: {
      predictions: rows.map((row) => row.prediction),
      results: rows.map((row) => row.result),
    },
    date,
    slateId: `slate-${date}`,
  };
}

function prediction(
  id: string,
  market: HistoricalSlate["calibrationRecords"]["predictions"][number]["market"],
  outcome: HistoricalSlate["calibrationRecords"]["results"][number]["outcome"],
  probability: number,
  confidence: number,
  edge: number,
  ev: number,
  odds: number,
  playerId: string | undefined,
  teamId: string | undefined,
  sportsbook: string,
) {
  return {
    prediction: {
      confidence,
      edgePercent: edge,
      expectedValuePercent: ev,
      fairOdds: odds > 0 ? odds - 24 : odds - 16,
      gameId: `game-${id}`,
      market,
      modelId: "trueline-v1",
      modelProbability: probability,
      odds,
      playerId,
      predictionId: id,
      recommendation: edge >= 5 ? "Play" : "Lean",
      sportsbook,
      teamId,
      timestamp: `2026-06-${id.includes("1") ? "20" : "22"}T16:00:00.000Z`,
    },
    result: {
      closingEdgePercent: edge - 0.8,
      gameId: `game-${id}`,
      market,
      outcome,
      predictionId: id,
      recordedAt: `2026-06-${id.includes("1") ? "20" : "22"}T23:00:00.000Z`,
    },
  };
}

function getBacktestMode(): BacktestProviderMode {
  const mode = process.env.BACKTEST_MODE;

  if (mode === "live" || mode === "mock" || mode === "replay") return mode;

  return "mock";
}
