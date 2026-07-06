import {
  bestBetsService,
  type BestBetDisplayCandidate,
  type BestBetsViewModel,
} from "../best-bets/service.ts";

export type CorrelationType =
  | "duplicate-exposure"
  | "negative"
  | "positive"
  | "same-game"
  | "same-offense"
  | "same-pitcher"
  | "same-player"
  | "same-sportsbook"
  | "same-team";

export interface CorrelationLink {
  betId: string;
  market: string;
  score: number;
  title: string;
  type: CorrelationType;
}

export interface ExposureMetrics {
  conflictScore: number;
  correlationScore: number;
  diversificationScore: number;
  exposureScore: number;
  portfolioRisk: number;
}

export interface CorrelatedBet {
  bet: BestBetDisplayCandidate;
  links: CorrelationLink[];
  metrics: ExposureMetrics;
  warnings: string[];
}

export interface ExposureBucket {
  count: number;
  exposureScore: number;
  id: string;
  label: string;
  warnings: string[];
}

export interface PortfolioRecommendation {
  averageRisk: number;
  bets: CorrelatedBet[];
  description: string;
  expectedValue: number;
  label: string;
  portfolioRisk: number;
}

export interface CorrelationViewModel {
  conflictWarnings: string[];
  diversifiedTop10: PortfolioRecommendation;
  exposure: {
    games: ExposureBucket[];
    players: ExposureBucket[];
    teams: ExposureBucket[];
  };
  highlyCorrelatedBets: CorrelatedBet[];
  independentBets: CorrelatedBet[];
  portfolios: {
    aggressive: PortfolioRecommendation;
    highestEv: PortfolioRecommendation;
    safest: PortfolioRecommendation;
  };
  slateMeta: {
    analyzedBets: number;
    averageCorrelation: string;
    averageExposure: string;
    dataSource: string;
    lastUpdated: string;
  };
}

export class ExposureAnalyzer {
  analyze(bets: BestBetDisplayCandidate[]): CorrelatedBet[] {
    return bets.map((bet) => {
      const links = bets
        .filter((candidate) => candidate.id !== bet.id)
        .flatMap((candidate) => buildCorrelationLinks(bet, candidate))
        .sort((left, right) => right.score - left.score);
      const metrics = calculateExposureMetrics(bet, links);
      const warnings = buildBetWarnings(bet, links, metrics);

      return { bet, links, metrics, warnings };
    });
  }
}

export class CorrelationEngineService {
  private readonly analyzer: ExposureAnalyzer;
  private readonly loadBestBets: () => Promise<BestBetsViewModel>;

  constructor({
    analyzer = new ExposureAnalyzer(),
    loadBestBets = () => bestBetsService.getBestBets(),
  }: {
    analyzer?: ExposureAnalyzer;
    loadBestBets?: () => Promise<BestBetsViewModel>;
  } = {}) {
    this.analyzer = analyzer;
    this.loadBestBets = loadBestBets;
  }

  async getCorrelationAnalysis(): Promise<CorrelationViewModel> {
    const bestBets = await this.loadBestBets();

    return buildCorrelationViewModel(bestBets, this.analyzer);
  }
}

export const correlationEngineService = new CorrelationEngineService();

export async function getCorrelationAnalysis() {
  return correlationEngineService.getCorrelationAnalysis();
}

export function buildCorrelationViewModel(
  bestBets: BestBetsViewModel,
  analyzer = new ExposureAnalyzer(),
): CorrelationViewModel {
  const analyzed = analyzer.analyze(bestBets.top50);
  const highlyCorrelatedBets = analyzed
    .filter((item) => item.metrics.correlationScore >= 60)
    .sort((left, right) => right.metrics.correlationScore - left.metrics.correlationScore);
  const independentBets = analyzed
    .filter((item) => item.metrics.correlationScore <= 35 && item.metrics.conflictScore <= 30)
    .sort((left, right) => right.bet.ranked.trueLineScore - left.bet.ranked.trueLineScore);
  const conflictWarnings = buildPortfolioWarnings(analyzed);
  const diversifiedTop10 = buildDiversifiedPortfolio(analyzed);
  const highestEv = buildPortfolio(
    "Highest EV Top 10",
    "Highest expected value regardless of overlap.",
    [...analyzed].sort((left, right) => right.bet.ranked.candidate.expectedValuePercent - left.bet.ranked.candidate.expectedValuePercent).slice(0, 10),
  );
  const safest = buildPortfolio(
    "Safest Portfolio",
    "Lower-risk recommendations with lower correlation and fewer conflicts.",
    [...analyzed]
      .sort((left, right) =>
        portfolioSortScore(left, "safe") - portfolioSortScore(right, "safe"),
      )
      .slice(0, 10),
  );
  const aggressive = buildPortfolio(
    "Aggressive Portfolio",
    "Higher-upside recommendations accepting correlation and variance.",
    [...analyzed]
      .sort((left, right) =>
        portfolioSortScore(right, "aggressive") - portfolioSortScore(left, "aggressive"),
      )
      .slice(0, 10),
  );

  return {
    conflictWarnings,
    diversifiedTop10,
    exposure: {
      games: buildExposureBuckets(analyzed, "game"),
      players: buildExposureBuckets(analyzed, "player"),
      teams: buildExposureBuckets(analyzed, "team"),
    },
    highlyCorrelatedBets,
    independentBets,
    portfolios: {
      aggressive,
      highestEv,
      safest,
    },
    slateMeta: {
      analyzedBets: analyzed.length,
      averageCorrelation: `${Math.round(average(analyzed.map((item) => item.metrics.correlationScore)))}%`,
      averageExposure: `${Math.round(average(analyzed.map((item) => item.metrics.exposureScore)))}%`,
      dataSource: bestBets.slateMeta.dataSource,
      lastUpdated: bestBets.slateMeta.lastUpdated,
    },
  };
}

function buildCorrelationLinks(
  source: BestBetDisplayCandidate,
  target: BestBetDisplayCandidate,
): CorrelationLink[] {
  const signals: Array<{ score: number; type: CorrelationType }> = [];

  if (source.player?.id && source.player.id === target.player?.id) {
    signals.push({ score: 92, type: "same-player" });
  }

  if (source.team?.id && source.team.id === target.team?.id) {
    signals.push({ score: 74, type: "same-team" });
  }

  if (source.opponent?.id && source.opponent.id === target.opponent?.id) {
    signals.push({ score: 48, type: "same-game" });
  }

  if (source.team?.id && target.opponent?.id && source.team.id === target.opponent.id) {
    signals.push({ score: 52, type: "negative" });
  }

  if (source.sportsbook && source.sportsbook === target.sportsbook) {
    signals.push({ score: 28, type: "same-sportsbook" });
  }

  if (isOffenseMarket(source.market) && isOffenseMarket(target.market) && source.team?.id === target.team?.id) {
    signals.push({ score: 86, type: "same-offense" });
  }

  if (isGameTotal(source.market) && sharesTeam(source, target)) {
    signals.push({ score: isOverBet(source) ? 70 : 50, type: isOverBet(source) ? "positive" : "negative" });
  }

  if (isDuplicateExposure(source, target)) {
    signals.push({ score: 96, type: "duplicate-exposure" });
  }

  return signals.map((signal) => ({
    betId: target.id,
    market: target.marketLabel,
    score: signal.score,
    title: target.title,
    type: signal.type,
  }));
}

function calculateExposureMetrics(
  bet: BestBetDisplayCandidate,
  links: CorrelationLink[],
): ExposureMetrics {
  const correlationScore = clamp(average(links.slice(0, 5).map((link) => link.score)));
  const exposureScore = clamp(
    correlationScore * 0.55 +
      Math.min(100, links.length * 9) * 0.25 +
      marketExposureRisk(bet.market) * 0.2,
  );
  const conflictScore = clamp(average(links.filter((link) => link.type === "negative").map((link) => link.score)));
  const diversificationScore = clamp(100 - exposureScore * 0.72 - conflictScore * 0.28);
  const portfolioRisk = clamp(
    exposureScore * 0.42 +
      conflictScore * 0.26 +
      riskTierScore(bet.ranked.riskTier) * 0.22 +
      bet.ranked.candidate.variance * 0.1,
  );

  return {
    conflictScore,
    correlationScore,
    diversificationScore,
    exposureScore,
    portfolioRisk,
  };
}

function buildBetWarnings(
  bet: BestBetDisplayCandidate,
  links: CorrelationLink[],
  metrics: ExposureMetrics,
) {
  const warnings: string[] = [];
  const samePlayer = links.filter((link) => link.type === "same-player").length;
  const sameTeam = links.filter((link) => link.type === "same-team" || link.type === "same-offense").length;
  const conflicts = links.filter((link) => link.type === "negative").length;

  if (samePlayer >= 2 && bet.player) warnings.push(`${samePlayer + 1} recommendations rely on ${bet.player.name}.`);
  if (sameTeam >= 3 && bet.team) warnings.push(`${sameTeam + 1} recommendations rely on ${bet.team.name} offense.`);
  if (conflicts >= 2) warnings.push(`${conflicts} related bets create negative-correlation conflict risk.`);
  if (metrics.portfolioRisk >= 70) warnings.push("Portfolio risk is elevated if this bet is combined with related plays.");

  return warnings;
}

function buildPortfolioWarnings(analyzed: CorrelatedBet[]) {
  const warnings = new Set<string>();

  buildExposureBuckets(analyzed, "team").forEach((bucket) => {
    if (bucket.count >= 4) warnings.add(`${bucket.count} recommendations rely on ${bucket.label}.`);
  });

  buildExposureBuckets(analyzed, "player").forEach((bucket) => {
    if (bucket.count >= 3) warnings.add(`${bucket.count} bets depend on ${bucket.label}.`);
  });

  buildExposureBuckets(analyzed, "game").forEach((bucket) => {
    if (bucket.count >= 4) warnings.add(`${bucket.count} bets are tied to ${bucket.label}.`);
  });

  analyzed
    .filter((item) => item.metrics.conflictScore >= 65)
    .slice(0, 5)
    .forEach((item) => warnings.add(`${item.bet.title} has conflict risk with related bets.`));

  return [...warnings];
}

function buildDiversifiedPortfolio(analyzed: CorrelatedBet[]) {
  const selected: CorrelatedBet[] = [];
  const usedPlayers = new Set<string>();
  const usedTeams = new Set<string>();
  const usedGames = new Set<string>();

  [...analyzed]
    .sort((left, right) => right.bet.ranked.trueLineScore - left.bet.ranked.trueLineScore)
    .forEach((item) => {
      if (selected.length >= 10) return;
      const playerKey = item.bet.player?.id;
      const teamKey = item.bet.team?.id;
      const gameKey = gameKeyForBet(item.bet);
      const duplicatePlayer = playerKey && usedPlayers.has(playerKey);
      const duplicateTeam = teamKey && usedTeams.has(teamKey);
      const duplicateGame = gameKey && usedGames.has(gameKey);

      if (duplicatePlayer || (duplicateTeam && duplicateGame)) return;

      selected.push(item);
      if (playerKey) usedPlayers.add(playerKey);
      if (teamKey) usedTeams.add(teamKey);
      if (gameKey) usedGames.add(gameKey);
    });

  return buildPortfolio(
    "Diversified Top 10",
    "Highest-ranked bets while limiting repeated player, team, and game exposure.",
    selected,
  );
}

function buildPortfolio(
  label: string,
  description: string,
  bets: CorrelatedBet[],
): PortfolioRecommendation {
  return {
    averageRisk: Math.round(average(bets.map((item) => item.metrics.portfolioRisk))),
    bets,
    description,
    expectedValue: Number(average(bets.map((item) => item.bet.ranked.candidate.expectedValuePercent)).toFixed(1)),
    label,
    portfolioRisk: Math.round(
      average(bets.map((item) => item.metrics.portfolioRisk + item.metrics.correlationScore * 0.25)),
    ),
  };
}

function buildExposureBuckets(
  analyzed: CorrelatedBet[],
  type: "game" | "player" | "team",
) {
  const groups = new Map<string, CorrelatedBet[]>();

  analyzed.forEach((item) => {
    const key =
      type === "player"
        ? item.bet.player?.id
        : type === "team"
          ? item.bet.team?.id
          : gameKeyForBet(item.bet);
    const label =
      type === "player"
        ? item.bet.player?.name
        : type === "team"
          ? item.bet.team?.name
          : gameLabelForBet(item.bet);

    if (!key || !label) return;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return [...groups.entries()]
    .map(([id, bets]) => ({
      count: bets.length,
      exposureScore: Math.round(average(bets.map((item) => item.metrics.exposureScore))),
      id,
      label: type === "game"
        ? gameLabelForBet(bets[0].bet) ?? id
        : type === "team"
          ? bets[0].bet.team?.name ?? id
          : bets[0].bet.player?.name ?? id,
      warnings: bets.flatMap((item) => item.warnings).slice(0, 3),
    }))
    .filter((bucket) => bucket.count > 1)
    .sort((left, right) => right.exposureScore - left.exposureScore);
}

function portfolioSortScore(item: CorrelatedBet, mode: "aggressive" | "safe") {
  if (mode === "safe") {
    return item.metrics.portfolioRisk + item.metrics.correlationScore - item.bet.ranked.trueLineScore * 0.35;
  }

  return (
    item.bet.ranked.trueLineScore +
    item.bet.ranked.candidate.expectedValuePercent * 2 -
    item.metrics.conflictScore * 0.25
  );
}

function isOffenseMarket(market: string) {
  return ["game-total", "hits", "home-runs", "run-line", "team-total", "total-bases"].includes(market);
}

function isGameTotal(market: string) {
  return market === "game-total";
}

function isOverBet(bet: BestBetDisplayCandidate) {
  return bet.title.toLowerCase().includes("over") || bet.sportsbookLine.toLowerCase().includes("over");
}

function sharesTeam(left: BestBetDisplayCandidate, right: BestBetDisplayCandidate) {
  return Boolean(
    left.team?.id &&
      (left.team.id === right.team?.id || left.team.id === right.opponent?.id),
  );
}

function isDuplicateExposure(left: BestBetDisplayCandidate, right: BestBetDisplayCandidate) {
  return Boolean(
    left.player?.id &&
      left.player.id === right.player?.id &&
      left.team?.id &&
      left.team.id === right.team?.id &&
      isOffenseMarket(left.market) &&
      isOffenseMarket(right.market),
  );
}

function gameKeyForBet(bet: BestBetDisplayCandidate) {
  const team = bet.team?.id;
  const opponent = bet.opponent?.id;
  if (!team || !opponent) return undefined;

  return [team, opponent].sort().join("-");
}

function gameLabelForBet(bet: BestBetDisplayCandidate) {
  if (!bet.team?.name || !bet.opponent?.name) return undefined;

  return [bet.team.name, bet.opponent.name].sort().join(" / ");
}

function marketExposureRisk(market: string) {
  if (market === "home-runs") return 82;
  if (market === "run-line" || market === "game-total") return 64;
  if (market === "hits" || market === "total-bases") return 58;
  if (market === "strikeouts") return 46;
  return 40;
}

function riskTierScore(riskTier: BestBetDisplayCandidate["ranked"]["riskTier"]) {
  if (riskTier === "High") return 78;
  if (riskTier === "Medium") return 52;
  return 28;
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return 0;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
