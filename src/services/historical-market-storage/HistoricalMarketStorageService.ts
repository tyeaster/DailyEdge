import { errorFields, logger } from "../../lib/logger.ts";
import { HistoricalMarketRepository } from "../../persistence/repositories/historical-market-repository.ts";
import {
  buildHistoricalSlates,
  toBetCandidate,
  toOddsClosingRecord,
  toOddsHistoryRecord,
  toPredictionResultRecord,
  toRecordedPrediction,
} from "./mappers.ts";
import {
  getConfiguredHistoricalMarketProvider,
  type HistoricalMarketProvider,
} from "./providers.ts";
import type {
  HistoricalMarketCalibrationHistory,
  HistoricalMarketOddsHistory,
  HistoricalMarketRankingHistory,
  HistoricalMarketSettlementInput,
  HistoricalMarketSnapshotInput,
} from "./types.ts";

export class HistoricalMarketStorageService {
  private readonly provider: HistoricalMarketProvider;

  constructor(
    provider: HistoricalMarketProvider = getConfiguredHistoricalMarketProvider(),
  ) {
    this.provider = provider;
  }

  async recordSnapshot(input: HistoricalMarketSnapshotInput): Promise<void> {
    if (!process.env.DATABASE_URL) {
      return;
    }

    try {
      await new HistoricalMarketRepository().recordSnapshot(input);
    } catch (error) {
      logger.error(
        "historical-market-storage",
        "failed to record historical market snapshot",
        errorFields(error),
      );
    }
  }

  async settleMarket(input: HistoricalMarketSettlementInput): Promise<void> {
    if (!process.env.DATABASE_URL) {
      return;
    }

    try {
      await new HistoricalMarketRepository().settleMarket(input);
    } catch (error) {
      logger.error(
        "historical-market-storage",
        "failed to settle historical market",
        errorFields(error),
      );
    }
  }

  async getCalibrationHistory(): Promise<HistoricalMarketCalibrationHistory> {
    const response = await this.provider.getHistory();
    const snapshotById = new Map(
      response.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]),
    );
    const predictions = response.snapshots
      .map(toRecordedPrediction)
      .filter((prediction) => prediction !== undefined);
    const results = response.results
      .map((result) => {
        const snapshot = snapshotById.get(result.snapshotId);

        return snapshot ? toPredictionResultRecord({ result, snapshot }) : undefined;
      })
      .filter((result) => result !== undefined);

    return { predictions, results };
  }

  async getHistoricalSlates() {
    return buildHistoricalSlates(await this.getCalibrationHistory());
  }

  async getOddsHistory(): Promise<HistoricalMarketOddsHistory> {
    const response = await this.provider.getHistory();

    return {
      closings: response.snapshots
        .map(toOddsClosingRecord)
        .filter((closing) => closing !== undefined),
      history: response.snapshots
        .map(toOddsHistoryRecord)
        .filter((record) => record !== undefined),
    };
  }

  async getRankingHistory(): Promise<HistoricalMarketRankingHistory> {
    const response = await this.provider.getHistory();

    return {
      candidates: response.snapshots
        .map(toBetCandidate)
        .filter((candidate) => candidate !== undefined),
    };
  }
}

export const historicalMarketStorageService = new HistoricalMarketStorageService();
