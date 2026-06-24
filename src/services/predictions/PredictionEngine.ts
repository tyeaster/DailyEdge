import {
  americanOddsToImpliedProbability,
  calculateEdgePercent,
  calculateFairLine,
  formatAmericanOdds,
} from "../../lib/odds.ts";
import type {
  BetRecommendation,
  ConfidenceScore,
  DataQuality,
  DataQualityInput,
  EdgeScore,
  Game,
  ModelBreakdown,
  ModelFactorKey,
  Pitcher,
  Prediction,
  PredictionRecommendation,
  PredictionResult,
  Team,
} from "../../models/mlb.ts";

import { PREDICTION_ENGINE_V1_CONFIG } from "./config.ts";

export type PredictionEngineGameInput = {
  awayPitcher?: Pitcher;
  awayTeam: Team;
  game: Game;
  homePitcher?: Pitcher;
  homeTeam: Team;
};

export type PredictionEngineInput = {
  games: Game[];
  pitcherById: Record<string, Pitcher>;
  teamById: Record<string, Team>;
};

export type PredictionModelFactors = {
  bullpen: number;
  homeField: number;
  recentForm: number;
  sportsbookMarket: number;
  startingPitcher: number;
  teamOffense: number;
  teamPitching: number;
};

type FactorAvailability = Record<ModelFactorKey, boolean>;

export class PredictionEngine {
  predictSlate({ games, pitcherById, teamById }: PredictionEngineInput) {
    return games.flatMap((game) => {
      const awayTeam = teamById[game.awayTeamId];
      const homeTeam = teamById[game.homeTeamId];

      if (!awayTeam || !homeTeam) {
        return [];
      }

      return [
        this.predictGame({
          awayPitcher: pitcherById[game.awayPitcherId],
          awayTeam,
          game,
          homePitcher: pitcherById[game.homePitcherId],
          homeTeam,
        }),
      ];
    });
  }

  predictGame({
    awayPitcher,
    awayTeam,
    game,
    homePitcher,
    homeTeam,
  }: PredictionEngineGameInput): PredictionResult {
    const factors = buildFactors({
      awayPitcher,
      awayTeam,
      game,
      homePitcher,
      homeTeam,
    });
    const factorAvailability = getFactorAvailability({
      awayPitcher,
      awayTeam,
      game,
      homePitcher,
      homeTeam,
    });
    const modelBreakdown = calculateModelBreakdown(
      factors,
      factorAvailability,
    );
    const dataQuality = calculateDataQuality({
      awayPitcher,
      awayTeam,
      game,
      homePitcher,
      homeTeam,
    });
    const homeWinProbability = clampProbability(weightFactors(factors));
    const awayWinProbability = 1 - homeWinProbability;
    const predictedHomeWinner = homeWinProbability >= awayWinProbability;
    const predictedWinnerTeamId = predictedHomeWinner ? homeTeam.id : awayTeam.id;
    const sportsbookHomeProbability = getSportsbookHomeProbability(game);
    const sportsbookAwayProbability =
      getMoneylineOutcome(game, "away")?.impliedProbability ??
      1 - sportsbookHomeProbability;
    const homeEdgePercent = calculateEdgePercent(
      homeWinProbability,
      sportsbookHomeProbability,
    );
    const awayEdgePercent = calculateEdgePercent(
      awayWinProbability,
      sportsbookAwayProbability,
    );
    const selectHomeSide = homeEdgePercent >= awayEdgePercent;
    const selectedTeamId = selectHomeSide ? homeTeam.id : awayTeam.id;
    const selectedWinProbability = selectHomeSide
      ? homeWinProbability
      : awayWinProbability;
    const impliedSportsbookProbability = selectHomeSide
      ? sportsbookHomeProbability
      : sportsbookAwayProbability;
    const selectedOutcome = getMoneylineOutcome(
      game,
      selectHomeSide ? "home" : "away",
    );
    const sportsbookMoneyline = getSelectedSportsbookMoneyline({
      game,
      selectHomeSide,
      sportsbookAwayProbability,
    });
    const edgePercent = selectHomeSide ? homeEdgePercent : awayEdgePercent;
    const expectedValuePercent = calculateExpectedValuePercent(
      selectedWinProbability,
      sportsbookMoneyline,
    );
    const confidenceScore = calculateConfidence({
      edgePercent,
      factors,
      homeWinProbability,
      dataQualityScore: dataQuality.score,
    });
    const recommendation = getRecommendation({
      confidenceScore,
      edgePercent,
      expectedValuePercent,
    });
    const projectedTotalRuns = getProjectedTotalRuns(game);
    const homeProjectedRuns = roundToTenth(projectedTotalRuns * homeWinProbability);
    const awayProjectedRuns = roundToTenth(projectedTotalRuns - homeProjectedRuns);
    const homeFairMoneyline = calculateFairLine(homeWinProbability);
    const awayFairMoneyline = calculateFairLine(awayWinProbability);

    return {
      awayFairMoneyline,
      awayProjectedRuns,
      awayWinProbability,
      confidenceScore,
      dataQuality,
      edgePercent: roundToTenth(edgePercent),
      expectedValuePercent: roundToTenth(expectedValuePercent),
      explanations: buildExplanations({
        awayPitcher,
        awayTeam,
        factorAvailability,
        factors,
        homePitcher,
        homeTeam,
        selectHomeSide,
      }),
      gameId: game.id,
      homeFairMoneyline,
      homeProjectedRuns,
      homeWinProbability,
      impliedSportsbookProbability,
      modelBreakdown,
      predictedWinnerTeamId,
      predictionVersion: PREDICTION_ENGINE_V1_CONFIG.version,
      projectedTotalRuns,
      recommendation,
      selectedFairMoneyline: selectHomeSide
        ? homeFairMoneyline
        : awayFairMoneyline,
      selectedTeamId,
      selectedWinProbability,
      sportsbook: selectedOutcome?.sportsbook ?? game.odds.moneyline.sportsbook,
      sportsbookLine: game.odds.moneyline.displayLine,
      sportsbookMoneyline,
      sportsbookUpdatedAt:
        selectedOutcome?.updatedAt ?? game.odds.moneyline.updatedAt,
    };
  }
}

export const predictionEngine = new PredictionEngine();

export function calculateExpectedValuePercent(
  modelProbability: number,
  americanOdds: number,
) {
  if (americanOdds === 0) {
    return 0;
  }

  // Expected value per one unit risked:
  // EV = (win probability * profit if won) - (loss probability * 1 unit).
  const profitPerUnit =
    americanOdds > 0 ? americanOdds / 100 : 100 / Math.abs(americanOdds);

  return (
    (modelProbability * profitPerUnit - (1 - modelProbability)) *
    100
  );
}

export function calculateConfidence({
  dataQualityScore = 100,
  edgePercent,
  factors,
  homeWinProbability,
}: {
  dataQualityScore?: number;
  edgePercent: number;
  factors: PredictionModelFactors;
  homeWinProbability: number;
}) {
  const clarity = Math.min(1, Math.abs(homeWinProbability - 0.5) / 0.2);
  const edgeStrength = Math.min(1, Math.max(0, edgePercent) / 10);
  const factorDirections = Object.values(factors).flatMap((factor) => {
    if (Math.abs(factor - 0.5) < 0.02) {
      return [];
    }

    return [factor > 0.5 ? 1 : -1];
  });
  const positiveFactors = factorDirections.filter((direction) => direction > 0).length;
  const negativeFactors = factorDirections.filter((direction) => direction < 0).length;
  const agreement =
    factorDirections.length === 0
      ? 0
      : Math.abs(positiveFactors - negativeFactors) / factorDirections.length;
  const config = PREDICTION_ENGINE_V1_CONFIG.confidence;

  const rawConfidence = Math.min(
    100,
    config.base +
      clarity * config.clarityWeight +
      edgeStrength * config.edgeWeight +
      agreement * config.agreementWeight,
  );

  // Confidence can never exceed the completeness of the inputs supporting it.
  return Math.round(Math.min(rawConfidence, clampScore(dataQualityScore)));
}

export function getRecommendation({
  confidenceScore,
  edgePercent,
  expectedValuePercent,
}: {
  confidenceScore: number;
  edgePercent: number;
  expectedValuePercent: number;
}): PredictionRecommendation {
  for (const threshold of PREDICTION_ENGINE_V1_CONFIG.recommendationThresholds) {
    if (
      edgePercent >= threshold.minimumEdgePercent &&
      expectedValuePercent >= threshold.minimumExpectedValuePercent &&
      confidenceScore >= threshold.minimumConfidence
    ) {
      return threshold.recommendation;
    }
  }

  return "Pass";
}

export function applyPredictionsToGames({
  games,
  predictions,
}: {
  games: Game[];
  predictions: PredictionResult[];
}) {
  const predictionByGameId = Object.fromEntries(
    predictions.map((prediction) => [prediction.gameId, prediction]),
  );

  return games.map((game) => {
    const prediction = predictionByGameId[game.id];

    if (!prediction) {
      return game;
    }

    return {
      ...game,
      confidence: toConfidenceScore(prediction.confidenceScore),
      detail: prediction.explanations.join(". "),
      modelProbability: prediction.selectedWinProbability,
      prediction,
    };
  });
}

export function buildPredictionRecommendations({
  games,
  predictions,
  teamById,
}: {
  games: Game[];
  predictions: PredictionResult[];
  teamById: Record<string, Team>;
}): BetRecommendation[] {
  const gameById = Object.fromEntries(games.map((game) => [game.id, game]));
  const recommendations: BetRecommendation[] = [];

  for (const result of predictions) {
    const game = gameById[result.gameId];
    const team = teamById[result.selectedTeamId];

    if (!game || !team) {
      continue;
    }

    const confidence = toConfidenceScore(result.confidenceScore);
    const edge = buildEdgeScore(result.edgePercent);
    const prediction: Prediction = {
      confidence,
      edge,
      gameId: game.id,
      id: `prediction-${game.id}-${team.id}-moneyline`,
      market: "moneyline",
      projection: formatAmericanOdds(result.selectedFairMoneyline),
      reasoning: result.explanations.join(". "),
      teamId: team.id,
    };

    recommendations.push({
      confidence,
      edge,
      gameId: game.id,
      id: `bet-${game.id}-${team.id}-moneyline`,
      modelProbability: result.selectedWinProbability,
      odds: {
        ...game.odds.moneyline,
        price: result.sportsbookMoneyline,
      },
      prediction,
      rank: 0,
      recommendedUnits: getRecommendedUnits(result.recommendation),
      selection: `${team.abbreviation} moneyline`,
      teamId: team.id,
    });
  }

  return recommendations
    .sort((left, right) => right.edge.percentage - left.edge.percentage)
    .map((bet, index) => ({
      ...bet,
      rank: index + 1,
    }));
}

function buildFactors({
  awayPitcher,
  awayTeam,
  game,
  homePitcher,
  homeTeam,
}: PredictionEngineGameInput): PredictionModelFactors {
  return {
    bullpen: getTeamRatingHomeProbability(
      homeTeam.strength?.bullpen.value,
      awayTeam.strength?.bullpen.value,
    ),
    homeField: PREDICTION_ENGINE_V1_CONFIG.homeFieldWinProbability,
    recentForm: 0.5,
    sportsbookMarket: getSportsbookHomeProbability(game),
    startingPitcher: getStartingPitcherHomeProbability(
      homePitcher,
      awayPitcher,
    ),
    teamOffense: getTeamRatingHomeProbability(
      homeTeam.strength?.offense.value,
      awayTeam.strength?.offense.value,
    ),
    teamPitching: getTeamRatingHomeProbability(
      homeTeam.strength?.pitching.value,
      awayTeam.strength?.pitching.value,
    ),
  };
}

function weightFactors(factors: PredictionModelFactors) {
  const weights = PREDICTION_ENGINE_V1_CONFIG.weights;
  const totalWeight = Object.values(weights).reduce<number>(
    (total, weight) => total + weight,
    0,
  );

  return (
    (factors.startingPitcher * weights.startingPitcher +
      factors.teamOffense * weights.teamOffense +
      factors.teamPitching * weights.teamPitching +
      factors.bullpen * weights.bullpen +
      factors.homeField * weights.homeField +
      factors.sportsbookMarket * weights.sportsbookMarket +
      factors.recentForm * weights.recentForm) /
    totalWeight
  );
}

export function calculateModelBreakdown(
  factors: PredictionModelFactors,
  availability: FactorAvailability = getDefaultFactorAvailability(),
): ModelBreakdown {
  const weights = PREDICTION_ENGINE_V1_CONFIG.weights;
  const labels = PREDICTION_ENGINE_V1_CONFIG.factorLabels;
  const totalWeight = Object.values(weights).reduce<number>(
    (total, weight) => total + weight,
    0,
  );
  const factorKeys = Object.keys(weights) as ModelFactorKey[];
  const breakdownFactors = Object.fromEntries(
    factorKeys.map((key) => {
      const contributionPercent = availability[key]
        ? roundToTenth(
            ((factors[key] - 0.5) * weights[key] * 100) / totalWeight,
          )
        : 0;

      return [
        key,
        {
          available: availability[key],
          contributionPercent,
          label: labels[key],
          probability: factors[key],
          weight: weights[key],
        },
      ];
    }),
  ) as ModelBreakdown["factors"];

  return {
    factors: breakdownFactors,
    totalContributionPercent: roundToTenth(
      Object.values(breakdownFactors).reduce(
        (total, factor) => total + factor.contributionPercent,
        0,
      ),
    ),
  };
}

export function calculateDataQuality({
  awayPitcher,
  awayTeam,
  game,
  homePitcher,
  homeTeam,
}: PredictionEngineGameInput): DataQuality {
  const weights = PREDICTION_ENGINE_V1_CONFIG.dataQuality.weights;
  const inputs = {
    bullpen: buildQualityInput({
      label: "Bullpen",
      scores: [
        getAvailabilityScore(homeTeam.strength?.bullpen.available),
        getAvailabilityScore(awayTeam.strength?.bullpen.available),
      ],
      source: getTeamStrengthSource(homeTeam, awayTeam),
      weight: weights.bullpen,
    }),
    pitchers: buildQualityInput({
      label: "Starting Pitchers",
      scores: [
        getAvailabilityScore(hasPitcherMetrics(homePitcher)),
        getAvailabilityScore(hasPitcherMetrics(awayPitcher)),
      ],
      source: getPitcherSource(homePitcher, awayPitcher),
      weight: weights.pitchers,
    }),
    recentForm: buildQualityInput({
      label: "Recent Form",
      scores: [0],
      source: "not connected",
      weight: weights.recentForm,
    }),
    sportsbook: buildQualityInput({
      label: "Sportsbook Market",
      scores: [getAvailabilityScore(hasSportsbookMoneyline(game))],
      source: game.odds.moneyline.sportsbook || "unavailable",
      weight: weights.sportsbook,
    }),
    teamStats: buildQualityInput({
      label: "Team Stats",
      scores: [
        getTeamStatsAvailabilityScore(homeTeam),
        getTeamStatsAvailabilityScore(awayTeam),
      ],
      source: getTeamStrengthSource(homeTeam, awayTeam),
      weight: weights.teamStats,
    }),
    weather: buildQualityInput({
      label: "Weather",
      scores: [0],
      source: "not connected",
      weight: weights.weather,
    }),
  } satisfies DataQuality["inputs"];
  const totalWeight = Object.values(inputs).reduce(
    (total, input) => total + input.weight,
    0,
  );
  const score =
    totalWeight === 0
      ? 0
      : Object.values(inputs).reduce(
          (total, input) => total + input.score * input.weight,
          0,
        ) / totalWeight;

  return {
    inputs,
    missingInputs: Object.values(inputs)
      .filter((input) => input.status !== "available")
      .map((input) => input.label),
    score: Math.round(score),
  };
}

function getStartingPitcherHomeProbability(
  homePitcher: Pitcher | undefined,
  awayPitcher: Pitcher | undefined,
) {
  const homeScore = getPitcherScore(homePitcher);
  const awayScore = getPitcherScore(awayPitcher);

  return clamp01(0.5 + (homeScore - awayScore) * 0.25);
}

function getPitcherScore(pitcher: Pitcher | undefined) {
  if (!isKnownStarter(pitcher)) {
    return 0.5;
  }

  const availableScores: number[] = [];

  if (pitcher.era > 0) {
    availableScores.push(clamp01((5 - pitcher.era) / 3));
  }

  if (pitcher.whip > 0) {
    availableScores.push(clamp01((1.5 - pitcher.whip) / 0.7));
  }

  if (pitcher.strikeoutRate > 0) {
    availableScores.push(clamp01((pitcher.strikeoutRate - 15) / 20));
  }

  if (availableScores.length === 0) {
    return 0.5;
  }

  return (
    availableScores.reduce((total, score) => total + score, 0) /
    availableScores.length
  );
}

function getTeamRatingHomeProbability(
  homeRating: number | undefined,
  awayRating: number | undefined,
) {
  const normalizedHomeRating = homeRating ?? 50;
  const normalizedAwayRating = awayRating ?? 50;
  const combined = normalizedHomeRating + normalizedAwayRating;

  return combined > 0 ? normalizedHomeRating / combined : 0.5;
}

function getSportsbookHomeProbability(game: Game) {
  const homeOutcome = getMoneylineOutcome(game, "home");

  if (homeOutcome) {
    return homeOutcome.impliedProbability;
  }

  if (game.odds.moneyline.price === 0) {
    return 0.5;
  }

  return (
    game.odds.moneyline.impliedProbability ??
    americanOddsToImpliedProbability(game.odds.moneyline.price)
  );
}

function getSelectedSportsbookMoneyline({
  game,
  selectHomeSide,
  sportsbookAwayProbability,
}: {
  game: Game;
  selectHomeSide: boolean;
  sportsbookAwayProbability: number;
}) {
  const selectedOutcome = getMoneylineOutcome(
    game,
    selectHomeSide ? "home" : "away",
  );

  if (selectedOutcome) {
    return selectedOutcome.price;
  }

  if (selectHomeSide || game.odds.moneyline.price === 0) {
    return game.odds.moneyline.price;
  }

  return calculateFairLine(sportsbookAwayProbability);
}

function getMoneylineOutcome(game: Game, side: "away" | "home") {
  return game.odds.moneyline.outcomes?.find((outcome) => outcome.side === side);
}

function getProjectedTotalRuns(game: Game) {
  return roundToTenth(
    game.odds.total.line > 0
      ? game.odds.total.line
      : PREDICTION_ENGINE_V1_CONFIG.neutralProjectedRuns,
  );
}

function buildExplanations({
  awayPitcher,
  awayTeam,
  factorAvailability,
  factors,
  homePitcher,
  homeTeam,
  selectHomeSide,
}: {
  awayPitcher?: Pitcher;
  awayTeam: Team;
  factorAvailability: FactorAvailability;
  factors: PredictionModelFactors;
  homePitcher?: Pitcher;
  homeTeam: Team;
  selectHomeSide: boolean;
}) {
  const selectedTeam = selectHomeSide ? homeTeam : awayTeam;
  const explanations: string[] = [];

  if (
    factorAvailability.startingPitcher &&
    Math.abs(factors.startingPitcher - 0.5) >= 0.02
  ) {
    explanations.push(
      factors.startingPitcher > 0.5
        ? `Better Starting Pitcher: ${homePitcher?.fullName ?? homeTeam.abbreviation}`
        : `Better Starting Pitcher: ${awayPitcher?.fullName ?? awayTeam.abbreviation}`,
    );
  }

  if (
    factorAvailability.teamOffense &&
    Math.abs(factors.teamOffense - 0.5) >= 0.02
  ) {
    explanations.push(
      factors.teamOffense > 0.5
        ? `Better Team Offense: ${homeTeam.abbreviation}`
        : `Better Team Offense: ${awayTeam.abbreviation}`,
    );
  }

  if (
    factorAvailability.teamPitching &&
    Math.abs(factors.teamPitching - 0.5) >= 0.02
  ) {
    explanations.push(
      factors.teamPitching > 0.5
        ? `Better Team Pitching: ${homeTeam.abbreviation}`
        : `Better Team Pitching: ${awayTeam.abbreviation}`,
    );
  }

  if (
    factorAvailability.bullpen &&
    Math.abs(factors.bullpen - 0.5) >= 0.02
  ) {
    explanations.push(
      factors.bullpen > 0.5
        ? `Better Bullpen: ${homeTeam.abbreviation}`
        : `Better Bullpen: ${awayTeam.abbreviation}`,
    );
  }

  const runDifferentialDifference =
    (homeTeam.strength?.overall.runDifferential ?? 0) -
    (awayTeam.strength?.overall.runDifferential ?? 0);
  if (
    homeTeam.strength?.overall.available &&
    awayTeam.strength?.overall.available &&
    Math.abs(runDifferentialDifference) >= 10
  ) {
    explanations.push(
      runDifferentialDifference > 0
        ? `Better Run Differential: ${homeTeam.abbreviation}`
        : `Better Run Differential: ${awayTeam.abbreviation}`,
    );
  }

  const overallDifference =
    (homeTeam.strength?.overall.value ?? 50) -
    (awayTeam.strength?.overall.value ?? 50);
  if (
    homeTeam.strength?.overall.available &&
    awayTeam.strength?.overall.available &&
    Math.abs(overallDifference) >= 3
  ) {
    explanations.push(
      overallDifference > 0
        ? `Better Overall Rating: ${homeTeam.abbreviation}`
        : `Better Overall Rating: ${awayTeam.abbreviation}`,
    );
  }

  if (factorAvailability.homeField) {
    explanations.push(`Strong Home Field Advantage: ${homeTeam.abbreviation}`);
  }

  if (
    factorAvailability.sportsbookMarket &&
    Math.abs(factors.sportsbookMarket - 0.5) >= 0.02
  ) {
    explanations.push("Sportsbook Market provides a low-weight reference");
  }

  explanations.push(`Value side: ${selectedTeam.abbreviation}`);

  return explanations;
}

function buildEdgeScore(edgePercent: number): EdgeScore {
  const percentage = roundToTenth(edgePercent);

  if (percentage >= 8) {
    return { percentage, rating: "S" };
  }

  if (percentage >= 5) {
    return { percentage, rating: "A" };
  }

  if (percentage >= 3) {
    return { percentage, rating: "B" };
  }

  return { percentage, rating: "C" };
}

function toConfidenceScore(value: number): ConfidenceScore {
  if (value >= 82) {
    return { label: "Elite", value };
  }

  if (value >= 72) {
    return { label: "High", value };
  }

  if (value >= 58) {
    return { label: "Medium", value };
  }

  return { label: "Low", value };
}

function getRecommendedUnits(recommendation: PredictionRecommendation) {
  if (recommendation === "Best Bet") {
    return 1.5;
  }

  if (recommendation === "Strong Play") {
    return 1;
  }

  if (recommendation === "Play") {
    return 0.75;
  }

  if (recommendation === "Lean") {
    return 0.25;
  }

  return 0;
}

function isKnownStarter(pitcher: Pitcher | undefined): pitcher is Pitcher {
  return Boolean(pitcher && pitcher.fullName !== "Probable starter TBD");
}

function getFactorAvailability({
  awayPitcher,
  awayTeam,
  game,
  homePitcher,
  homeTeam,
}: PredictionEngineGameInput): FactorAvailability {
  return {
    bullpen: Boolean(
      homeTeam.strength?.bullpen.available &&
        awayTeam.strength?.bullpen.available,
    ),
    homeField: true,
    recentForm: false,
    sportsbookMarket: hasSportsbookMoneyline(game),
    startingPitcher: Boolean(
      hasPitcherMetrics(homePitcher) && hasPitcherMetrics(awayPitcher),
    ),
    teamOffense: Boolean(
      homeTeam.strength?.offense.available &&
        awayTeam.strength?.offense.available,
    ),
    teamPitching: Boolean(
      homeTeam.strength?.pitching.available &&
        awayTeam.strength?.pitching.available,
    ),
  };
}

function getDefaultFactorAvailability(): FactorAvailability {
  return {
    bullpen: true,
    homeField: true,
    recentForm: false,
    sportsbookMarket: true,
    startingPitcher: true,
    teamOffense: true,
    teamPitching: true,
  };
}

function hasPitcherMetrics(pitcher: Pitcher | undefined) {
  return Boolean(
    isKnownStarter(pitcher) &&
      (pitcher.era > 0 || pitcher.whip > 0 || pitcher.strikeoutRate > 0),
  );
}

function hasSportsbookMoneyline(game: Game) {
  return Boolean(
    game.odds.moneyline.price !== 0 ||
      game.odds.moneyline.outcomes?.some(
        (outcome) => outcome.side === "home" || outcome.side === "away",
      ),
  );
}

function getTeamStatsAvailabilityScore(team: Team) {
  const availableSections = [
    team.strength?.offense.available,
    team.strength?.pitching.available,
    team.strength?.overall.available,
  ].filter(Boolean).length;

  return (availableSections / 3) * 100;
}

function getAvailabilityScore(available: boolean | undefined) {
  return available ? 100 : 0;
}

function buildQualityInput({
  label,
  scores,
  source,
  weight,
}: {
  label: string;
  scores: number[];
  source: string;
  weight: number;
}): DataQualityInput {
  const score =
    scores.length === 0
      ? 0
      : scores.reduce((total, value) => total + value, 0) / scores.length;

  return {
    label,
    score: Math.round(score),
    source,
    status: score >= 100 ? "available" : score > 0 ? "partial" : "missing",
    weight,
  };
}

function getPitcherSource(
  homePitcher: Pitcher | undefined,
  awayPitcher: Pitcher | undefined,
) {
  return joinSources([
    homePitcher?.statsSource,
    awayPitcher?.statsSource,
  ]);
}

function getTeamStrengthSource(homeTeam: Team, awayTeam: Team) {
  return joinSources([homeTeam.strength?.source, awayTeam.strength?.source]);
}

function joinSources(sources: Array<string | undefined>) {
  const availableSources = [...new Set(sources.filter(Boolean))] as string[];

  return availableSources.length > 0
    ? availableSources.join(", ")
    : "unavailable";
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, score));
}

function clampProbability(probability: number) {
  const bounds = PREDICTION_ENGINE_V1_CONFIG.probabilityBounds;

  return Math.min(bounds.maximum, Math.max(bounds.minimum, probability));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}
