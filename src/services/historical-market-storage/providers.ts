import { readFile } from "node:fs/promises";
import path from "node:path";

import { errorFields, logger } from "../../lib/logger.ts";
import { HistoricalMarketRepository } from "../../persistence/repositories/historical-market-repository.ts";
import type {
  HistoricalMarketProviderResponse,
  HistoricalMarketStorageMode,
} from "./types.ts";

export interface HistoricalMarketProvider {
  readonly id: string;
  readonly mode: HistoricalMarketStorageMode;
  getHistory(): Promise<HistoricalMarketProviderResponse>;
}

export class StaticHistoricalMarketProvider implements HistoricalMarketProvider {
  readonly id = "historical-market-static";
  readonly mode: HistoricalMarketStorageMode = "live";

  async getHistory(): Promise<HistoricalMarketProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      mode: this.mode,
      provider: this.id,
      results: [],
      snapshots: [],
    };
  }
}

export class MockHistoricalMarketProvider implements HistoricalMarketProvider {
  readonly id = "historical-market-mock";
  readonly mode: HistoricalMarketStorageMode = "mock";

  async getHistory(): Promise<HistoricalMarketProviderResponse> {
    return {
      fetchedAt: "2026-07-08T18:00:00.000Z",
      mode: this.mode,
      provider: this.id,
      results: [
        {
          actualStat: 7,
          finalResult: "Wheeler over 6.5 strikeouts",
          market: "strikeouts",
          outcome: "win",
          resultId: "mock-result-wheeler-k",
          settledAt: "2026-07-08T23:15:00.000Z",
          snapshotId: "mock-market-wheeler-k",
        },
      ],
      snapshots: [
        {
          capturedAt: "2026-07-08T18:00:00.000Z",
          closingOdds: -118,
          currentOdds: -110,
          edgePercent: 5.4,
          expectedValuePercent: 4.8,
          fairOdds: -132,
          gameId: "game-mock-1",
          line: 6.5,
          market: "strikeouts",
          openingOdds: 104,
          playerId: "player-wheeler",
          predictionId: "mock-market-prediction-wheeler-k",
          provider: "mock",
          selection: "Over",
          snapshotId: "mock-market-wheeler-k",
          sportsbook: "DraftKings",
          teamId: "team-phi",
          trueLineProbability: 0.57,
          updatedAt: "2026-07-08T22:30:00.000Z",
        },
      ],
    };
  }
}

export class ReplayHistoricalMarketProvider implements HistoricalMarketProvider {
  readonly id = "historical-market-replay";
  readonly mode: HistoricalMarketStorageMode = "replay";
  private readonly replayFile: string;

  constructor(
    replayFile =
      process.env.HISTORICAL_MARKET_REPLAY_FILE ??
      path.join(process.cwd(), "replay", "historical-market-storage", "history.json"),
  ) {
    this.replayFile = replayFile;
  }

  async getHistory(): Promise<HistoricalMarketProviderResponse> {
    const raw = await readFile(this.replayFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<HistoricalMarketProviderResponse>;

    return {
      fetchedAt: parsed.fetchedAt ?? new Date().toISOString(),
      mode: this.mode,
      provider: this.id,
      results: parsed.results ?? [],
      snapshots: parsed.snapshots ?? [],
    };
  }
}

export class DurableHistoricalMarketProvider implements HistoricalMarketProvider {
  readonly id = "historical-market-durable";
  readonly mode: HistoricalMarketStorageMode = "live";

  async getHistory(): Promise<HistoricalMarketProviderResponse> {
    if (!process.env.DATABASE_URL) {
      return new StaticHistoricalMarketProvider().getHistory();
    }

    try {
      const repository = new HistoricalMarketRepository();
      const [snapshots, results] = await Promise.all([
        repository.listSnapshots(),
        repository.listResults(),
      ]);

      return {
        fetchedAt: new Date().toISOString(),
        mode: this.mode,
        provider: this.id,
        results,
        snapshots,
      };
    } catch (error) {
      logger.error(
        "historical-market-provider",
        "failed to load historical market history",
        errorFields(error),
      );

      return new StaticHistoricalMarketProvider().getHistory();
    }
  }
}

export function getConfiguredHistoricalMarketProvider(
  mode: HistoricalMarketStorageMode = getHistoricalMarketMode(),
) {
  if (mode === "replay") return new ReplayHistoricalMarketProvider();
  if (mode === "mock") return new MockHistoricalMarketProvider();

  return new DurableHistoricalMarketProvider();
}

export function getHistoricalMarketMode(): HistoricalMarketStorageMode {
  const mode = process.env.HISTORICAL_MARKET_MODE;

  if (mode === "live" || mode === "mock" || mode === "replay") return mode;

  return "live";
}
