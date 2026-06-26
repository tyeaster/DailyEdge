import type {
  PitcherGameLog,
  PitcherGameLogProvider,
  PitcherGameLogProviderResponse,
  PitcherGameLogRequest,
} from "./PitcherGameLogProvider.ts";

export class MockPitcherGameLogProvider implements PitcherGameLogProvider {
  readonly id = "pitcher-game-log-mock";

  async getPitcherGameLogs(
    request: PitcherGameLogRequest,
  ): Promise<PitcherGameLogProviderResponse> {
    return {
      fetchedAt: new Date().toISOString(),
      logs: request.fallbackLogs ?? buildMockLogs(),
      mode: "mock",
      pitcherId: request.pitcherId,
      provider: this.id,
      season: request.season,
    };
  }
}

export function buildMockLogs(): PitcherGameLog[] {
  const opponents = ["HOU", "ATL", "MIA", "STL", "CHC", "NYM", "WSH", "MIL", "ARI", "COL"];

  return opponents.map((opponent, index) => ({
    battersFaced: 24 + (index % 4),
    date: new Date(Date.UTC(2026, 5, 26 - index * 5, index % 2 === 0 ? 18 : 0)).toISOString(),
    decision: index % 3 === 0 ? "W" : index % 5 === 0 ? "L" : null,
    earnedRuns: [1, 2, 1, 4, 2, 3, 1, 2, 0, 4][index],
    flyBalls: 7 + (index % 3),
    gameScore: 58 + (index % 5) * 4,
    groundBalls: 8 + (index % 4),
    hits: [4, 6, 5, 8, 6, 7, 3, 5, 4, 8][index],
    homeAway: index % 2 === 0 ? "home" : "away",
    inningsPitched: [6.1, 5.2, 6, 5, 5.2, 6, 7, 6.1, 7.2, 4.2][index],
    opponent,
    pitchCount: [98, 91, 95, 86, 93, 101, 104, 97, 106, 84][index],
    result: index % 2 === 0 ? "W" : "L",
    strikeouts: [7, 6, 8, 4, 6, 7, 9, 8, 10, 5][index],
    walks: [1, 2, 1, 3, 2, 2, 0, 1, 1, 4][index],
  }));
}

