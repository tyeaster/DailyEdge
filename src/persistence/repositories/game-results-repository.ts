import { eq } from "drizzle-orm";

import type { NormalizedGameResult } from "../../providers/game-results/GameResultsProvider.ts";
import { getDb } from "../client.ts";
import { gameResults } from "../schema.ts";

export class GameResultsRepository {
  private readonly db: ReturnType<typeof getDb>;

  constructor(db: ReturnType<typeof getDb> = getDb()) {
    this.db = db;
  }

  async record(result: NormalizedGameResult): Promise<void> {
    await this.db
      .insert(gameResults)
      .values({
        awayScore: result.awayScore,
        awayTeamId: result.awayTeamId,
        completedAt: new Date(result.completedAt),
        gameId: result.gameId,
        homeScore: result.homeScore,
        homeTeamId: result.homeTeamId,
        winningTeamId: result.winningTeamId,
      })
      .onConflictDoNothing({ target: gameResults.gameId });
  }

  async findByGameId(gameId: string): Promise<NormalizedGameResult | undefined> {
    const rows = await this.db
      .select()
      .from(gameResults)
      .where(eq(gameResults.gameId, gameId));

    return rows[0] ? toNormalizedGameResult(rows[0]) : undefined;
  }
}

function toNormalizedGameResult(
  row: typeof gameResults.$inferSelect,
): NormalizedGameResult {
  return {
    awayScore: row.awayScore,
    awayTeamId: row.awayTeamId,
    completedAt: row.completedAt.toISOString(),
    gameId: row.gameId,
    homeScore: row.homeScore,
    homeTeamId: row.homeTeamId,
    winningTeamId: row.winningTeamId,
  };
}
