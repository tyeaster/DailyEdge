import assert from "node:assert/strict";
import test from "node:test";

import {
  BacktestRunner,
  BacktestService,
  BankrollSimulator,
  MockHistoricalSlateProvider,
  ReplayHistoricalSlateProvider,
  StaticHistoricalSlateProvider,
  StrategyEvaluator,
  buildMockHistoricalSlates,
  calculateStake,
} from "../src/services/backtesting/index.ts";

test("StrategyEvaluator filters by market edge confidence EV sportsbook and max bets", () => {
  const slates = buildMockHistoricalSlates();
  const selected = new StrategyEvaluator().selectBets(slates, {
    market: "strikeouts",
    maximumBetsPerDay: 1,
    minimumConfidence: 70,
    minimumEdge: 5,
    minimumEv: 3,
    sportsbook: "DraftKings",
  });

  assert.equal(selected.length, 1);
  assert.equal(selected[0].prediction.market, "strikeouts");
  assert.ok(selected[0].prediction.edgePercent >= 5);
});

test("BankrollSimulator calculates flat-bet profit and equity", () => {
  const slates = buildMockHistoricalSlates();
  const selections = new StrategyEvaluator().selectBets(slates, {
    maximumBetsPerDay: 10,
  });
  const bets = new BankrollSimulator().simulate(selections, {
    mode: "flat",
    startingBankroll: 1000,
    unitSize: 10,
  });

  assert.ok(bets.length > 0);
  assert.equal(bets[0].stake, 10);
  assert.ok(Number.isFinite(bets[0].profit));
  assert.ok(Number.isFinite(bets[bets.length - 1].equityAfter));
});

test("Kelly and fractional Kelly sizing use model probability and odds", () => {
  const bankroll = 1000;
  const kelly = calculateStake(bankroll, 0.6, 120, {
    kellyPercent: 100,
    mode: "kelly",
    startingBankroll: bankroll,
  });
  const fractional = calculateStake(bankroll, 0.6, 120, {
    fractionalKelly: 0.25,
    mode: "fractional-kelly",
    startingBankroll: bankroll,
  });
  const fixed = calculateStake(bankroll, 0.6, 120, {
    fixedPercent: 2,
    mode: "fixed-percent",
    startingBankroll: bankroll,
  });

  assert.ok(kelly > fractional);
  assert.equal(fixed, 20);
  assert.ok(fractional > 0);
});

test("BacktestRunner generates summary daily breakdown equity and charts", () => {
  const output = new BacktestRunner().run(buildMockHistoricalSlates(), {
    bankroll: {
      mode: "flat",
      startingBankroll: 1000,
      unitSize: 10,
    },
    settings: {
      maximumBetsPerDay: 10,
      minimumEdge: 0,
    },
  });

  assert.ok(output.summary.totalBets > 0);
  assert.ok(Number.isFinite(output.summary.roi));
  assert.ok(Number.isFinite(output.summary.maximumDrawdown));
  assert.ok(output.dailyBreakdown.length > 0);
  assert.equal(output.equityCurve.length, output.betHistory.length);
  assert.ok(output.marketBreakdown.length > 0);
  assert.ok(output.monthlyPerformance.length > 0);
  assert.ok(output.topFilters.length > 0);
  assert.ok(output.worstFilters.length > 0);
});

test("BacktestService supports mock replay and live-normalized providers", async () => {
  const request = {
    bankroll: {
      mode: "flat" as const,
      startingBankroll: 1000,
      unitSize: 10,
    },
    settings: {
      minimumEdge: 0,
    },
  };
  const mock = await new BacktestService({
    provider: new MockHistoricalSlateProvider(),
  }).runBacktest(request);
  const replay = await new BacktestService({
    provider: new ReplayHistoricalSlateProvider(),
  }).runBacktest(request);
  const live = await new BacktestService({
    provider: new StaticHistoricalSlateProvider(buildMockHistoricalSlates()),
  }).runBacktest(request);

  assert.equal(mock.mode, "mock");
  assert.equal(replay.mode, "replay");
  assert.equal(live.mode, "live");
  assert.ok(replay.summary.totalBets > 0);
});

test("date range and odds filters support strategy testing", () => {
  const slates = buildMockHistoricalSlates();
  const underdogs = new StrategyEvaluator().selectBets(slates, {
    dateFrom: "2026-06-21",
    dateTo: "2026-06-22",
    underdogOnly: true,
  });
  const favorites = new StrategyEvaluator().selectBets(slates, {
    favoriteOnly: true,
  });

  assert.ok(underdogs.every((item) => item.date >= "2026-06-21"));
  assert.ok(underdogs.every((item) => item.prediction.odds > 0));
  assert.ok(favorites.every((item) => item.prediction.odds < 0));
});
