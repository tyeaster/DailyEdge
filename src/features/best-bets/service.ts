import type {
  CalibrationDashboardViewModel,
  ModelScorecard,
} from "../../services/calibration/index.ts";
import { calibrationService } from "../../services/calibration/index.ts";
import type { DailySlateViewModel } from "../../services/daily-slate/types.ts";
import type { OddsIntelligenceDashboardViewModel } from "../../services/odds-intelligence/types.ts";
import { oddsIntelligenceService } from "../../services/odds-intelligence/index.ts";
import { historicalMarketStorageService } from "../../services/historical-market-storage/index.ts";
import {
  RankingEngineService,
  type BetCandidate,
  type BetMarketType,
  type RankedBetCandidate,
  type RiskTier,
} from "../../services/ranking/index.ts";
import {
  gameTotalsIntelligenceService,
  type GameTotalCandidate,
  type GameTotalsViewModel,
} from "../game-totals-intelligence/service.ts";
import {
  homeRunIntelligenceService,
  type HomeRunCandidate,
  type HomeRunIntelligenceViewModel,
} from "../home-run-intelligence/service.ts";
import {
  moneylineIntelligenceService,
  type MoneylineGameEvaluation,
  type MoneylineIntelligenceViewModel,
} from "../moneyline-intelligence/service.ts";
import {
  runLineIntelligenceService,
  type RunLineCandidate,
  type RunLineViewModel,
} from "../run-line-intelligence/service.ts";
import {
  teamTotalsIntelligenceService,
  type TeamTotalCandidate,
  type TeamTotalsViewModel,
} from "../team-totals-intelligence/service.ts";
import {
  totalBasesIntelligenceService,
  type TotalBasesCandidate,
  type TotalBasesViewModel,
} from "../total-bases-intelligence/service.ts";

export interface BestBetsFilters {
  market?: BetMarketType;
  minimumConfidence?: number;
  minimumEdge?: number;
  minimumExpectedValue?: number;
  playerId?: string;
  riskTier?: RiskTier;
  sportsbook?: string;
  teamId?: string;
}

export interface BestBetDisplayCandidate {
  calibration: {
    clvDisplay: string;
    confidenceCalibrationDisplay: string;
    historicalSimilarBets: string;
    roiDisplay: string;
    winRateDisplay: string;
  };
  correlation?: {
    badge: string;
    exposureBadge: string;
    portfolioRisk: string;
    relatedBets: string[];
  };
  display: {
    confidence: string;
    edge: string;
    expectedValue: string;
    fairLine: string;
    gameGrade: string;
    odds: string;
    probability: string;
    sportsbookLine: string;
  };
  fairLine: string;
  gameGrade: number;
  href: string;
  id: string;
  market: BetMarketType;
  marketLabel: string;
  opponent?: {
    id: string;
    name: string;
  };
  player?: {
    id: string;
    name: string;
  };
  ranked: RankedBetCandidate;
  reasons: string[];
  sportsbook?: string;
  sportsbookLine: string;
  team?: {
    id: string;
    name: string;
  };
  title: string;
}

export interface BestBetsViewModel {
  filters: BestBetsFilters;
  marketSummary: Array<{
    count: number;
    label: string;
    market: BetMarketType;
    topScore: number;
  }>;
  slateMeta: {
    candidateCount: number;
    dataSource: string;
    lastUpdated: string;
    markets: number;
  };
  top10: BestBetDisplayCandidate[];
  top25: BestBetDisplayCandidate[];
  top50: BestBetDisplayCandidate[];
}

interface BestBetsDependencies {
  loadCalibration?: () => Promise<CalibrationDashboardViewModel>;
  loadGameTotals?: (slate: DailySlateViewModel) => Promise<GameTotalsViewModel>;
  loadHomeRuns?: (slate: DailySlateViewModel) => Promise<HomeRunIntelligenceViewModel>;
  loadMoneyline?: (slate: DailySlateViewModel) => Promise<MoneylineIntelligenceViewModel>;
  loadOddsIntelligence?: () => Promise<OddsIntelligenceDashboardViewModel>;
  loadRunLine?: (slate: DailySlateViewModel) => Promise<RunLineViewModel>;
  loadSlate?: () => Promise<DailySlateViewModel>;
  loadTeamTotals?: (slate: DailySlateViewModel) => Promise<TeamTotalsViewModel>;
  loadTotalBases?: (slate: DailySlateViewModel) => Promise<TotalBasesViewModel>;
  rankingEngine?: RankingEngineService;
}

interface NormalizedCandidate {
  candidate: BetCandidate;
  fairLine: string;
  gameGrade: number;
  gameId: string;
  href: string;
  line?: number;
  reasons: string[];
  selection?: string;
  sportsbookLine: string;
  title: string;
}

export class BestBetsService {
  private readonly loadCalibration: () => Promise<CalibrationDashboardViewModel>;
  private readonly loadGameTotals: (slate: DailySlateViewModel) => Promise<GameTotalsViewModel>;
  private readonly loadHomeRuns: (slate: DailySlateViewModel) => Promise<HomeRunIntelligenceViewModel>;
  private readonly loadMoneyline: (slate: DailySlateViewModel) => Promise<MoneylineIntelligenceViewModel>;
  private readonly loadOddsIntelligence: () => Promise<OddsIntelligenceDashboardViewModel>;
  private readonly loadRunLine: (slate: DailySlateViewModel) => Promise<RunLineViewModel>;
  private readonly loadSlate: () => Promise<DailySlateViewModel>;
  private readonly loadTeamTotals: (slate: DailySlateViewModel) => Promise<TeamTotalsViewModel>;
  private readonly loadTotalBases: (slate: DailySlateViewModel) => Promise<TotalBasesViewModel>;
  private readonly rankingEngine: RankingEngineService;

  constructor(dependencies: BestBetsDependencies = {}) {
    this.loadCalibration = dependencies.loadCalibration ?? (() => calibrationService.getDashboard());
    this.loadGameTotals =
      dependencies.loadGameTotals ??
      ((slate) => gameTotalsIntelligenceService.getGameTotalsIntelligenceFromSlate(slate));
    this.loadHomeRuns =
      dependencies.loadHomeRuns ??
      ((slate) => homeRunIntelligenceService.getHomeRunIntelligenceFromSlate(slate));
    this.loadMoneyline =
      dependencies.loadMoneyline ??
      ((slate) => moneylineIntelligenceService.getMoneylineIntelligenceFromSlate(slate));
    this.loadOddsIntelligence =
      dependencies.loadOddsIntelligence ??
      (() => oddsIntelligenceService.getDashboard());
    this.loadRunLine =
      dependencies.loadRunLine ??
      ((slate) => runLineIntelligenceService.getRunLineIntelligenceFromSlate(slate));
    this.loadSlate =
      dependencies.loadSlate ??
      (async () => {
        const { getDailySlate } = await import("../../services/daily-slate/service.ts");

        return getDailySlate();
      });
    this.loadTeamTotals =
      dependencies.loadTeamTotals ??
      ((slate) => teamTotalsIntelligenceService.getTeamTotalsIntelligenceFromSlate(slate));
    this.loadTotalBases =
      dependencies.loadTotalBases ??
      ((slate) => totalBasesIntelligenceService.getTotalBasesIntelligenceFromSlate(slate));
    this.rankingEngine = dependencies.rankingEngine ?? new RankingEngineService();
  }

  async getBestBets(filters: BestBetsFilters = {}): Promise<BestBetsViewModel> {
    const slate = await this.loadSlate();
    const [
      homeRuns,
      moneyline,
      teamTotals,
      gameTotals,
      runLine,
      totalBases,
      calibration,
      oddsIntelligence,
    ] = await Promise.all([
      this.loadHomeRuns(slate),
      this.loadMoneyline(slate),
      this.loadTeamTotals(slate),
      this.loadGameTotals(slate),
      this.loadRunLine(slate),
      this.loadTotalBases(slate),
      this.loadCalibration().catch(() => undefined),
      this.loadOddsIntelligence().catch(() => undefined),
    ]);
    const normalized = normalizeAllCandidates({
      gameTotals,
      homeRuns,
      moneyline,
      runLine,
      slate,
      teamTotals,
      totalBases,
    });

    await recordHistoricalBestBetSnapshots(normalized, slate);

    return buildBestBetsViewModel({
      calibration,
      filters,
      gameTotals,
      homeRuns,
      moneyline,
      normalized,
      oddsIntelligence,
      rankingEngine: this.rankingEngine,
      runLine,
      slate,
      teamTotals,
      totalBases,
    });
  }
}

export const bestBetsService = new BestBetsService();

export async function getBestBets(filters: BestBetsFilters = {}) {
  return bestBetsService.getBestBets(filters);
}

export function buildBestBetsViewModel({
  calibration,
  filters = {},
  gameTotals,
  homeRuns,
  moneyline,
  normalized: prenormalized,
  oddsIntelligence,
  rankingEngine = new RankingEngineService(),
  runLine,
  slate,
  teamTotals,
  totalBases,
}: {
  calibration?: CalibrationDashboardViewModel;
  filters?: BestBetsFilters;
  gameTotals: GameTotalsViewModel;
  homeRuns: HomeRunIntelligenceViewModel;
  moneyline: MoneylineIntelligenceViewModel;
  /** Pass through an already-normalized candidate list to avoid
   * normalizing the same inputs twice in one request. */
  normalized?: NormalizedCandidate[];
  oddsIntelligence?: OddsIntelligenceDashboardViewModel;
  rankingEngine?: RankingEngineService;
  runLine: RunLineViewModel;
  slate: DailySlateViewModel;
  teamTotals: TeamTotalsViewModel;
  totalBases: TotalBasesViewModel;
}): BestBetsViewModel {
  const normalized =
    prenormalized ??
    normalizeAllCandidates({
      gameTotals,
      homeRuns,
      moneyline,
      runLine,
      slate,
      teamTotals,
      totalBases,
    });
  const filtered = applyBestBetFilters(normalized, filters);
  const ranked = rankingEngine.rankCandidates(filtered.map((item) => item.candidate));
  const normalizedById = new Map(normalized.map((item) => [item.candidate.betId, item]));
  const displayCandidates = ranked
    .map((item) =>
      toDisplayCandidate({
        calibration,
        normalized: normalizedById.get(item.candidate.betId),
        oddsIntelligence,
        ranked: item,
      }),
    )
    .filter((item): item is BestBetDisplayCandidate => item !== undefined)
    .filter((item) => (filters.riskTier ? item.ranked.riskTier === filters.riskTier : true));
  const correlatedDisplayCandidates = attachCorrelationBadges(displayCandidates);

  return {
    filters,
    marketSummary: buildMarketSummary(correlatedDisplayCandidates),
    slateMeta: {
      candidateCount: correlatedDisplayCandidates.length,
      dataSource: slate.dataSource,
      lastUpdated: slate.slateMeta.lastUpdated,
      markets: new Set(correlatedDisplayCandidates.map((item) => item.market)).size,
    },
    top10: correlatedDisplayCandidates.slice(0, 10),
    top25: correlatedDisplayCandidates.slice(0, 25),
    top50: correlatedDisplayCandidates.slice(0, 50),
  };
}

function normalizeAllCandidates({
  gameTotals,
  homeRuns,
  moneyline,
  runLine,
  slate,
  teamTotals,
  totalBases,
}: {
  gameTotals: GameTotalsViewModel;
  homeRuns: HomeRunIntelligenceViewModel;
  moneyline: MoneylineIntelligenceViewModel;
  runLine: RunLineViewModel;
  slate: DailySlateViewModel;
  teamTotals: TeamTotalsViewModel;
  totalBases: TotalBasesViewModel;
}) {
  return [
    ...normalizeProps(slate, "Strikeouts"),
    ...normalizeProps(slate, "Hits"),
    ...totalBases.candidates.map(normalizeTotalBases),
    ...homeRuns.candidates.map(normalizeHomeRun),
    ...moneyline.games.map(normalizeMoneyline),
    ...teamTotals.candidates.map(normalizeTeamTotal),
    ...gameTotals.candidates.map(normalizeGameTotal),
    ...runLine.candidates.map(normalizeRunLine),
  ];
}

function normalizeTotalBases(candidate: TotalBasesCandidate): NormalizedCandidate {
  const betCandidate: BetCandidate = {
    betId: `total-bases-${candidate.batter.id}-${candidate.game.game.id}`,
    confidence: candidate.confidence,
    dataQuality: Math.round(average([
      candidate.gameGrade,
      candidate.matchup.overall,
      candidate.playerIntelligence.recentForm,
      candidate.team.lineup?.lineupConfidence,
      candidate.game.game.prediction?.dataQuality.score,
    ])),
    edgePercent: candidate.edgePercent,
    expectedValuePercent: candidate.expectedValuePercent,
    fairOdds: candidate.sportsbookOdds,
    marketType: "total-bases",
    modelProbability: clampProbability(0.5 + (candidate.projectedTotalBases - candidate.sportsbookLine) * 0.12),
    opponent: {
      id: candidate.opponent.id,
      name: candidate.opponent.name,
    },
    player: {
      id: candidate.batter.id,
      name: candidate.batter.fullName,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.prop?.prop.odds.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: candidate.factors.map((item) =>
      factor(factorKey(item.label), item.label, item.score, item.explanation),
    ),
    team: {
      id: candidate.team.id,
      name: candidate.team.name,
    },
    timestamp: candidate.prop?.prop.odds.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 64,
  };

  return {
    candidate: betCandidate,
    fairLine: candidate.fairLineDisplay,
    gameGrade: candidate.gameGrade,
    gameId: candidate.game.game.id,
    href: "/betting/total-bases",
    line: candidate.sportsbookLine,
    reasons: candidate.reasons,
    selection: "Over",
    sportsbookLine: candidate.sportsbookLineDisplay,
    title: `${candidate.batter.fullName} Total Bases`,
  };
}

function normalizeProps(
  slate: DailySlateViewModel,
  category: "Strikeouts" | "Hits" | "Total Bases",
): NormalizedCandidate[] {
  const propCategory = slate.propCategories.find((item) => item.label === category);
  const marketType = getPropMarket(category);

  return (propCategory?.props ?? []).map(({ player, prop, team }) => {
    const game = slate.games.find((item) => item.game.id === prop.gameId);
    const edgePercent = prop.edge.percentage;
    const confidence = prop.confidence.value;
    const modelProbability = clampProbability(0.5 + edgePercent / 200);
    const candidate: BetCandidate = {
      betId: prop.id,
      confidence,
      dataQuality: game?.game.prediction?.dataQuality.score ?? confidence,
      edgePercent,
      expectedValuePercent: edgePercent * 0.78,
      fairOdds: prop.odds.price,
      marketType,
      modelProbability,
      opponent: game
        ? {
            id: game.awayTeam.id === team.id ? game.homeTeam.id : game.awayTeam.id,
            name: game.awayTeam.id === team.id ? game.homeTeam.name : game.awayTeam.name,
          }
        : undefined,
      player: {
        id: player.id,
        name: player.fullName,
      },
      recommendation: prop.edge.rating,
      sportsbook: prop.odds.sportsbook,
      sportsbookOdds: prop.odds.price,
      supportingFactors: [
        factor("matchupStrength", "Prop Edge", scoreFromEdge(edgePercent), prop.reasoning),
        factor("recentForm", "Model Confidence", confidence, "Existing prop confidence from Daily Slate."),
        factor("lineupCertainty", "Data Quality", game?.game.prediction?.dataQuality.score ?? confidence, "Slate data quality for the underlying game."),
      ],
      team: {
        id: team.id,
        name: team.name,
      },
      timestamp: prop.odds.updatedAt ?? slate.slateMeta.lastUpdated,
      variance: marketType === "strikeouts" ? 45 : marketType === "hits" ? 58 : 64,
    };

    return {
      candidate,
      fairLine: prop.odds.displayLine,
      gameGrade: confidence,
      gameId: prop.gameId,
      href: getMarketHref(marketType),
      line: prop.odds.line,
      reasons: [prop.reasoning, ...candidate.supportingFactors.map((item) => item.summary)].slice(0, 4),
      selection: prop.odds.displayLine,
      sportsbookLine: prop.odds.displayLine,
      title: `${player.fullName} ${prop.category}`,
    };
  });
}

function normalizeHomeRun(candidate: HomeRunCandidate): NormalizedCandidate {
  const betCandidate: BetCandidate = {
    betId: `hr-${candidate.batter.id}`,
    confidence: candidate.confidence,
    dataQuality: candidate.matchup.overall,
    edgePercent: candidate.edgePercent ?? 0,
    expectedValuePercent: candidate.expectedValuePercent ?? 0,
    fairOdds: candidate.fairOdds,
    marketType: "home-runs",
    modelProbability: candidate.hrProbability,
    opponent: {
      id: candidate.opponent.id,
      name: candidate.opponent.name,
    },
    player: {
      id: candidate.batter.id,
      name: candidate.batter.fullName,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.sportsbook?.sportsbook,
    sportsbookOdds: candidate.sportsbook?.odds,
    supportingFactors: [
      factor("matchupStrength", "HR Matchup", candidate.overallHrScore, candidate.summary),
      factor("weatherImpact", "Weather/Park", candidate.factors?.find((item) => item.label.includes("Environment"))?.score ?? 50, "Weather and park home run context."),
      factor("recentForm", "Power Form", candidate.factors?.find((item) => item.label.includes("Batter"))?.score ?? 50, "Batter power profile and recent contact quality."),
    ],
    team: {
      id: candidate.team.id,
      name: candidate.team.name,
    },
    timestamp: candidate.prop?.prop.odds.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 82,
  };

  return {
    candidate: betCandidate,
    fairLine: candidate.fairOddsDisplay,
    gameGrade: candidate.overallHrScore,
    gameId: candidate.game.game.id,
    href: "/hitting/home-runs",
    line: candidate.prop?.prop.odds.line,
    reasons: candidate.explanations,
    selection: "Yes",
    sportsbookLine: candidate.sportsbook?.oddsDisplay ?? "No market odds",
    title: `${candidate.batter.fullName} Home Run`,
  };
}

function normalizeMoneyline(evaluation: MoneylineGameEvaluation): NormalizedCandidate {
  const candidate: BetCandidate = {
    betId: `moneyline-${evaluation.game.game.id}-${evaluation.projectedWinner.id}`,
    confidence: evaluation.confidence,
    dataQuality: evaluation.game.game.prediction?.dataQuality.score ?? evaluation.confidence,
    edgePercent: evaluation.edgePercent,
    expectedValuePercent: evaluation.expectedValuePercent,
    fairOdds: evaluation.fairOdds,
    marketType: "moneyline",
    modelProbability: evaluation.winProbability,
    opponent: {
      id:
        evaluation.projectedWinner.id === evaluation.homeTeam.id
          ? evaluation.awayTeam.id
          : evaluation.homeTeam.id,
      name:
        evaluation.projectedWinner.id === evaluation.homeTeam.id
          ? evaluation.awayTeam.name
          : evaluation.homeTeam.name,
    },
    recommendation: evaluation.recommendation,
    sportsbook: evaluation.game.game.odds.moneyline.sportsbook,
    sportsbookOdds: evaluation.sportsbookOdds,
    supportingFactors: evaluation.factors.map((item) =>
      factor(
        factorKey(item.label),
        item.label,
        Math.max(item.awayScore, item.homeScore),
        item.explanation,
      ),
    ),
    team: {
      id: evaluation.projectedWinner.id,
      name: evaluation.projectedWinner.name,
    },
    timestamp: evaluation.game.game.odds.moneyline.updatedAt ?? evaluation.game.game.scheduledAt,
    variance: 36,
  };

  return {
    candidate,
    fairLine: evaluation.fairOddsDisplay,
    gameGrade: evaluation.projectedWinner.id === evaluation.homeTeam.id
      ? evaluation.home.overallTeamGrade
      : evaluation.away.overallTeamGrade,
    gameId: evaluation.game.game.id,
    href: "/betting/moneyline",
    reasons: evaluation.reasons,
    selection: evaluation.projectedWinner.name,
    sportsbookLine: evaluation.sportsbookOddsDisplay,
    title: `${evaluation.projectedWinner.name} Moneyline`,
  };
}

function normalizeTeamTotal(candidate: TeamTotalCandidate): NormalizedCandidate {
  const betCandidate: BetCandidate = {
    betId: `team-total-${candidate.game.game.id}-${candidate.team.id}`,
    confidence: candidate.confidence,
    dataQuality: Math.round(average([
      candidate.gameGrade,
      candidate.team.lineup?.lineupConfidence,
      candidate.game.game.prediction?.dataQuality.score,
    ])),
    edgePercent: candidate.edgePercent,
    expectedValuePercent: candidate.expectedValuePercent,
    fairOdds: candidate.sportsbookOdds,
    marketType: "team-total",
    modelProbability: clampProbability(0.5 + (candidate.projectedRuns - candidate.sportsbookTotal) * 0.12),
    opponent: {
      id: candidate.opponent.id,
      name: candidate.opponent.name,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.game.game.odds.total.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: candidate.factors.map((item) =>
      factor(factorKey(item.label), item.label, item.score, item.explanation),
    ),
    team: {
      id: candidate.team.id,
      name: candidate.team.name,
    },
    timestamp: candidate.game.game.odds.total.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 54,
  };

  return {
    candidate: betCandidate,
    fairLine: candidate.fairTotalDisplay,
    gameGrade: candidate.gameGrade,
    gameId: candidate.game.game.id,
    href: "/betting/team-totals",
    line: candidate.sportsbookTotal,
    reasons: candidate.reasons,
    selection: `${candidate.team.name} Over`,
    sportsbookLine: candidate.sportsbookTotalDisplay,
    title: `${candidate.team.name} Team Total`,
  };
}

function normalizeGameTotal(candidate: GameTotalCandidate): NormalizedCandidate {
  const betCandidate: BetCandidate = {
    betId: `game-total-${candidate.game.game.id}-${candidate.side.toLowerCase()}`,
    confidence: candidate.confidence,
    dataQuality: Math.round(average([
      candidate.gameGrade,
      candidate.game.game.prediction?.dataQuality.score,
      candidate.game.awayTeam?.lineup?.lineupConfidence,
      candidate.game.homeTeam?.lineup?.lineupConfidence,
    ])),
    edgePercent: candidate.edgePercent,
    expectedValuePercent: candidate.expectedValuePercent,
    fairOdds: candidate.sportsbookOdds,
    marketType: "game-total",
    modelProbability: clampProbability(0.5 + Math.abs(candidate.projectedRuns - candidate.sportsbookTotal) * 0.12),
    opponent: {
      id: candidate.game.homeTeam.id,
      name: candidate.game.homeTeam.name,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.game.game.odds.total.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: candidate.factors.map((item) =>
      factor(factorKey(item.label), item.label, item.score, item.explanation),
    ),
    team: {
      id: candidate.game.awayTeam.id,
      name: `${candidate.game.awayTeam.abbreviation}/${candidate.game.homeTeam.abbreviation}`,
    },
    timestamp: candidate.game.game.odds.total.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 58,
  };

  return {
    candidate: betCandidate,
    fairLine: candidate.fairTotalDisplay,
    gameGrade: candidate.gameGrade,
    gameId: candidate.game.game.id,
    href: "/betting/game-totals",
    line: candidate.sportsbookTotal,
    reasons: candidate.reasons,
    selection: candidate.side,
    sportsbookLine: `${candidate.side} ${candidate.sportsbookTotalDisplay}`,
    title: `${candidate.game.awayTeam.abbreviation} at ${candidate.game.homeTeam.abbreviation} ${candidate.side}`,
  };
}

function normalizeRunLine(candidate: RunLineCandidate): NormalizedCandidate {
  const betCandidate: BetCandidate = {
    betId: `run-line-${candidate.game.game.id}-${candidate.side}`,
    confidence: candidate.confidence,
    dataQuality: Math.round(average([
      candidate.gameGrade,
      candidate.game.game.prediction?.dataQuality.score,
      candidate.game.awayTeam?.lineup?.lineupConfidence,
      candidate.game.homeTeam?.lineup?.lineupConfidence,
    ])),
    edgePercent: candidate.edgePercent,
    expectedValuePercent: candidate.expectedValuePercent,
    fairOdds: candidate.sportsbookOdds,
    marketType: "run-line",
    modelProbability: candidate.coverProbability,
    opponent: {
      id: candidate.opponent.id,
      name: candidate.opponent.name,
    },
    recommendation: candidate.recommendation,
    sportsbook: candidate.game.game.odds.spread.sportsbook,
    sportsbookOdds: candidate.sportsbookOdds,
    supportingFactors: candidate.factors.map((item) =>
      factor(factorKey(item.label), item.label, item.score, item.explanation),
    ),
    team: {
      id: candidate.selectedTeam.id,
      name: candidate.selectedTeam.name,
    },
    timestamp: candidate.game.game.odds.spread.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 62,
  };

  return {
    candidate: betCandidate,
    fairLine: candidate.fairSpreadDisplay,
    gameGrade: candidate.gameGrade,
    gameId: candidate.game.game.id,
    href: "/betting/run-line",
    line: candidate.sportsbookRunLine,
    reasons: candidate.reasons,
    selection: candidate.selectedTeam.name,
    sportsbookLine: candidate.sportsbookRunLineDisplay,
    title: `${candidate.selectedTeam.name} Run Line`,
  };
}

async function recordHistoricalBestBetSnapshots(
  normalized: NormalizedCandidate[],
  slate: DailySlateViewModel,
) {
  if (slate.dataSource !== "live" || !process.env.DATABASE_URL) {
    return;
  }

  await Promise.all(
    normalized.map((item) => {
      const candidate = item.candidate;

      if (candidate.sportsbookOdds === undefined || !candidate.sportsbook) {
        return undefined;
      }

      return historicalMarketStorageService.recordSnapshot({
        calibrationVersion: "calibration-v1",
        capturedAt: candidate.timestamp,
        currentOdds: candidate.sportsbookOdds,
        dataQuality: candidate.dataQuality,
        edgePercent: candidate.edgePercent,
        expectedValuePercent: candidate.expectedValuePercent,
        fairOdds: candidate.fairOdds,
        gameId: item.gameId,
        line: item.line,
        market: candidate.marketType,
        modelConfidence: candidate.confidence,
        modelVersion: `${candidate.marketType}-intelligence-v1`,
        openingOdds: candidate.sportsbookOdds,
        playerId: candidate.player?.id,
        predictionId: candidate.betId,
        predictionVersion: `${candidate.marketType}-v1`,
        provider: "best-bets",
        recommendation: candidate.recommendation,
        selection: item.selection ?? item.title,
        snapshotId: [
          "best-bets",
          candidate.betId,
          candidate.sportsbook,
          candidate.timestamp,
        ].join(":"),
        sportsbook: candidate.sportsbook,
        teamId: candidate.team?.id,
        trueLineProbability: candidate.modelProbability,
        updatedAt: candidate.timestamp,
        variance: candidate.variance,
      });
    }),
  );
}

function applyBestBetFilters(candidates: NormalizedCandidate[], filters: BestBetsFilters) {
  return candidates.filter(({ candidate }) => {
    if (filters.market && candidate.marketType !== filters.market) return false;
    if (filters.teamId && candidate.team?.id !== filters.teamId) return false;
    if (filters.playerId && candidate.player?.id !== filters.playerId) return false;
    if (filters.sportsbook && candidate.sportsbook !== filters.sportsbook) return false;
    if (filters.minimumConfidence !== undefined && candidate.confidence < filters.minimumConfidence) return false;
    if (filters.minimumEdge !== undefined && candidate.edgePercent < filters.minimumEdge) return false;
    if (filters.minimumExpectedValue !== undefined && candidate.expectedValuePercent < filters.minimumExpectedValue) return false;
    return true;
  });
}

function toDisplayCandidate({
  calibration,
  normalized,
  oddsIntelligence,
  ranked,
}: {
  calibration?: CalibrationDashboardViewModel;
  normalized?: NormalizedCandidate;
  oddsIntelligence?: OddsIntelligenceDashboardViewModel;
  ranked: RankedBetCandidate;
}): BestBetDisplayCandidate | undefined {
  if (!normalized) return undefined;

  const scorecard = getScorecard(calibration, ranked.candidate.marketType);
  const oddsMovement = oddsIntelligence?.movementHistory.find(
    (item) => item.predictionId === ranked.candidate.betId || item.market === ranked.candidate.marketType,
  );

  return {
    calibration: {
      clvDisplay: formatSignedPercent(oddsMovement?.analysis.clvPercent ?? calibration?.overallMetrics.averageClv ?? 0),
      confidenceCalibrationDisplay: scorecard ? `${scorecard.confidenceAccuracy.toFixed(1)}%` : "Pending",
      historicalSimilarBets: scorecard ? String(scorecard.predictionCount) : "0",
      roiDisplay: formatSignedPercent(scorecard?.roi ?? 0),
      winRateDisplay: scorecard ? `${scorecard.winRate.toFixed(1)}%` : "Pending",
    },
    display: {
      confidence: `${ranked.candidate.confidence}%`,
      edge: formatSignedPercent(ranked.candidate.edgePercent),
      expectedValue: formatSignedPercent(ranked.candidate.expectedValuePercent),
      fairLine: normalized.fairLine,
      gameGrade: `${normalized.gameGrade}/100`,
      odds: ranked.candidate.sportsbookOdds === undefined ? "-" : formatAmericanOdds(ranked.candidate.sportsbookOdds),
      probability: `${(ranked.candidate.modelProbability * 100).toFixed(1)}%`,
      sportsbookLine: normalized.sportsbookLine,
    },
    fairLine: normalized.fairLine,
    gameGrade: normalized.gameGrade,
    href: normalized.href,
    id: ranked.candidate.betId,
    market: ranked.candidate.marketType,
    marketLabel: marketLabel(ranked.candidate.marketType),
    opponent: ranked.candidate.opponent,
    player: ranked.candidate.player,
    ranked,
    reasons: [
      ...ranked.explanations,
      ...normalized.reasons.slice(0, 4),
      scorecard ? `Historical ROI ${formatSignedPercent(scorecard.roi)} across ${scorecard.predictionCount} similar records.` : "Historical calibration pending for this market.",
      oddsMovement ? `CLV ${formatSignedPercent(oddsMovement.analysis.clvPercent)} from odds intelligence.` : "CLV history pending.",
    ],
    sportsbook: ranked.candidate.sportsbook,
    sportsbookLine: normalized.sportsbookLine,
    team: ranked.candidate.team,
    title: normalized.title,
  };
}

function buildMarketSummary(candidates: BestBetDisplayCandidate[]) {
  const byMarket = new Map<BetMarketType, BestBetDisplayCandidate[]>();

  candidates.forEach((candidate) => {
    byMarket.set(candidate.market, [...(byMarket.get(candidate.market) ?? []), candidate]);
  });

  return [...byMarket.entries()]
    .map(([market, items]) => ({
      count: items.length,
      label: marketLabel(market),
      market,
      topScore: Math.max(...items.map((item) => item.ranked.trueLineScore)),
    }))
    .sort((left, right) => right.topScore - left.topScore);
}

function attachCorrelationBadges(candidates: BestBetDisplayCandidate[]) {
  return candidates.map((candidate) => {
    const related = candidates
      .filter((item) => item.id !== candidate.id)
      .filter((item) =>
        Boolean(
          (candidate.player?.id && candidate.player.id === item.player?.id) ||
            (candidate.team?.id && candidate.team.id === item.team?.id) ||
            (candidate.team?.id && candidate.team.id === item.opponent?.id) ||
            (candidate.sportsbook && candidate.sportsbook === item.sportsbook),
        ),
      );
    const exposureScore = Math.min(
      100,
      related.length * 14 +
        (candidate.ranked.riskTier === "High" ? 20 : candidate.ranked.riskTier === "Medium" ? 10 : 0),
    );

    return {
      ...candidate,
      correlation: {
        badge: exposureScore >= 70 ? "High Correlation" : exposureScore >= 40 ? "Moderate Correlation" : "Low Correlation",
        exposureBadge: exposureScore >= 70 ? "High Exposure" : exposureScore >= 40 ? "Moderate Exposure" : "Low Exposure",
        portfolioRisk: `${exposureScore}/100`,
        relatedBets: related.slice(0, 4).map((item) => item.title),
      },
    };
  });
}

function getScorecard(
  calibration: CalibrationDashboardViewModel | undefined,
  market: BetMarketType,
): ModelScorecard | undefined {
  return calibration?.marketPerformance.find((item) => item.market === market);
}

function getPropMarket(category: "Strikeouts" | "Hits" | "Total Bases"): BetMarketType {
  if (category === "Strikeouts") return "strikeouts";
  if (category === "Hits") return "hits";
  return "total-bases";
}

function getMarketHref(market: BetMarketType) {
  const hrefs: Record<BetMarketType, string> = {
    "game-total": "/betting/game-totals",
    "home-runs": "/hitting/home-runs",
    hits: "/hitting/hits",
    moneyline: "/betting/moneyline",
    parlay: "/best-bets",
    prizepicks: "/best-bets",
    "run-line": "/betting/run-line",
    strikeouts: "/pitching/strikeouts",
    "team-total": "/betting/team-totals",
    "total-bases": "/betting/total-bases",
  };

  return hrefs[market];
}

function marketLabel(market: BetMarketType) {
  const labels: Record<BetMarketType, string> = {
    "game-total": "Game Total",
    "home-runs": "Home Run",
    hits: "Hits",
    moneyline: "Moneyline",
    parlay: "Parlay",
    prizepicks: "PrizePicks",
    "run-line": "Run Line",
    strikeouts: "Strikeouts",
    "team-total": "Team Total",
    "total-bases": "Total Bases",
  };

  return labels[market];
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
    score: clamp(score),
    summary,
  };
}

function factorKey(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("bullpen")) return "bullpenImpact";
  if (normalized.includes("weather") || normalized.includes("park") || normalized.includes("environment")) return "weatherImpact";
  if (normalized.includes("lineup")) return "lineupCertainty";
  if (normalized.includes("recent") || normalized.includes("form")) return "recentForm";
  return "matchupStrength";
}

function scoreFromEdge(edgePercent: number) {
  return clamp(50 + edgePercent * 5);
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return 50;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function clampProbability(value: number) {
  return Math.max(0.01, Math.min(0.99, value));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatAmericanOdds(value: number) {
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
