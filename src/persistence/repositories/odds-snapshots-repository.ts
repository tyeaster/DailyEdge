import { and, eq, isNotNull } from "drizzle-orm";

import type { NormalizedOddsRecord } from "@/src/providers/odds/OddsProvider";

import { getDb } from "../client.ts";
import { oddsSnapshots } from "../schema.ts";

export type GameOddsSnapshotInput = {
  americanOdds: number;
  capturedAt?: Date;
  gameId: string;
  impliedProbability: number;
  market: string;
  provider: string;
  sportsbook: string;
};

export class OddsSnapshotsRepository {
  private readonly db: ReturnType<typeof getDb>;

  constructor(db: ReturnType<typeof getDb> = getDb()) {
    this.db = db;
  }

  /** Records one durable snapshot per normalized odds record captured. */
  async recordSnapshot(
    provider: string,
    records: NormalizedOddsRecord[],
    capturedAt: Date = new Date(),
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await this.db.insert(oddsSnapshots).values(
      records.map((record) => ({
        americanOdds: record.americanOdds,
        awayTeam: record.awayTeam,
        capturedAt,
        eventId: record.eventId,
        homeTeam: record.homeTeam,
        id: `${provider}-${record.id}-${capturedAt.getTime()}`,
        impliedProbability: record.impliedProbability,
        line: record.line,
        market: record.market,
        provider,
        recordId: record.id,
        selection: record.selection,
        side: record.side,
        sportsbook: record.sportsbook,
        teamName: record.teamName,
        updatedAt: new Date(record.updatedAt),
      })),
    );
  }

  /** Full snapshot history for one underlying odds record, oldest first. */
  async findHistory(
    provider: string,
    recordId: string,
  ): Promise<(typeof oddsSnapshots.$inferSelect)[]> {
    return this.db
      .select()
      .from(oddsSnapshots)
      .where(
        and(
          eq(oddsSnapshots.provider, provider),
          eq(oddsSnapshots.recordId, recordId),
        ),
      )
      .orderBy(oddsSnapshots.capturedAt);
  }

  /**
   * Records one game-scoped odds snapshot with gameId populated - unlike
   * recordSnapshot() above, this is called from daily-slate/service.ts
   * where the odds<->game match has already been resolved, so gameId is
   * known at record time. Feeds DurableOddsIntelligenceProvider.
   */
  async recordGameSnapshot(input: GameOddsSnapshotInput): Promise<void> {
    const capturedAt = input.capturedAt ?? new Date();

    await this.db.insert(oddsSnapshots).values({
      americanOdds: input.americanOdds,
      capturedAt,
      gameId: input.gameId,
      id: `game-${input.gameId}-${input.market}-${capturedAt.getTime()}`,
      impliedProbability: input.impliedProbability,
      market: input.market,
      provider: input.provider,
      recordId: `game-${input.gameId}-${input.market}`,
      selection: input.gameId,
      sportsbook: input.sportsbook,
      updatedAt: capturedAt,
    });
  }

  /** Full game-scoped snapshot history for one game+market, oldest first. */
  async findHistoryByGame(
    gameId: string,
    market: string,
  ): Promise<(typeof oddsSnapshots.$inferSelect)[]> {
    return this.db
      .select()
      .from(oddsSnapshots)
      .where(
        and(
          eq(oddsSnapshots.gameId, gameId),
          eq(oddsSnapshots.market, market),
        ),
      )
      .orderBy(oddsSnapshots.capturedAt);
  }

  /** All game-scoped snapshots for a market, oldest first per game. */
  async listGameSnapshots(
    market: string,
  ): Promise<(typeof oddsSnapshots.$inferSelect)[]> {
    return this.db
      .select()
      .from(oddsSnapshots)
      .where(and(isNotNull(oddsSnapshots.gameId), eq(oddsSnapshots.market, market)))
      .orderBy(oddsSnapshots.capturedAt);
  }
}
