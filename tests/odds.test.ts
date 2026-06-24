import assert from "node:assert/strict";
import test from "node:test";

import {
  americanOddsToImpliedProbability,
  buildValueAssessment,
  calculateEdgePercent,
  impliedProbabilityToAmericanOdds,
  removeVigFromTwoSidedMarket,
} from "../src/lib/odds.ts";

test("converts American odds to implied probability", () => {
  assert.equal(americanOddsToImpliedProbability(100), 0.5);
  assert.equal(americanOddsToImpliedProbability(-100), 0.5);
  assert.equal(Number(americanOddsToImpliedProbability(-150).toFixed(4)), 0.6);
  assert.equal(Number(americanOddsToImpliedProbability(200).toFixed(4)), 0.3333);
});

test("converts implied probability to American odds", () => {
  assert.equal(impliedProbabilityToAmericanOdds(0.5), -100);
  assert.equal(impliedProbabilityToAmericanOdds(0.6), -150);
  assert.equal(impliedProbabilityToAmericanOdds(0.3333), 200);
});

test("removes vig from two-sided markets", () => {
  const market = removeVigFromTwoSidedMarket(-110, -110);

  assert.equal(Number(market.firstProbability.toFixed(4)), 0.5);
  assert.equal(Number(market.secondProbability.toFixed(4)), 0.5);
  assert.equal(Number(market.overround.toFixed(4)), 0.0476);
});

test("calculates edge between model probability and sportsbook probability", () => {
  assert.equal(Number(calculateEdgePercent(0.56, 0.5).toFixed(1)), 6);
});

test("builds value assessments without mixing confidence and sportsbook odds", () => {
  const assessment = buildValueAssessment({
    modelProbability: 0.56,
    sportsbookLine: "+100",
    sportsbookOdds: 100,
  });

  assert.equal(assessment.sportsbookImpliedProbability, 0.5);
  assert.equal(Number(assessment.edgePercent.toFixed(1)), 6);
  assert.equal(assessment.valueRating, "Strong Play");
});
