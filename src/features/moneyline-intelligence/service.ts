import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  calculateFairLine,
  formatAmericanOdds,
  formatPercentage,
} from "../../lib/odds.ts";
import type { Pitcher, Team } from "../../models/mlb.ts";
import type { DailySlateGame, DailySlateViewModel } from "../../services/daily-slate/types.ts";
import {
  matchupService,
  type MatchupIntelligenceResult,
} from "../../services/matchup/index.ts";
import {
  playerIntelligenceService,
  type PitcherIntelligence,
} from "../../services/player-intelligence/index.ts";
import { calculateExpectedValuePercent } from "../../services/predictions/PredictionEngine.ts";
import { MONEYLINE_INTELLIGENCE_CONFIG } from "./config.ts";

type MoneylineRecommendation = "Best Bet" | "Strong Play" | "Play" | "Lean" | "Pass";

export interface MoneylineFactor {
  awayScore: number;
  details: Array<{ label: string; value: string }>;
  explanation: string;
  homeScore: number;
  label: string;
  winner: "away" | "home" | "neutral";
  weight: string;
}

export interface MoneylineGameEvaluation {
  away: TeamEvaluation;
  awayTeam: Team;
  confidence: number;
  edgePercent: number;
  edgePercentDisplay: string;
  expectedValuePercent: number;
  expectedValueDisplay: string;
  factors: MoneylineFactor[];
  fairOdds: number;
  fairOddsDisplay: string;
  game: DailySlateGame;
  home: TeamEvaluation;
  homeTeam: Team;
  impliedSportsbookProbability: number;
  projectedWinner: Team;
  reasons: string[];
  recommendation: MoneylineRecommendation;
  sportsbookOdds: number;
  sportsbookOddsDisplay: string;
  summary: string;
  winProbability: number;
  winProbabilityDisplay: string;
}

export interface TeamEvaluation {
  bullpenScore: number;
  defenseScore: number;
  environmentScore: number;
  homeFieldScore: number;
  matchupScore: number;
  offenseScore: number;
  overallTeamGrade: number;
  projectedRunDifferential: number;
  projectedRuns: number;
  startingPitchingScore: number;
  team: Team;
}

export interface MoneylineIntelligenceViewModel {
  games: MoneylineGameEvaluation[];
  slateMeta: {
    averageConfidence: string;
    dataSource: string;
    gamesEvaluated: number;
    lastUpdated: string;
  };
}

interface GameContext {
  awayMatchup: MatchupIntelligenceResult;
  awayPitcherIntelligence?: PitcherIntelligence;
  game: DailySlateGame;
  homeMatchup: MatchupIntelligenceResult;
  homePitcherIntelligence?: PitcherIntelligence;
}

export class MoneylineIntelligenceService {
  async getMoneylineIntelligence(): Promise<MoneylineIntelligenceViewModel> {
    const { getDailySlate } = await import("../../services/daily-slate/service.ts");
    const slate = await getDailySlate();

    return this.getMoneylineIntelligenceFromSlate(slate);
  }

  async getMoneylineIntelligenceFromSlate(
    slate: DailySlateViewModel,
  ): Promise<MoneylineIntelligenceViewModel> {
    const games = await Promise.all(
      slate.games.map(async (game) => buildMoneylineGameEvaluation(await loadGameContext(game))),
    );

    return buildMoneylineIntelligenceViewModel(slate, games);
  }
}

export const moneylineIntelligenceService = new MoneylineIntelligenceService();

export async function getMoneylineIntelligence() {
  return moneylineIntelligenceService.getMoneylineIntelligence();
}

export function buildMoneylineIntelligenceViewModel(
  slate: DailySlateViewModel,
  games: MoneylineGameEvaluation[],
): MoneylineIntelligenceViewModel {
  const sorted = [...games].sort((left, right) => right.edgePercent - left.edgePercent);
  const averageConfidence =
    sorted.length === 0
      ? 0
      : sorted.reduce((total, game) => total + game.confidence, 0) / sorted.length;

  return {
    games: sorted,
    slateMeta: {
      averageConfidence: formatPercentage(averageConfidence),
      dataSource: slate.dataSource,
      gamesEvaluated: sorted.length,
      lastUpdated: slate.slateMeta.lastUpdated,
    },
  };
}

export function buildMoneylineGameEvaluation({
  awayMatchup,
  awayPitcherIntelligence,
  game,
  homeMatchup,
  homePitcherIntelligence,
}: GameContext): MoneylineGameEvaluation {
  const away = buildTeamEvaluation({
    isHome: false,
    matchup: awayMatchup,
    opponentPitcher: game.homePitcher,
    pitcher: game.awayPitcher,
    pitcherIntelligence: awayPitcherIntelligence,
    team: game.awayTeam,
    weather: game.weather,
    ballpark: game.game.ballpark,
    predictionRuns: game.game.prediction?.awayProjectedRuns,
  });
  const home = buildTeamEvaluation({
    isHome: true,
    matchup: homeMatchup,
    opponentPitcher: game.awayPitcher,
    pitcher: game.homePitcher,
    pitcherIntelligence: homePitcherIntelligence,
    team: game.homeTeam,
    weather: game.weather,
    ballpark: game.game.ballpark,
    predictionRuns: game.game.prediction?.homeProjectedRuns,
  });
  const projectedWinner = home.overallTeamGrade >= away.overallTeamGrade ? game.homeTeam : game.awayTeam;
  const selectedSide = projectedWinner.id === game.homeTeam.id ? "home" : "away";
  const baseWinProbability =
    selectedSide === "home"
      ? game.game.prediction?.homeWinProbability
      : game.game.prediction?.awayWinProbability;
  const gradeProbability = gradeToProbability(
    selectedSide === "home"
      ? home.overallTeamGrade - away.overallTeamGrade
      : away.overallTeamGrade - home.overallTeamGrade,
  );
  const winProbability = clampProbability(
    baseWinProbability === undefined
      ? gradeProbability
      : baseWinProbability * 0.68 + gradeProbability * 0.32,
  );
  const fairOdds = calculateFairLine(winProbability);
  const sportsbookOdds = getSportsbookOdds(game, selectedSide);
  const impliedSportsbookProbability = americanOddsToImpliedProbability(sportsbookOdds);
  const edgePercent = calculateEdgePercent(winProbability, impliedSportsbookProbability);
  const expectedValuePercent = calculateExpectedValuePercent(winProbability, sportsbookOdds);
  const factors = buildFactors({ away, game, home });
  const confidence = calculateConfidence({
    edgePercent,
    factors,
    game,
    winnerGrade: selectedSide === "home" ? home.overallTeamGrade : away.overallTeamGrade,
  });
  const recommendation = getRecommendation({
    edgePercent,
    expectedValuePercent,
    grade: selectedSide === "home" ? home.overallTeamGrade : away.overallTeamGrade,
  });
  const reasons = buildReasons({
    away,
    awayMatchup,
    game,
    home,
    homeMatchup,
    selectedSide,
  });

  return {
    away,
    awayTeam: game.awayTeam,
    confidence,
    edgePercent,
    edgePercentDisplay: formatSignedPercent(edgePercent),
    expectedValueDisplay: formatSignedPercent(expectedValuePercent),
    expectedValuePercent,
    factors,
    fairOdds,
    fairOddsDisplay: formatAmericanOdds(fairOdds),
    game,
    home,
    homeTeam: game.homeTeam,
    impliedSportsbookProbability,
    projectedWinner,
    reasons,
    recommendation,
    sportsbookOdds,
    sportsbookOddsDisplay: formatAmericanOdds(sportsbookOdds),
    summary: buildSummary({
      edgePercent,
      fairOdds,
      projectedWinner,
      recommendation,
      sportsbookOdds,
      winProbability,
    }),
    winProbability,
    winProbabilityDisplay: formatPercentage(winProbability * 100),
  };
}

async function loadGameContext(game: DailySlateGame): Promise<GameContext> {
  const season = new Date(game.game.scheduledAt).getUTCFullYear();
  const [awayPitcherIntelligence, homePitcherIntelligence] = await Promise.all([
    loadPitcherIntelligence(game.awayPitcher, game.awayTeam, game.homeTeam, game, season),
    loadPitcherIntelligence(game.homePitcher, game.homeTeam, game.awayTeam, game, season),
  ]);
  const [awayMatchup, homeMatchup] = await Promise.all([
    matchupService.getMatchupIntelligence(
      {
        asOfDate: game.game.scheduledAt.slice(0, 10),
        batterIds: game.homeTeam.lineup?.players.map((player) => `mlb-player-${player.mlbId}`),
        batterMlbIds: game.homeTeam.lineup?.players.map((player) => player.mlbId),
        batterNames: game.homeTeam.lineup?.players.map((player) => player.fullName),
        pitcherId: game.awayPitcher.id,
        pitcherMlbId: game.awayPitcher.externalIds?.mlb,
        pitcherName: game.awayPitcher.fullName,
        season,
      },
      {
        ballpark: game.game.ballpark,
        bullpen: game.awayTeam.strength?.bullpen,
        lineup: game.homeTeam.lineup,
        pitcherIntelligence: awayPitcherIntelligence,
        weather: game.weather,
      },
    ),
    matchupService.getMatchupIntelligence(
      {
        asOfDate: game.game.scheduledAt.slice(0, 10),
        batterIds: game.awayTeam.lineup?.players.map((player) => `mlb-player-${player.mlbId}`),
        batterMlbIds: game.awayTeam.lineup?.players.map((player) => player.mlbId),
        batterNames: game.awayTeam.lineup?.players.map((player) => player.fullName),
        pitcherId: game.homePitcher.id,
        pitcherMlbId: game.homePitcher.externalIds?.mlb,
        pitcherName: game.homePitcher.fullName,
        season,
      },
      {
        ballpark: game.game.ballpark,
        bullpen: game.homeTeam.strength?.bullpen,
        lineup: game.awayTeam.lineup,
        pitcherIntelligence: homePitcherIntelligence,
        weather: game.weather,
      },
    ),
  ]);

  return {
    awayMatchup,
    awayPitcherIntelligence,
    game,
    homeMatchup,
    homePitcherIntelligence,
  };
}

async function loadPitcherIntelligence(
  pitcher: Pitcher,
  team: Team,
  opponent: Team,
  game: DailySlateGame,
  season: number,
) {
  try {
    return await playerIntelligenceService.getPitcher({
      context: {
        ballpark: game.game.ballpark,
        game: game.game,
        lineup: opponent.lineup,
        opponent,
        prediction: game.game.prediction,
        team,
        weather: game.weather,
      },
      pitcher,
      season,
    });
  } catch {
    return undefined;
  }
}

function buildTeamEvaluation({
  ballpark,
  isHome,
  matchup,
  opponentPitcher,
  pitcher,
  pitcherIntelligence,
  predictionRuns,
  team,
  weather,
}: {
  ballpark: DailySlateGame["game"]["ballpark"];
  isHome: boolean;
  matchup: MatchupIntelligenceResult;
  opponentPitcher: Pitcher;
  pitcher: Pitcher;
  pitcherIntelligence?: PitcherIntelligence;
  predictionRuns?: number;
  team: Team;
  weather: DailySlateGame["weather"];
}): TeamEvaluation {
  const offenseScore = average([
    team.strength?.offense.value,
    normalizeRange(team.strength?.offense.runsPerGame, 3.2, 5.8),
    normalizeRange(team.strength?.offense.ops, 0.65, 0.84),
    normalizeInverse(team.strength?.offense.strikeoutRate, 27, 17),
    normalizeRange(team.strength?.offense.walkRate, 6, 11),
    normalizeRange(team.lineup?.contactRating, 35, 85),
    normalizeRange(team.lineup?.powerRating, 35, 85),
    normalizeRange(team.lineup?.overallStrength, 35, 85),
    normalizeRange(team.recentForm?.windows[7].runsPerGame, 2.8, 6.4),
    normalizeRange(team.recentForm?.windows[7].ops, 0.6, 0.9),
  ]);
  const startingPitchingScore = average([
    normalizeInverse(pitcher.era, 5.5, 2.2),
    normalizeInverse(pitcher.whip, 1.55, 0.9),
    normalizeRange(pitcher.strikeoutRate, 17, 34),
    normalizeInverse(pitcher.walksPer9, 4.2, 1.4),
    pitcherIntelligence?.recentForm.score,
    pitcherIntelligence?.consistency.consistencyScore,
    pitcherIntelligence?.rolling.last5.qualityStartPercent,
    pitcherIntelligence?.rolling.last5.sixPlusInningPercent,
    normalizeRange(pitcherIntelligence?.rolling.last5.averagePitchCount, 72, 102),
    trendScore(pitcherIntelligence?.trends, ["Velocity", "Pitch count", "Command"]),
  ]);
  const bullpenScore = average([
    team.strength?.bullpen.value,
    normalizeInverse(team.strength?.bullpen.workloadRating, 85, 35),
    normalizeInverse(team.strength?.bullpen.era, 5.2, 2.8),
    normalizeInverse(team.strength?.bullpen.whip, 1.5, 1.05),
    normalizeRange(team.strength?.bullpen.strikeoutRate, 18, 32),
  ]);
  const defenseScore = 50;
  const matchupScore = average([
    matchup.overallMatchupScore,
    matchup.pitchTypeMatch.score,
    matchup.zoneMatch.score,
    platoonScore(team, opponentPitcher),
    team.lineup?.overallStrength,
  ]);
  const environmentScore = average([
    weather.runEnvironment,
    weather.offenseEnvironment,
    ballpark?.hitterFriendlyRating,
    ballpark?.overallParkRating,
    ballpark?.runFactor === null || ballpark?.runFactor === undefined
      ? undefined
      : normalizeRange(ballpark.runFactor, 88, 115),
  ]);
  const homeFieldScore = isHome
    ? MONEYLINE_INTELLIGENCE_CONFIG.homeField.baseAdvantage
    : MONEYLINE_INTELLIGENCE_CONFIG.homeField.roadBaseline;
  const overallTeamGrade = weightedTeamGrade({
    bullpenScore,
    defenseScore,
    environmentScore,
    homeFieldScore,
    matchupScore,
    offenseScore,
    startingPitchingScore,
  });
  const opponentPitchingPenalty = normalizeInverse(opponentPitcher.era, 2.2, 5.5);
  const projectedRuns =
    predictionRuns ??
    roundToTenth(3.2 + offenseScore / 35 + environmentScore / 80 + opponentPitchingPenalty / 120);

  return {
    bullpenScore,
    defenseScore,
    environmentScore,
    homeFieldScore,
    matchupScore,
    offenseScore,
    overallTeamGrade,
    projectedRunDifferential: roundToTenth(
      (team.strength?.overall.runDifferential ?? 0) / 162,
    ),
    projectedRuns,
    startingPitchingScore,
    team,
  };
}

function weightedTeamGrade(scores: Omit<TeamEvaluation, "team" | "overallTeamGrade" | "projectedRuns" | "projectedRunDifferential">) {
  const weights = MONEYLINE_INTELLIGENCE_CONFIG.scoreWeights;

  return Math.round(
    scores.offenseScore * weights.offense +
      scores.startingPitchingScore * weights.startingPitching +
      scores.bullpenScore * weights.bullpen +
      scores.defenseScore * weights.defense +
      scores.matchupScore * weights.matchup +
      scores.environmentScore * weights.environment +
      scores.homeFieldScore * weights.homeField,
  );
}

function buildFactors({
  away,
  game,
  home,
}: {
  away: TeamEvaluation;
  game: DailySlateGame;
  home: TeamEvaluation;
}): MoneylineFactor[] {
  const weights = MONEYLINE_INTELLIGENCE_CONFIG.scoreWeights;

  return [
    factor("Offense", weights.offense, away.offenseScore, home.offenseScore, "Projected runs, recent offense, contact, power, discipline, and lineup quality.", [
      { label: game.awayTeam.abbreviation, value: `${away.projectedRuns.toFixed(1)} runs` },
      { label: game.homeTeam.abbreviation, value: `${home.projectedRuns.toFixed(1)} runs` },
    ]),
    factor("Starting Pitching", weights.startingPitching, away.startingPitchingScore, home.startingPitchingScore, "Starter form, consistency, strikeouts, walks, pitch count, and quality-start indicators.", [
      { label: game.awayPitcher.fullName, value: `${Math.round(away.startingPitchingScore)}/100` },
      { label: game.homePitcher.fullName, value: `${Math.round(home.startingPitchingScore)}/100` },
    ]),
    factor("Bullpen", weights.bullpen, away.bullpenScore, home.bullpenScore, "Bullpen quality, workload, fatigue, ERA, WHIP, and strikeout ability.", [
      { label: game.awayTeam.abbreviation, value: `${Math.round(away.bullpenScore)}/100` },
      { label: game.homeTeam.abbreviation, value: `${Math.round(home.bullpenScore)}/100` },
    ]),
    factor("Defense", weights.defense, away.defenseScore, home.defenseScore, "Defensive inputs are placeholder-neutral until fielding feeds are available.", [
      { label: "Status", value: "Placeholder" },
    ]),
    factor("Matchup", weights.matchup, away.matchupScore, home.matchupScore, "Pitch Match, Zone Match, platoon edge, and lineup matchup context.", [
      { label: game.awayTeam.abbreviation, value: `${Math.round(away.matchupScore)}/100` },
      { label: game.homeTeam.abbreviation, value: `${Math.round(home.matchupScore)}/100` },
    ]),
    factor("Environment", weights.environment, away.environmentScore, home.environmentScore, "Weather, wind, temperature, air density, roof, and park factor.", [
      { label: "Weather", value: game.weather.summary },
      { label: "Venue", value: game.game.ballpark?.name ?? game.game.venue },
    ]),
    factor("Home Field", weights.homeField, away.homeFieldScore, home.homeFieldScore, "Home field is active; travel, rest, and schedule density remain neutral placeholders.", [
      { label: "Home", value: game.homeTeam.abbreviation },
    ]),
  ];
}

function factor(
  label: string,
  weight: number,
  awayScore: number,
  homeScore: number,
  explanation: string,
  details: Array<{ label: string; value: string }>,
): MoneylineFactor {
  return {
    awayScore: Math.round(awayScore),
    details,
    explanation,
    homeScore: Math.round(homeScore),
    label,
    weight: `${Math.round(weight * 100)}%`,
    winner:
      Math.abs(awayScore - homeScore) < 3
        ? "neutral"
        : awayScore > homeScore
          ? "away"
          : "home",
  };
}

function calculateConfidence({
  edgePercent,
  factors,
  game,
  winnerGrade,
}: {
  edgePercent: number;
  factors: MoneylineFactor[];
  game: DailySlateGame;
  winnerGrade: number;
}) {
  const weights = MONEYLINE_INTELLIGENCE_CONFIG.confidence;
  const predictionConfidence = game.game.prediction?.confidenceScore ?? game.game.confidence.value;
  const edgeScore = normalizeRange(edgePercent, -3, 8);
  const agreement =
    (factors.filter((factor) => factor.winner !== "neutral").length / factors.length) * 100;

  return Math.round(
    predictionConfidence * weights.predictionConfidenceWeight +
      edgeScore * weights.edgeWeight +
      agreement * weights.inputAgreementWeight +
      winnerGrade * weights.teamGradeWeight,
  );
}

function getRecommendation({
  edgePercent,
  expectedValuePercent,
  grade,
}: {
  edgePercent: number;
  expectedValuePercent: number;
  grade: number;
}): MoneylineRecommendation {
  const thresholds = MONEYLINE_INTELLIGENCE_CONFIG.thresholds;

  if (
    grade >= thresholds.bestBetGrade &&
    edgePercent >= thresholds.bestBetEdge &&
    expectedValuePercent > 0
  ) {
    return "Best Bet";
  }

  if (
    grade >= thresholds.strongGrade &&
    edgePercent >= thresholds.strongEdge &&
    expectedValuePercent > 0
  ) {
    return "Strong Play";
  }

  if (
    grade >= thresholds.playGrade &&
    edgePercent >= thresholds.playEdge &&
    expectedValuePercent > 0
  ) {
    return "Play";
  }

  if (edgePercent >= thresholds.leanEdge) {
    return "Lean";
  }

  return "Pass";
}

function buildReasons({
  away,
  awayMatchup,
  game,
  home,
  homeMatchup,
  selectedSide,
}: {
  away: TeamEvaluation;
  awayMatchup: MatchupIntelligenceResult;
  game: DailySlateGame;
  home: TeamEvaluation;
  homeMatchup: MatchupIntelligenceResult;
  selectedSide: "away" | "home";
}) {
  const winner = selectedSide === "home" ? home : away;
  const loser = selectedSide === "home" ? away : home;
  const winnerMatchup = selectedSide === "home" ? homeMatchup : awayMatchup;
  const reasons: string[] = [];

  if (winner.startingPitchingScore - loser.startingPitchingScore >= 5) reasons.push("Starting pitching advantage");
  if (winner.bullpenScore - loser.bullpenScore >= 5) reasons.push("Superior bullpen depth");
  if (winner.offenseScore - loser.offenseScore >= 5) reasons.push("Better recent offense and lineup quality");
  if (winner.matchupScore - loser.matchupScore >= 5) reasons.push("Lineup matchup advantage");
  if (winnerMatchup.pitchTypeMatch.topAdvantages[0]) reasons.push(winnerMatchup.pitchTypeMatch.topAdvantages[0]);
  if (winnerMatchup.zoneMatch.reasons[0]) reasons.push(winnerMatchup.zoneMatch.reasons[0]);
  if (game.weather.pitchingEnvironment >= 60) reasons.push("Weather suppresses opponent offense");
  if (selectedSide === "home") reasons.push("Home field advantage");

  return reasons.length > 0 ? reasons.slice(0, 7) : ["No major edge; market appears efficient."];
}

function buildSummary({
  edgePercent,
  fairOdds,
  projectedWinner,
  recommendation,
  sportsbookOdds,
  winProbability,
}: {
  edgePercent: number;
  fairOdds: number;
  projectedWinner: Team;
  recommendation: MoneylineRecommendation;
  sportsbookOdds: number;
  winProbability: number;
}) {
  return `${projectedWinner.name} project as the winner at ${formatPercentage(winProbability * 100)} with a TrueLine fair price of ${formatAmericanOdds(fairOdds)} against the market price of ${formatAmericanOdds(sportsbookOdds)}. Edge is ${formatSignedPercent(edgePercent)}, producing a ${recommendation} recommendation.`;
}

function getSportsbookOdds(game: DailySlateGame, side: "away" | "home") {
  const outcome = game.game.odds.moneyline.outcomes?.find((candidate) => candidate.side === side);

  if (outcome) {
    return outcome.price;
  }

  if (side === "away") {
    return game.game.odds.moneyline.price;
  }

  const display = game.game.odds.moneyline.displayLine;
  const match = display.match(/[A-Z]{2,3}\s+([+-]\d+)\s*\/\s*[A-Z]{2,3}\s+([+-]\d+)/);
  const parsed = match ? Number.parseInt(match[2] ?? "", 10) : NaN;

  return Number.isFinite(parsed) ? parsed : game.game.odds.moneyline.price;
}

function gradeToProbability(gradeDifference: number) {
  return clampProbability(0.5 + Math.max(-0.18, Math.min(0.18, gradeDifference / 140)));
}

function platoonScore(team: Team, pitcher: Pitcher) {
  const handedness = team.lineup?.handedness;

  if (!handedness) {
    return 50;
  }

  if (pitcher.throws === "R") {
    return 50 + handedness.left * 2 + handedness.switch - handedness.right * 0.8;
  }

  return 50 + handedness.right * 1.6 + handedness.switch - handedness.left;
}

function trendScore(
  trends: PitcherIntelligence["trends"] | undefined,
  labels: string[],
) {
  if (!trends?.length) {
    return 50;
  }

  const relevant = trends.filter((trend) =>
    labels.some((label) => trend.label.toLowerCase().includes(label.toLowerCase())),
  );

  if (relevant.length === 0) {
    return 50;
  }

  return average(
    relevant.map((trend) =>
      trend.direction === "up"
        ? trend.strength === "strong"
          ? 70
          : 60
        : trend.direction === "down"
          ? 38
          : 50,
    ),
  );
}

function normalizeRange(value: number | null | undefined, low: number, high: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 50;
  }

  return clamp(((value - low) / (high - low)) * 100);
}

function normalizeInverse(value: number | null | undefined, low: number, high: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 50;
  }

  return 100 - normalizeRange(value, low, high);
}

function average(values: Array<number | undefined>) {
  const valid = values.filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  );

  return valid.length === 0
    ? 50
    : valid.reduce((total, value) => total + value, 0) / valid.length;
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function clampProbability(value: number) {
  return Math.min(0.82, Math.max(0.18, value));
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}
