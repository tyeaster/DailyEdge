import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  OddsClosingRecord,
  OddsHistoryRecord,
  OddsIntelligenceProviderMode,
  OddsIntelligenceProviderResponse,
} from "./types.ts";

export interface OddsIntelligenceProvider {
  readonly id: string;
  readonly mode: OddsIntelligenceProviderMode;
  getHistory(): Promise<OddsIntelligenceProviderResponse>;
}

export class StaticOddsIntelligenceProvider implements OddsIntelligenceProvider {
  readonly id = "odds-intelligence-static";
  readonly mode: OddsIntelligenceProviderMode = "live";
  private readonly closings: OddsClosingRecord[];
  private readonly history: OddsHistoryRecord[];

  constructor({
    closings = [],
    history = [],
  }: {
    closings?: OddsClosingRecord[];
    history?: OddsHistoryRecord[];
  } = {}) {
    this.closings = closings;
    this.history = history;
  }

  async getHistory(): Promise<OddsIntelligenceProviderResponse> {
    return {
      closings: this.closings,
      fetchedAt: new Date().toISOString(),
      history: this.history,
      mode: this.mode,
      provider: this.id,
    };
  }
}

export class MockOddsIntelligenceProvider implements OddsIntelligenceProvider {
  readonly id = "odds-intelligence-mock";
  readonly mode: OddsIntelligenceProviderMode = "mock";

  async getHistory(): Promise<OddsIntelligenceProviderResponse> {
    return {
      closings: buildMockClosings(),
      fetchedAt: "2026-06-22T18:00:00.000Z",
      history: buildMockHistory(),
      mode: this.mode,
      provider: this.id,
    };
  }
}

export class ReplayOddsIntelligenceProvider implements OddsIntelligenceProvider {
  readonly id = "odds-intelligence-replay";
  readonly mode: OddsIntelligenceProviderMode = "replay";
  private readonly replayFile: string;

  constructor(
    replayFile =
      process.env.ODDS_INTELLIGENCE_REPLAY_FILE ??
      path.join(process.cwd(), "replay", "odds-intelligence", "history.json"),
  ) {
    this.replayFile = replayFile;
  }

  async getHistory(): Promise<OddsIntelligenceProviderResponse> {
    const raw = await readFile(this.replayFile, "utf8");
    const parsed = JSON.parse(raw) as {
      closings: OddsClosingRecord[];
      fetchedAt?: string;
      history: OddsHistoryRecord[];
    };

    return {
      closings: parsed.closings,
      fetchedAt: parsed.fetchedAt ?? new Date().toISOString(),
      history: parsed.history,
      mode: this.mode,
      provider: this.id,
    };
  }
}

export function getConfiguredOddsIntelligenceProvider(
  mode: OddsIntelligenceProviderMode = getOddsIntelligenceMode(),
) {
  if (mode === "replay") return new ReplayOddsIntelligenceProvider();
  if (mode === "mock") return new MockOddsIntelligenceProvider();

  return new StaticOddsIntelligenceProvider();
}

export function buildMockHistory(): OddsHistoryRecord[] {
  return [
    record("odds-k-1", "strikeouts", "DraftKings", 104, 96, -132, 0.62, "2026-06-22T12:00:00.000Z"),
    record("odds-k-1", "strikeouts", "DraftKings", 104, -118, -132, 0.62, "2026-06-22T16:00:00.000Z"),
    record("odds-hr-1", "home-runs", "DraftKings", 285, 250, 245, 0.29, "2026-06-22T12:00:00.000Z"),
    record("odds-hr-1", "home-runs", "DraftKings", 285, 210, 245, 0.29, "2026-06-22T17:30:00.000Z"),
    record("odds-ml-1", "moneyline", "FanDuel", 112, 106, -132, 0.57, "2026-06-22T13:00:00.000Z"),
    record("odds-ml-1", "moneyline", "FanDuel", 112, -118, -132, 0.57, "2026-06-22T18:00:00.000Z"),
  ];
}

export function buildMockClosings(): OddsClosingRecord[] {
  return [
    { closingOdds: -124, predictionId: "odds-k-1", timestamp: "2026-06-22T22:55:00.000Z" },
    { closingOdds: 205, predictionId: "odds-hr-1", timestamp: "2026-06-22T22:55:00.000Z" },
    { closingOdds: -122, predictionId: "odds-ml-1", timestamp: "2026-06-22T22:55:00.000Z" },
  ];
}

function record(
  predictionId: string,
  market: OddsHistoryRecord["market"],
  sportsbook: string,
  openingOdds: number,
  currentOdds: number,
  fairOdds: number,
  probability: number,
  timestamp: string,
): OddsHistoryRecord {
  return {
    currentOdds,
    fairOdds,
    gameId: `game-${predictionId}`,
    market,
    openingOdds,
    predictionId,
    probability,
    sportsbook,
    timestamp,
  };
}

export function getOddsIntelligenceMode(): OddsIntelligenceProviderMode {
  const mode = process.env.ODDS_INTELLIGENCE_MODE;
  if (mode === "live" || mode === "mock" || mode === "replay") return mode;

  return "mock";
}
