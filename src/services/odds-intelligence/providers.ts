import { readFile } from "node:fs/promises";
import path from "node:path";

import { errorFields, logger } from "../../lib/logger.ts";
import { OddsSnapshotsRepository } from "../../persistence/repositories/odds-snapshots-repository.ts";
import { PredictionsRepository } from "../../persistence/repositories/predictions-repository.ts";
import { HistoricalMarketStorageService } from "../historical-market-storage/HistoricalMarketStorageService.ts";
import type {
  OddsClosingRecord,
  OddsHistoryRecord,
  OddsIntelligenceProviderMode,
  OddsIntelligenceProviderResponse,
} from "./types.ts";

const MONEYLINE_MARKET = "moneyline";

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

/**
 * Builds OddsHistoryRecord time series from real per-game moneyline
 * snapshots (recordGameOddsSnapshots in OddsSnapshotRecorder.ts) joined
 * against real recorded predictions - both durable, both moneyline-only
 * (see MASTER_CHECKLIST.md Section 8j). Each snapshot for a game becomes
 * one record: openingOdds is fixed as that game's earliest captured
 * price, currentOdds is that specific snapshot's price - matching how
 * the existing mock fixtures shape multiple records per predictionId.
 *
 * Closings are left empty for this first pass: determining a genuine
 * "closing" line needs to know a game has actually started/finished,
 * which isn't tracked yet. ClosingLineCalculator/MarketMovementAnalyzer
 * already handle an absent closing gracefully (falls back to the latest
 * snapshot), so this doesn't break the dashboard, it just means CLV
 * specifically isn't computed yet - only opening-to-current movement is.
 *
 * A game only appears if it has both a recorded prediction and at least
 * one snapshot - if either is missing there's nothing meaningful to show
 * for that game yet. Falls back to StaticOddsIntelligenceProvider (empty)
 * on any failure or missing DATABASE_URL.
 */
export class DurableOddsIntelligenceProvider implements OddsIntelligenceProvider {
  readonly id = "odds-intelligence-durable";
  readonly mode: OddsIntelligenceProviderMode = "live";

  async getHistory(): Promise<OddsIntelligenceProviderResponse> {
    if (!process.env.DATABASE_URL) {
      return new StaticOddsIntelligenceProvider().getHistory();
    }

    try {
      const historicalMarket = await new HistoricalMarketStorageService()
        .getOddsHistory();

      if (historicalMarket.history.length > 0) {
        return {
          closings: historicalMarket.closings,
          fetchedAt: new Date().toISOString(),
          history: historicalMarket.history,
          mode: this.mode,
          provider: this.id,
        };
      }

      const [snapshots, predictions] = await Promise.all([
        new OddsSnapshotsRepository().listGameSnapshots(MONEYLINE_MARKET),
        new PredictionsRepository().list(),
      ]);

      const predictionByGameId = new Map(
        predictions
          .filter((prediction) => prediction.market === MONEYLINE_MARKET)
          .map((prediction) => [prediction.gameId, prediction]),
      );
      const snapshotsByGameId = new Map<string, typeof snapshots>();

      for (const snapshot of snapshots) {
        if (!snapshot.gameId) {
          continue;
        }

        const forGame = snapshotsByGameId.get(snapshot.gameId) ?? [];

        forGame.push(snapshot);
        snapshotsByGameId.set(snapshot.gameId, forGame);
      }

      const history: OddsHistoryRecord[] = [];

      for (const [gameId, gameSnapshots] of snapshotsByGameId) {
        const prediction = predictionByGameId.get(gameId);

        if (!prediction) {
          continue;
        }

        const ordered = [...gameSnapshots].sort(
          (left, right) => left.capturedAt.getTime() - right.capturedAt.getTime(),
        );
        const openingOdds = ordered[0].americanOdds;

        for (const snapshot of ordered) {
          history.push({
            currentOdds: snapshot.americanOdds,
            fairOdds: prediction.fairOdds,
            gameId,
            market: MONEYLINE_MARKET,
            openingOdds,
            predictionId: prediction.predictionId,
            probability: prediction.modelProbability,
            sportsbook: snapshot.sportsbook,
            timestamp: snapshot.capturedAt.toISOString(),
          });
        }
      }

      return {
        closings: [],
        fetchedAt: new Date().toISOString(),
        history,
        mode: this.mode,
        provider: this.id,
      };
    } catch (error) {
      logger.error(
        "durable-odds-intelligence-provider",
        "failed to load history",
        errorFields(error),
      );

      return new StaticOddsIntelligenceProvider().getHistory();
    }
  }
}

export function getConfiguredOddsIntelligenceProvider(
  mode: OddsIntelligenceProviderMode = getOddsIntelligenceMode(),
) {
  if (mode === "replay") return new ReplayOddsIntelligenceProvider();
  if (mode === "mock") return new MockOddsIntelligenceProvider();
  if (mode === "live") return new DurableOddsIntelligenceProvider();

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
