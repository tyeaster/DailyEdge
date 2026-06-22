import type { ValueAssessment, ValueRating } from "@/src/models/mlb";

const MIN_PROBABILITY = 0.001;
const MAX_PROBABILITY = 0.999;

export function americanOddsToImpliedProbability(odds: number) {
  if (odds === 0) {
    return 0.5;
  }

  if (odds > 0) {
    return 100 / (odds + 100);
  }

  return Math.abs(odds) / (Math.abs(odds) + 100);
}

export function impliedProbabilityToAmericanOdds(probability: number) {
  const clampedProbability = clampProbability(probability);

  if (clampedProbability >= 0.5) {
    return Math.round((-100 * clampedProbability) / (1 - clampedProbability));
  }

  return Math.round((100 * (1 - clampedProbability)) / clampedProbability);
}

export function removeVigFromTwoSidedMarket(
  firstOdds: number,
  secondOdds: number,
) {
  const firstImpliedProbability = americanOddsToImpliedProbability(firstOdds);
  const secondImpliedProbability = americanOddsToImpliedProbability(secondOdds);
  const totalImpliedProbability = firstImpliedProbability + secondImpliedProbability;

  return {
    firstProbability: firstImpliedProbability / totalImpliedProbability,
    overround: totalImpliedProbability - 1,
    secondProbability: secondImpliedProbability / totalImpliedProbability,
  };
}

export function calculateFairLine(modelProbability: number) {
  return impliedProbabilityToAmericanOdds(modelProbability);
}

export function calculateEdgePercent(
  modelProbability: number,
  sportsbookImpliedProbability: number,
) {
  return (modelProbability - sportsbookImpliedProbability) * 100;
}

export function formatAmericanOdds(odds: number) {
  if (odds === 0) {
    return "PK";
  }

  return odds > 0 ? `+${odds}` : String(odds);
}

export function formatPercentage(probabilityOrPercent: number) {
  return `${probabilityOrPercent.toFixed(1)}%`;
}

export function buildValueAssessment({
  modelProbability,
  recommendation,
  sportsbookLine,
  sportsbookOdds,
}: {
  modelProbability: number;
  recommendation?: string;
  sportsbookLine: string;
  sportsbookOdds: number;
}): ValueAssessment {
  const sportsbookImpliedProbability =
    americanOddsToImpliedProbability(sportsbookOdds);
  const fairLine = calculateFairLine(modelProbability);
  const edgePercent = calculateEdgePercent(
    modelProbability,
    sportsbookImpliedProbability,
  );
  const valueRating = getValueRating(edgePercent);

  return {
    display: {
      edgePercent: formatPercentage(edgePercent),
      fairLine: formatAmericanOdds(fairLine),
      modelProbability: formatPercentage(modelProbability * 100),
      sportsbookImpliedProbability: formatPercentage(
        sportsbookImpliedProbability * 100,
      ),
    },
    edgePercent,
    fairLine,
    modelProbability,
    recommendation: recommendation ?? getRecommendation(valueRating),
    sportsbookImpliedProbability,
    sportsbookLine,
    valueRating,
  };
}

function getValueRating(edgePercent: number): ValueRating {
  if (edgePercent >= 8) {
    return "Elite";
  }

  if (edgePercent >= 5) {
    return "Strong Play";
  }

  if (edgePercent >= 3) {
    return "Play";
  }

  if (edgePercent > 0) {
    return "Lean";
  }

  return "No Edge";
}

function getRecommendation(valueRating: ValueRating) {
  if (valueRating === "Elite") {
    return "Prioritize";
  }

  if (valueRating === "Strong Play" || valueRating === "Play") {
    return "Bettable";
  }

  if (valueRating === "Lean") {
    return "Watch price";
  }

  return "Pass";
}

function clampProbability(probability: number) {
  return Math.min(MAX_PROBABILITY, Math.max(MIN_PROBABILITY, probability));
}
