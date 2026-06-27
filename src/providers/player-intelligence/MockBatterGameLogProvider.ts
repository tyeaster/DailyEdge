import type {
  BatterGameLog,
  BatterGameLogProvider,
  BatterGameLogProviderResponse,
  BatterGameLogRequest,
} from "./BatterGameLogProvider.ts";

export class MockBatterGameLogProvider implements BatterGameLogProvider {
  readonly id = "batter-game-log-mock";

  async getBatterGameLogs(
    request: BatterGameLogRequest,
  ): Promise<BatterGameLogProviderResponse> {
    return {
      batterId: request.batterId,
      fetchedAt: new Date().toISOString(),
      logs: request.fallbackLogs ?? buildMockBatterLogs(),
      mode: "mock",
      provider: this.id,
      season: request.season,
    };
  }
}

export function buildMockBatterLogs(): BatterGameLog[] {
  const opponents = ["HOU", "ATL", "MIA", "STL", "CHC", "NYM", "WSH", "MIL", "ARI", "COL"];
  const hits = [2, 1, 3, 0, 2, 1, 2, 3, 1, 0];
  const doubles = [1, 0, 1, 0, 0, 0, 1, 1, 0, 0];
  const triples = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0];
  const homeRuns = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0];

  return opponents.map((opponent, index) => {
    const atBats = [4, 4, 5, 3, 4, 4, 5, 4, 3, 4][index];
    const walks = [1, 0, 0, 1, 1, 0, 0, 1, 0, 1][index];
    const hbp = index === 6 ? 1 : 0;
    const totalBases =
      hits[index] +
      doubles[index] +
      triples[index] * 2 +
      homeRuns[index] * 3;

    return {
      atBats,
      averageExitVelocityMph: [91, 96, 93, 84, 98, 88, 90, 101, 92, 82][index],
      averageLaunchAngleDegrees: [13, 24, 17, 8, 27, 11, 15, 26, 19, 6][index],
      barrels: [1, 1, 1, 0, 2, 0, 1, 2, 0, 0][index],
      date: new Date(Date.UTC(2026, 5, 26 - index * 2, index % 2 === 0 ? 18 : 0)).toISOString(),
      doubles: doubles[index],
      hardHits: [2, 2, 3, 0, 3, 1, 2, 3, 1, 0][index],
      hbp,
      hits: hits[index],
      homeAway: index % 2 === 0 ? "home" : "away",
      homeRuns: homeRuns[index],
      opponent,
      opposingPitcherHand: index % 3 === 0 ? "L" : "R",
      plateAppearances: atBats + walks + hbp,
      rbi: [1, 2, 2, 0, 3, 0, 1, 4, 1, 0][index],
      runs: [1, 1, 2, 0, 2, 0, 1, 2, 1, 0][index],
      singles: Math.max(0, hits[index] - doubles[index] - triples[index] - homeRuns[index]),
      stolenBases: index === 2 || index === 8 ? 1 : 0,
      strikeouts: [1, 1, 0, 2, 1, 2, 1, 0, 1, 2][index],
      totalBases,
      triples: triples[index],
      walks,
    };
  });
}
