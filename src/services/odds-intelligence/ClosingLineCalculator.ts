import { americanOddsToImpliedProbability } from "../../lib/odds.ts";
import type { OddsClosingRecord, OddsHistoryRecord } from "./types.ts";

export class ClosingLineCalculator {
  calculateClv(opening: OddsHistoryRecord, closing?: OddsClosingRecord) {
    if (!closing) return 0;

    return impliedPercent(opening.currentOdds) - impliedPercent(closing.closingOdds);
  }

  calculateOpeningEdge(record: OddsHistoryRecord) {
    return record.probability * 100 - impliedPercent(record.openingOdds);
  }

  calculateClosingEdge(record: OddsHistoryRecord, closing?: OddsClosingRecord) {
    const odds = closing?.closingOdds ?? record.currentOdds;

    return record.probability * 100 - impliedPercent(odds);
  }

  calculateMarketDrift(openingOdds: number, currentOdds: number) {
    return impliedPercent(currentOdds) - impliedPercent(openingOdds);
  }

  calculateLineMovementPercent(openingOdds: number, currentOdds: number) {
    const opening = Math.abs(openingOdds);
    if (opening === 0) return 0;

    return ((currentOdds - openingOdds) / opening) * 100;
  }

  calculateExpectedClosingEdge(record: OddsHistoryRecord, closing?: OddsClosingRecord) {
    const closingEdge = this.calculateClosingEdge(record, closing);
    const openingEdge = this.calculateOpeningEdge(record);

    return (closingEdge + openingEdge) / 2;
  }
}

function impliedPercent(odds: number) {
  return americanOddsToImpliedProbability(odds) * 100;
}
