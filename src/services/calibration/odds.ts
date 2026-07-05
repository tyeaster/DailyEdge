export function calculateProfitForOdds(odds: number, stake: number) {
  if (odds > 0) {
    return (odds / 100) * stake;
  }

  return (100 / Math.abs(odds)) * stake;
}

export function getActualProbability(outcome: "win" | "loss" | "push" | "pending") {
  if (outcome === "win") return 1;
  if (outcome === "loss") return 0;
  if (outcome === "push") return 0.5;

  return 0;
}
