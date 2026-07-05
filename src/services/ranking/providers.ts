import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  BetCandidate,
  RankingProviderMode,
  RankingProviderResponse,
} from "./types.ts";

export interface RankingCandidateProvider {
  readonly id: string;
  readonly mode: RankingProviderMode;
  getCandidates(): Promise<RankingProviderResponse>;
}

export class StaticRankingCandidateProvider implements RankingCandidateProvider {
  readonly id = "ranking-static";
  readonly mode: RankingProviderMode = "live";
  private readonly candidates: BetCandidate[];

  constructor(candidates: BetCandidate[] = []) {
    this.candidates = candidates;
  }

  async getCandidates(): Promise<RankingProviderResponse> {
    return {
      candidates: this.candidates,
      fetchedAt: new Date().toISOString(),
      mode: this.mode,
      provider: this.id,
    };
  }
}

export class MockRankingCandidateProvider implements RankingCandidateProvider {
  readonly id = "ranking-mock";
  readonly mode: RankingProviderMode = "mock";

  async getCandidates(): Promise<RankingProviderResponse> {
    return {
      candidates: buildMockCandidates(),
      fetchedAt: "2026-06-22T16:00:00.000Z",
      mode: this.mode,
      provider: this.id,
    };
  }
}

export class ReplayRankingCandidateProvider implements RankingCandidateProvider {
  readonly id = "ranking-replay";
  readonly mode: RankingProviderMode = "replay";
  private readonly replayFile: string;

  constructor(
    replayFile =
      process.env.RANKING_REPLAY_FILE ??
      path.join(process.cwd(), "replay/ranking/candidates.json"),
  ) {
    this.replayFile = replayFile;
  }

  async getCandidates(): Promise<RankingProviderResponse> {
    const raw = await readFile(this.replayFile, "utf8");
    const parsed = JSON.parse(raw) as { candidates: BetCandidate[]; fetchedAt?: string };

    return {
      candidates: parsed.candidates,
      fetchedAt: parsed.fetchedAt ?? new Date().toISOString(),
      mode: this.mode,
      provider: this.id,
    };
  }
}

export function getConfiguredRankingCandidateProvider(
  mode: RankingProviderMode = getRankingMode(),
) {
  if (mode === "replay") {
    return new ReplayRankingCandidateProvider();
  }

  if (mode === "mock") {
    return new MockRankingCandidateProvider();
  }

  return new StaticRankingCandidateProvider();
}

function getRankingMode(): RankingProviderMode {
  const mode = process.env.RANKING_MODE;

  if (mode === "live" || mode === "mock" || mode === "replay") {
    return mode;
  }

  return "live";
}

function buildMockCandidates(): BetCandidate[] {
  return [
    {
      betId: "mock-wheeler-k",
      confidence: 84,
      dataQuality: 88,
      edgePercent: 7.1,
      expectedValuePercent: 6.4,
      fairOdds: -132,
      marketType: "strikeouts",
      modelProbability: 0.57,
      opponent: { id: "team-nym", name: "Mets" },
      player: { id: "pitcher-wheeler", name: "Zack Wheeler" },
      recommendation: "Play",
      sportsbook: "DraftKings",
      sportsbookOdds: 104,
      supportingFactors: [
        factor("matchupStrength", "Matchup Strength", 86, "Opponent strikeout profile is elevated."),
        factor("recentForm", "Recent Form", 82, "Recent strikeout form is strong."),
        factor("lineupCertainty", "Lineup Certainty", 74, "Projected lineup has enough confidence."),
      ],
      team: { id: "team-phi", name: "Phillies" },
      timestamp: "2026-06-22T16:00:00.000Z",
      variance: 42,
    },
    {
      betId: "mock-judge-hr",
      confidence: 72,
      dataQuality: 76,
      edgePercent: 4.9,
      expectedValuePercent: 4.1,
      fairOdds: 245,
      marketType: "home-runs",
      modelProbability: 0.29,
      opponent: { id: "team-bos", name: "Red Sox" },
      player: { id: "player-judge", name: "Aaron Judge" },
      recommendation: "Lean",
      sportsbook: "DraftKings",
      sportsbookOdds: 285,
      supportingFactors: [
        factor("matchupStrength", "Matchup Strength", 75, "Fastball matchup is favorable."),
        factor("weatherImpact", "Weather Impact", 82, "Tailwind supports carry."),
        factor("variance", "Variance", 72, "Home run markets are naturally volatile."),
      ],
      team: { id: "team-nyy", name: "Yankees" },
      timestamp: "2026-06-22T16:00:00.000Z",
      variance: 78,
    },
  ];
}

function factor(
  key: string,
  label: string,
  score: number,
  summary: string,
) {
  return {
    key,
    label,
    score,
    summary,
  };
}
