export function calculateProfitForAmericanOdds(odds: number, stake: number) {
  if (odds > 0) return (odds / 100) * stake;

  return (100 / Math.abs(odds)) * stake;
}

export function calculateKellyFraction(probability: number, odds: number) {
  const decimalOdds = odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
  const b = decimalOdds - 1;
  const q = 1 - probability;
  const fraction = (b * probability - q) / b;

  return Math.max(0, fraction);
}

export function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));

  return Math.sqrt(variance);
}
