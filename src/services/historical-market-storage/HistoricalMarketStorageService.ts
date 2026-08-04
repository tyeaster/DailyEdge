import { errorFields, logger } from "../../lib/logger.ts";
import { HistoricalMarketRepository } from "../../persistence/repositories/historical-market-repository.ts";
import type { NormalizedGameResult } from "../../providers/game-results/index.ts";
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
  HistoricalMarketProviderResponse,
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

  async settleGameMarkets(
    gameResult: NormalizedGameResult,
  ): Promise<{ settled: number }> {
    if (!process.env.DATABASE_URL) {
      return { settled: 0 };
    }

    try {
      const repository = new HistoricalMarketRepository();
      const snapshots = await repository.listSnapshotsByGameId(gameResult.gameId);
      let settled = 0;

      for (const snapshot of snapshots) {
        const settlement = buildGameMarketSettlement(snapshot, gameResult);

        if (!settlement) {
          continue;
        }

        await repository.settleMarket(settlement);
        settled += 1;
      }

      return { settled };
    } catch (error) {
      logger.error(
        "historical-market-storage",
        "failed to settle game markets",
        errorFields(error),
      );

      return { settled: 0 };
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

  async getDailySlateHistory(): Promise<HistoricalDailySlate[]> {
    const response = await this.provider.getHistory();

    return buildDailySlateHistory(response);
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

export interface HistoricalDailySlate {
  date: string;
  games: Array<{
    gameId: string;
    markets: HistoricalMarketProviderResponse["snapshots"];
  }>;
  slateId: string;
}

export function buildGameMarketSettlement(
  snapshot: HistoricalMarketProviderResponse["snapshots"][number],
  gameResult: NormalizedGameResult,
): HistoricalMarketSettlementInput | undefined {
  if (snapshot.market === "moneyline") {
    if (!snapshot.teamId) return undefined;

    return {
      finalResult: gameResult.winningTeamId,
      outcome: snapshot.teamId === gameResult.winningTeamId ? "win" : "loss",
      settledAt: gameResult.completedAt,
      snapshotId: snapshot.snapshotId,
    };
  }

  if (snapshot.market === "run-line") {
    if (!snapshot.teamId || snapshot.line === undefined) return undefined;

    const selectedScore = getTeamScore(snapshot.teamId, gameResult);
    const opponentScore = getOpponentScore(snapshot.teamId, gameResult);

    if (selectedScore === undefined || opponentScore === undefined) return undefined;

    const adjustedMargin = selectedScore - opponentScore + snapshot.line;

    return {
      actualStat: selectedScore - opponentScore,
      finalResult: `${selectedScore}-${opponentScore}`,
      outcome: outcomeFromDifference(adjustedMargin),
      settledAt: gameResult.completedAt,
      snapshotId: snapshot.snapshotId,
    };
  }

  if (snapshot.market === "game-total") {
    if (snapshot.line === undefined) return undefined;

    const totalRuns = gameResult.awayScore + gameResult.homeScore;
    const isUnder = snapshot.selection?.toLowerCase().includes("under") ?? false;
    const difference = isUnder
      ? snapshot.line - totalRuns
      : totalRuns - snapshot.line;

    return {
      actualStat: totalRuns,
      finalResult: String(totalRuns),
      outcome: outcomeFromDifference(difference),
      settledAt: gameResult.completedAt,
      snapshotId: snapshot.snapshotId,
    };
  }

  if (snapshot.market === "team-total") {
    if (!snapshot.teamId || snapshot.line === undefined) return undefined;

    const teamScore = getTeamScore(snapshot.teamId, gameResult);

    if (teamScore === undefined) return undefined;

    const isUnder = snapshot.selection?.toLowerCase().includes("under") ?? false;
    const difference = isUnder ? snapshot.line - teamScore : teamScore - snapshot.line;

    return {
      actualStat: teamScore,
      finalResult: String(teamScore),
      outcome: outcomeFromDifference(difference),
      settledAt: gameResult.completedAt,
      snapshotId: snapshot.snapshotId,
    };
  }

  return undefined;
}

function buildDailySlateHistory(
  response: HistoricalMarketProviderResponse,
): HistoricalDailySlate[] {
  const slateByDate = new Map<string, HistoricalDailySlate>();

  for (const snapshot of response.snapshots) {
    const date = snapshot.capturedAt.slice(0, 10);
    const slate = slateByDate.get(date) ?? {
      date,
      games: [],
      slateId: `historical-market-slate-${date}`,
    };
    const game = slate.games.find((item) => item.gameId === snapshot.gameId);

    if (game) {
      game.markets.push(snapshot);
    } else {
      slate.games.push({ gameId: snapshot.gameId, markets: [snapshot] });
    }

    slateByDate.set(date, slate);
  }

  return [...slateByDate.values()];
}

function getTeamScore(teamId: string, result: NormalizedGameResult) {
  if (teamId === result.homeTeamId) return result.homeScore;
  if (teamId === result.awayTeamId) return result.awayScore;
  return undefined;
}

function getOpponentScore(teamId: string, result: NormalizedGameResult) {
  if (teamId === result.homeTeamId) return result.awayScore;
  if (teamId === result.awayTeamId) return result.homeScore;
  return undefined;
}

function outcomeFromDifference(difference: number) {
  if (difference > 0) return "win";
  if (difference < 0) return "loss";
  return "push";
}
