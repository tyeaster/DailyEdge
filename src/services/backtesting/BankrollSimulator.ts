import { calculateKellyFraction, calculateProfitForAmericanOdds } from "./math.ts";
import type {
  BacktestBet,
  BankrollSettings,
  HistoricalSlate,
} from "./types.ts";

export class BankrollSimulator {
  simulate(
    selections: Array<{
      date: string;
      prediction: HistoricalSlate["calibrationRecords"]["predictions"][number];
      result: HistoricalSlate["calibrationRecords"]["results"][number];
    }>,
    settings: BankrollSettings,
  ): BacktestBet[] {
    let bankroll = settings.startingBankroll;

    return selections.map(({ date, prediction, result }) => {
      const stake = calculateStake(bankroll, prediction.modelProbability, prediction.odds, settings);
      const outcome = result.outcome === "pending" ? "loss" : result.outcome;
      const profit = calculateProfit(outcome, prediction.odds, stake);
      const unitsWon = settings.unitSize ? profit / settings.unitSize : profit / stake;
      bankroll += profit;

      return {
        closingEdgePercent: result.closingEdgePercent,
        confidence: prediction.confidence,
        date,
        edgePercent: prediction.edgePercent,
        equityAfter: bankroll,
        expectedValuePercent: prediction.expectedValuePercent,
        gameId: prediction.gameId,
        market: prediction.market,
        modelProbability: prediction.modelProbability,
        odds: prediction.odds,
        outcome,
        playerId: prediction.playerId,
        predictionId: prediction.predictionId,
        profit,
        resultRecordedAt: result.recordedAt,
        sportsbook: prediction.sportsbook,
        stake,
        teamId: prediction.teamId,
        unitsWon,
      };
    });
  }
}

export function calculateStake(
  bankroll: number,
  modelProbability: number,
  odds: number,
  settings: BankrollSettings,
) {
  if (settings.mode === "custom-stake") return settings.customStake ?? settings.unitSize ?? 1;
  if (settings.mode === "fixed-percent") return bankroll * ((settings.fixedPercent ?? 1) / 100);
  if (settings.mode === "kelly") {
    return bankroll * calculateKellyFraction(modelProbability, odds) * ((settings.kellyPercent ?? 100) / 100);
  }
  if (settings.mode === "fractional-kelly") {
    return bankroll * calculateKellyFraction(modelProbability, odds) * (settings.fractionalKelly ?? 0.25);
  }

  return settings.unitSize ?? 1;
}

function calculateProfit(outcome: BacktestBet["outcome"], odds: number, stake: number) {
  if (outcome === "push") return 0;
  if (outcome === "win") return calculateProfitForAmericanOdds(odds, stake);

  return -stake;
}
