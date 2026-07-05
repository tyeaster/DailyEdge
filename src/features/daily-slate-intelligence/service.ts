import type { DailySlateViewModel } from "../../services/daily-slate/types.ts";
import {
  RankingEngineService,
  type BetCandidate,
  type BetMarketType,
  type RankedBetCandidate,
} from "../../services/ranking/index.ts";
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

export type DailySlateAlertSeverity = "high" | "medium" | "low";
export type DailySlateAlertType = "weather" | "bullpen" | "lineup";

export interface DailySlateAlert {
  id: string;
  meta: string;
  severity: DailySlateAlertSeverity;
  summary: string;
  title: string;
  type: DailySlateAlertType;
}

export interface DailySlateRankedBet {
  href: string;
  ranked: RankedBetCandidate;
  subtitle: string;
  title: string;
}

export interface DailySlateIntelligenceSection {
  bets: DailySlateRankedBet[];
  href: string;
  label: string;
  title: string;
}

export interface DailySlateMarketSummary {
  biggestUndervaluedBet?: DailySlateRankedBet;
  highestConfidence?: DailySlateRankedBet;
  highestEdge?: DailySlateRankedBet;
  highestExpectedValue?: DailySlateRankedBet;
  highestRisk?: DailySlateRankedBet;
}

export interface DailySlateIntelligenceViewModel {
  alerts: DailySlateAlert[];
  bullpenAlerts: DailySlateAlert[];
  dataSource: DailySlateViewModel["dataSource"];
  error?: string;
  lineups: DailySlateAlert[];
  marketSummary: DailySlateMarketSummary;
  moneyline: DailySlateIntelligenceSection;
  homeRuns: DailySlateIntelligenceSection;
  hits: DailySlateIntelligenceSection;
  slateMeta: DailySlateViewModel["slateMeta"] & {
    rankedBetCount: number;
    sectionsPopulated: number;
  };
  strikeouts: DailySlateIntelligenceSection;
  topBets: DailySlateRankedBet[];
  weatherAlerts: DailySlateAlert[];
}

interface DailySlateOrchestratorDependencies {
  loadHomeRuns?: (slate: DailySlateViewModel) => Promise<HomeRunIntelligenceViewModel>;
  loadMoneyline?: (
    slate: DailySlateViewModel,
  ) => Promise<MoneylineIntelligenceViewModel>;
  loadSlate?: () => Promise<DailySlateViewModel>;
  rankingEngine?: RankingEngineService;
}

export class DailySlateOrchestratorService {
  private readonly loadHomeRuns: (
    slate: DailySlateViewModel,
  ) => Promise<HomeRunIntelligenceViewModel>;
  private readonly loadMoneyline: (
    slate: DailySlateViewModel,
  ) => Promise<MoneylineIntelligenceViewModel>;
  private readonly loadSlate: () => Promise<DailySlateViewModel>;
  private readonly rankingEngine: RankingEngineService;

  constructor(dependencies: DailySlateOrchestratorDependencies = {}) {
    this.loadHomeRuns =
      dependencies.loadHomeRuns ??
      ((slate) => homeRunIntelligenceService.getHomeRunIntelligenceFromSlate(slate));
    this.loadMoneyline =
      dependencies.loadMoneyline ??
      ((slate) => moneylineIntelligenceService.getMoneylineIntelligenceFromSlate(slate));
    this.loadSlate =
      dependencies.loadSlate ??
      (async () => {
        const { getDailySlate } = await import("../../services/daily-slate/service.ts");

        return getDailySlate();
      });
    this.rankingEngine = dependencies.rankingEngine ?? new RankingEngineService();
  }

  async getDailySlateIntelligence(): Promise<DailySlateIntelligenceViewModel> {
    const slate = await this.loadSlate();
    const [homeRuns, moneyline] = await Promise.all([
      this.loadHomeRuns(slate),
      this.loadMoneyline(slate),
    ]);

    return buildDailySlateIntelligenceViewModel({
      homeRuns,
      moneyline,
      rankingEngine: this.rankingEngine,
      slate,
    });
  }
}

export const dailySlateOrchestratorService = new DailySlateOrchestratorService();

export async function getDailySlateIntelligence() {
  return dailySlateOrchestratorService.getDailySlateIntelligence();
}

export function buildDailySlateIntelligenceViewModel({
  homeRuns,
  moneyline,
  rankingEngine = new RankingEngineService(),
  slate,
}: {
  homeRuns: HomeRunIntelligenceViewModel;
  moneyline: MoneylineIntelligenceViewModel;
  rankingEngine?: RankingEngineService;
  slate: DailySlateViewModel;
}): DailySlateIntelligenceViewModel {
  const candidates = [
    ...buildPropCandidates(slate, "Strikeouts"),
    ...buildPropCandidates(slate, "Hits"),
    ...homeRuns.candidates.map(buildHomeRunCandidate),
    ...moneyline.games.map(buildMoneylineCandidate),
  ];
  const ranked = rankingEngine.rankCandidates(candidates);
  const rankedBets = ranked.map(toRankedBet);
  const strikeouts = buildSection({
    bets: rankedBets,
    href: "/pitching/strikeouts",
    label: "Strikeouts",
    marketType: "strikeouts",
    title: "Top Strikeout Bets",
  });
  const hits = buildSection({
    bets: rankedBets,
    href: "/hitting/hits",
    label: "Hits",
    marketType: "hits",
    title: "Top Hits Bets",
  });
  const homeRunSection = buildSection({
    bets: rankedBets,
    href: "/hitting/home-runs",
    label: "Home Runs",
    marketType: "home-runs",
    title: "Top Home Run Bets",
  });
  const moneylineSection = buildSection({
    bets: rankedBets,
    href: "/betting/moneyline",
    label: "Moneyline",
    marketType: "moneyline",
    title: "Top Moneyline Bets",
  });
  const weatherAlerts = buildWeatherAlerts(slate);
  const bullpenAlerts = buildBullpenAlerts(slate);
  const lineupAlerts = buildLineupAlerts(slate);
  const sections = [strikeouts, hits, homeRunSection, moneylineSection];

  return {
    alerts: [...weatherAlerts, ...bullpenAlerts, ...lineupAlerts].sort(
      (left, right) => severityRank(right.severity) - severityRank(left.severity),
    ),
    bullpenAlerts,
    dataSource: slate.dataSource,
    error: slate.error,
    homeRuns: homeRunSection,
    hits,
    lineups: lineupAlerts,
    marketSummary: buildMarketSummary(rankedBets),
    moneyline: moneylineSection,
    slateMeta: {
      ...slate.slateMeta,
      rankedBetCount: rankedBets.length,
      sectionsPopulated: sections.filter((section) => section.bets.length > 0).length,
    },
    strikeouts,
    topBets: rankedBets.slice(0, 25),
    weatherAlerts,
  };
}

function buildPropCandidates(
  slate: DailySlateViewModel,
  category: "Strikeouts" | "Hits",
): BetCandidate[] {
  const propCategory = slate.propCategories.find((item) => item.label === category);

  return (propCategory?.props ?? []).map(({ player, prop, team }) => {
    const game = slate.games.find((item) => item.game.id === prop.gameId);
    const marketType = category === "Strikeouts" ? "strikeouts" : "hits";
    const edgePercent = prop.edge.percentage;
    const confidence = prop.confidence.value;
    const modelProbability = clampProbability(0.5 + edgePercent / 200);

    return {
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
        factor("recentForm", "Model Confidence", confidence, "Existing prop confidence from the Daily Slate."),
        factor("lineupCertainty", "Data Quality", game?.game.prediction?.dataQuality.score ?? confidence, "Slate data quality for the underlying game."),
      ],
      team: {
        id: team.id,
        name: team.name,
      },
      timestamp: prop.odds.updatedAt ?? slate.slateMeta.lastUpdated,
      variance: marketType === "strikeouts" ? 45 : 58,
    };
  });
}

function buildHomeRunCandidate(candidate: HomeRunCandidate): BetCandidate {
  return {
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
      factor("weatherImpact", "Weather/Park Context", candidate.factors.find((item) => item.label.includes("Environment"))?.score ?? 50, "Environmental home run context from the Home Run Lab."),
      factor("recentForm", "Power Form", candidate.factors.find((item) => item.label.includes("Batter"))?.score ?? 50, "Batter power profile and recent contact quality."),
    ],
    team: {
      id: candidate.team.id,
      name: candidate.team.name,
    },
    timestamp: candidate.prop?.prop.odds.updatedAt ?? candidate.game.game.scheduledAt,
    variance: 82,
  };
}

function buildMoneylineCandidate(evaluation: MoneylineGameEvaluation): BetCandidate {
  return {
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
    timestamp:
      evaluation.game.game.odds.moneyline.updatedAt ?? evaluation.game.game.scheduledAt,
    variance: 36,
  };
}

function toRankedBet(ranked: RankedBetCandidate): DailySlateRankedBet {
  const candidate = ranked.candidate;
  const title = candidate.player?.name ?? candidate.team?.name ?? candidate.betId;
  const subtitle = [
    marketLabel(candidate.marketType),
    candidate.team?.name,
    candidate.opponent?.name ? `vs ${candidate.opponent.name}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    href: getCandidateHref(candidate),
    ranked,
    subtitle,
    title,
  };
}

function buildSection({
  bets,
  href,
  label,
  marketType,
  title,
}: {
  bets: DailySlateRankedBet[];
  href: string;
  label: string;
  marketType: BetMarketType;
  title: string;
}): DailySlateIntelligenceSection {
  return {
    bets: bets.filter((bet) => bet.ranked.candidate.marketType === marketType).slice(0, 10),
    href,
    label,
    title,
  };
}

function buildMarketSummary(
  bets: DailySlateRankedBet[],
): DailySlateMarketSummary {
  return {
    biggestUndervaluedBet: maxBy(bets, (bet) => bet.ranked.trueLineScore),
    highestConfidence: maxBy(bets, (bet) => bet.ranked.candidate.confidence),
    highestEdge: maxBy(bets, (bet) => bet.ranked.candidate.edgePercent),
    highestExpectedValue: maxBy(
      bets,
      (bet) => bet.ranked.candidate.expectedValuePercent,
    ),
    highestRisk: maxBy(bets, (bet) => bet.ranked.candidate.variance),
  };
}

function buildWeatherAlerts(slate: DailySlateViewModel): DailySlateAlert[] {
  return slate.weatherReports.flatMap(({ awayTeam, homeTeam, report }) => {
    const gameLabel = `${awayTeam.abbreviation} at ${homeTeam.abbreviation}`;
    const alerts: DailySlateAlert[] = [];

    if (!report.weatherApplicable) {
      alerts.push({
        id: `weather-roof-${report.id}`,
        meta: gameLabel,
        severity: "low",
        summary: `${report.stadium}: weather not applicable (${report.roofStatus}).`,
        title: "Weather Not Applicable",
        type: "weather",
      });
    }

    if (report.tailwindMph >= 10) {
      alerts.push({
        id: `weather-tailwind-${report.id}`,
        meta: gameLabel,
        severity: report.tailwindMph >= 15 ? "high" : "medium",
        summary: `${report.windMph} MPH ${report.relativeWindDirection}; HR environment ${report.homeRunEnvironment}/100.`,
        title: "Strong Wind Out",
        type: "weather",
      });
    }

    if (report.headwindMph >= 10) {
      alerts.push({
        id: `weather-headwind-${report.id}`,
        meta: gameLabel,
        severity: "medium",
        summary: `${report.windMph} MPH ${report.relativeWindDirection}; run environment ${report.runEnvironment}/100.`,
        title: "Strong Wind In",
        type: "weather",
      });
    }

    if (report.delayProbability >= 25 || report.rainChancePercent >= 40) {
      alerts.push({
        id: `weather-rain-${report.id}`,
        meta: gameLabel,
        severity: report.delayProbability >= 45 ? "high" : "medium",
        summary: `${report.rainChancePercent}% rain chance and ${report.delayProbability}% delay risk.`,
        title: "Rain Risk",
        type: "weather",
      });
    }

    if (report.temperatureF >= 88 || report.temperatureF <= 45) {
      alerts.push({
        id: `weather-temp-${report.id}`,
        meta: gameLabel,
        severity: "medium",
        summary: `${report.temperatureF}F with air density ${report.airDensityKgM3?.toFixed(2) ?? "unknown"}.`,
        title: report.temperatureF >= 88 ? "Extreme Heat" : "Extreme Cold",
        type: "weather",
      });
    }

    if (report.airDensityKgM3 !== null && (report.airDensityKgM3 <= 1.16 || report.airDensityKgM3 >= 1.26)) {
      alerts.push({
        id: `weather-density-${report.id}`,
        meta: gameLabel,
        severity: "low",
        summary: `Air density ${report.airDensityKgM3.toFixed(2)} kg/m3 may affect carry.`,
        title: "Air Density Change",
        type: "weather",
      });
    }

    return alerts;
  });
}

function buildBullpenAlerts(slate: DailySlateViewModel): DailySlateAlert[] {
  const teams = uniqueTeams(slate);

  return teams
    .map((team) => {
      const bullpen = team.strength?.bullpen;
      const workload = bullpen?.workloadRating ?? 50;
      const value = bullpen?.value ?? 50;
      const fatigued = workload >= 68;

      return {
        id: `bullpen-${team.id}`,
        meta: team.name,
        severity: fatigued || value <= 40 ? "medium" : "low",
        summary: fatigued
          ? `Workload rating ${workload}/100; monitor late-inning availability.`
          : `Bullpen strength ${value}/100 with workload ${workload}/100.`,
        title: fatigued ? "Fatigued Bullpen" : "Fresh Bullpen",
        type: "bullpen",
      } satisfies DailySlateAlert;
    })
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 8);
}

function buildLineupAlerts(slate: DailySlateViewModel): DailySlateAlert[] {
  return uniqueTeams(slate)
    .map((team) => {
      const lineup = team.lineup;
      const missingStars = lineup?.missingStarPlayerIds.length ?? 0;
      const missingStarText =
        missingStars > 0 ? `${missingStars} missing star player(s).` : "No missing stars flagged.";

      return {
        id: `lineup-${team.id}`,
        meta: team.name,
        severity:
          lineup?.status === "confirmed" && missingStars === 0
            ? "low"
            : missingStars > 0
              ? "high"
              : "medium",
        summary: `${lineup?.status ?? "unavailable"} lineup, strength ${lineup?.overallStrength ?? 50}/100. ${missingStarText}`,
        title:
          lineup?.status === "confirmed"
            ? "Confirmed Lineup"
            : missingStars > 0
              ? "Missing Star"
              : "Projected Lineup",
        type: "lineup",
      } satisfies DailySlateAlert;
    })
    .slice(0, 10);
}

function uniqueTeams(slate: DailySlateViewModel) {
  const teams = new Map<string, DailySlateViewModel["games"][number]["homeTeam"]>();

  for (const game of slate.games) {
    teams.set(game.awayTeam.id, game.awayTeam);
    teams.set(game.homeTeam.id, game.homeTeam);
  }

  return [...teams.values()];
}

function getCandidateHref(candidate: BetCandidate) {
  if (candidate.marketType === "strikeouts") {
    return `/pitching/strikeouts${candidate.player ? `?pitcher=${candidate.player.id}` : ""}`;
  }

  if (candidate.marketType === "hits") {
    return `/hitting/hits${candidate.player ? `?batter=${candidate.player.id}` : ""}`;
  }

  if (candidate.marketType === "home-runs") return "/hitting/home-runs";
  if (candidate.marketType === "moneyline") return "/betting/moneyline";

  return "/";
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
  if (label.toLowerCase().includes("bullpen")) return "bullpenImpact";
  if (label.toLowerCase().includes("weather")) return "weatherImpact";
  if (label.toLowerCase().includes("lineup")) return "lineupCertainty";
  if (label.toLowerCase().includes("recent")) return "recentForm";
  return "matchupStrength";
}

function marketLabel(marketType: BetMarketType) {
  const labels: Record<BetMarketType, string> = {
    "game-total": "Game Total",
    "home-runs": "Home Run",
    hits: "Hits",
    moneyline: "Moneyline",
    parlay: "Parlay",
    prizepicks: "PrizePicks",
    strikeouts: "Strikeouts",
    "team-total": "Team Total",
    "total-bases": "Total Bases",
  };

  return labels[marketType];
}

function scoreFromEdge(edgePercent: number) {
  return clamp(50 + edgePercent * 5);
}

function clampProbability(value: number) {
  return Math.max(0.01, Math.min(0.99, value));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function maxBy<TData>(items: TData[], getValue: (item: TData) => number) {
  return items.reduce<TData | undefined>((best, item) => {
    if (!best || getValue(item) > getValue(best)) return item;

    return best;
  }, undefined);
}

function severityRank(severity: DailySlateAlertSeverity) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
