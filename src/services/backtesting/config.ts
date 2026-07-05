import type { BacktestRequest } from "./types.ts";

export const DEFAULT_BACKTEST_REQUEST: BacktestRequest = {
  bankroll: {
    mode: "flat",
    startingBankroll: 1000,
    unitSize: 10,
  },
  settings: {
    maximumBetsPerDay: 10,
    minimumConfidence: 0,
    minimumEdge: 0,
    minimumEv: 0,
  },
};
