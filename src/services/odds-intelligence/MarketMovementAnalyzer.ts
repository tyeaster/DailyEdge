import type { OddsClosingRecord, OddsHistoryRecord, MovementType, OddsTimelinePoint } from "./types.ts";

export class MarketMovementAnalyzer {
  classify({
    closing,
    history,
    steamAlert,
  }: {
    closing?: OddsClosingRecord;
    history: OddsHistoryRecord[];
    steamAlert?: string;
  }): MovementType {
    const first = history[0];
    const last = history[history.length - 1];

    if (steamAlert) return "steam-move";
    if (!first || !last) return "market-stable";
    if (last.currentOdds < first.openingOdds && last.probability < first.probability) {
      return "reverse-line-movement";
    }
    if (closing && Math.abs(closing.closingOdds - last.currentOdds) >= 25) {
      return "late-injury-movement";
    }
    if (last.currentOdds < first.openingOdds && last.probability >= first.probability) {
      return "sharp-agreement";
    }
    if (last.currentOdds > first.openingOdds && last.probability >= first.probability) {
      return "sharp-disagreement";
    }

    return "market-stable";
  }

  calculateMarketAgreement(points: OddsTimelinePoint[]) {
    if (points.length === 0) return 0;
    const agreeing = points.filter((point) => point.closingEdgePercent !== undefined && point.closingEdgePercent >= 0);

    return (agreeing.length / points.length) * 100;
  }
}
