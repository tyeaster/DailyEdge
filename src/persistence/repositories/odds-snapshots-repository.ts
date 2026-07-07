import { and, eq } from "drizzle-orm";

import type { NormalizedOddsRecord } from "@/src/providers/odds/OddsProvider";

import { getDb } from "../client.ts";
import { oddsSnapshots } from "../schema.ts";

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
}
