import { eq } from "drizzle-orm";

import type {
  HistoricalMarketResult,
  HistoricalMarketSettlementInput,
  HistoricalMarketSnapshot,
  HistoricalMarketSnapshotInput,
} from "@/src/services/historical-market-storage/types";

import { getDb } from "../client.ts";
import {
  historicalMarketResults,
  historicalMarketSnapshots,
} from "../schema.ts";

export class HistoricalMarketRepository {
  private readonly db: ReturnType<typeof getDb>;

  constructor(db: ReturnType<typeof getDb> = getDb()) {
    this.db = db;
  }

  async recordSnapshot(
    input: HistoricalMarketSnapshotInput,
  ): Promise<HistoricalMarketSnapshot> {
    const snapshot = normalizeSnapshotInput(input);

    await this.db
      .insert(historicalMarketSnapshots)
      .values({
        capturedAt: new Date(snapshot.capturedAt),
        closingOdds: snapshot.closingOdds,
        currentOdds: snapshot.currentOdds,
        edgePercent: snapshot.edgePercent,
        expectedValuePercent: snapshot.expectedValuePercent,
        fairOdds: snapshot.fairOdds,
        gameId: snapshot.gameId,
        line: snapshot.line,
        market: snapshot.market,
        openingOdds: snapshot.openingOdds,
        playerId: snapshot.playerId,
        predictionId: snapshot.predictionId,
        provider: snapshot.provider,
        selection: snapshot.selection,
        snapshotId: snapshot.snapshotId,
        sportsbook: snapshot.sportsbook,
        teamId: snapshot.teamId,
        trueLineProbability: snapshot.trueLineProbability,
        updatedAt: new Date(snapshot.updatedAt),
      })
      .onConflictDoNothing({ target: historicalMarketSnapshots.snapshotId });

    return snapshot;
  }

  async settleMarket(
    input: HistoricalMarketSettlementInput,
  ): Promise<HistoricalMarketResult> {
    const snapshot = await this.findSnapshot(input.snapshotId);

    if (!snapshot) {
      throw new Error(`Historical market snapshot not found: ${input.snapshotId}`);
    }

    const result = normalizeSettlementInput(input, snapshot.market);

    await this.db
      .insert(historicalMarketResults)
      .values({
        actualStat: result.actualStat,
        finalResult: result.finalResult,
        market: result.market,
        outcome: result.outcome,
        resultId: result.resultId,
        settledAt: new Date(result.settledAt),
        snapshotId: result.snapshotId,
      })
      .onConflictDoNothing({ target: historicalMarketResults.resultId });

    return result;
  }

  async findSnapshot(
    snapshotId: string,
  ): Promise<HistoricalMarketSnapshot | undefined> {
    const rows = await this.db
      .select()
      .from(historicalMarketSnapshots)
      .where(eq(historicalMarketSnapshots.snapshotId, snapshotId));

    return rows[0] ? toSnapshot(rows[0]) : undefined;
  }

  async listSnapshots(): Promise<HistoricalMarketSnapshot[]> {
    const rows = await this.db.select().from(historicalMarketSnapshots);

    return rows.map(toSnapshot);
  }

  async listResults(): Promise<HistoricalMarketResult[]> {
    const rows = await this.db.select().from(historicalMarketResults);

    return rows.map(toResult);
  }
}

function normalizeSnapshotInput(
  input: HistoricalMarketSnapshotInput,
): HistoricalMarketSnapshot {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const updatedAt = input.updatedAt ?? capturedAt;

  return {
    capturedAt,
    closingOdds: input.closingOdds,
    currentOdds: input.currentOdds,
    edgePercent: input.edgePercent,
    expectedValuePercent: input.expectedValuePercent,
    fairOdds: input.fairOdds,
    gameId: input.gameId,
    line: input.line,
    market: input.market,
    openingOdds: input.openingOdds ?? input.currentOdds,
    playerId: input.playerId,
    predictionId: input.predictionId,
    provider: input.provider ?? "trueline",
    selection: input.selection,
    snapshotId: input.snapshotId ?? buildSnapshotId(input, capturedAt),
    sportsbook: input.sportsbook,
    teamId: input.teamId,
    trueLineProbability: input.trueLineProbability,
    updatedAt,
  };
}

function normalizeSettlementInput(
  input: HistoricalMarketSettlementInput,
  market: HistoricalMarketResult["market"],
): HistoricalMarketResult {
  const settledAt = input.settledAt ?? new Date().toISOString();

  return {
    actualStat: input.actualStat,
    finalResult: input.finalResult,
    market,
    outcome: input.outcome,
    resultId: input.resultId ?? `${input.snapshotId}:settlement`,
    settledAt,
    snapshotId: input.snapshotId,
  };
}

function buildSnapshotId(input: HistoricalMarketSnapshotInput, capturedAt: string) {
  return [
    input.market,
    input.gameId,
    input.playerId ?? input.teamId ?? input.selection ?? "market",
    input.sportsbook,
    capturedAt,
  ]
    .join(":")
    .replaceAll(/\s+/g, "-");
}

function toSnapshot(
  row: typeof historicalMarketSnapshots.$inferSelect,
): HistoricalMarketSnapshot {
  return {
    capturedAt: row.capturedAt.toISOString(),
    closingOdds: row.closingOdds ?? undefined,
    currentOdds: row.currentOdds,
    edgePercent: row.edgePercent ?? undefined,
    expectedValuePercent: row.expectedValuePercent ?? undefined,
    fairOdds: row.fairOdds ?? undefined,
    gameId: row.gameId,
    line: row.line ?? undefined,
    market: row.market as HistoricalMarketSnapshot["market"],
    openingOdds: row.openingOdds,
    playerId: row.playerId ?? undefined,
    predictionId: row.predictionId ?? undefined,
    provider: row.provider,
    selection: row.selection ?? undefined,
    snapshotId: row.snapshotId,
    sportsbook: row.sportsbook,
    teamId: row.teamId ?? undefined,
    trueLineProbability: row.trueLineProbability ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toResult(
  row: typeof historicalMarketResults.$inferSelect,
): HistoricalMarketResult {
  return {
    actualStat: row.actualStat ?? undefined,
    finalResult: row.finalResult ?? undefined,
    market: row.market as HistoricalMarketResult["market"],
    outcome: row.outcome as HistoricalMarketResult["outcome"],
    resultId: row.resultId,
    settledAt: row.settledAt.toISOString(),
    snapshotId: row.snapshotId,
  };
}
