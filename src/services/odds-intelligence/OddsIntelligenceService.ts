import { ClosingLineCalculator } from "./ClosingLineCalculator.ts";
import { MarketMovementAnalyzer } from "./MarketMovementAnalyzer.ts";
import { SteamMoveDetector } from "./SteamMoveDetector.ts";
import {
  getConfiguredOddsIntelligenceProvider,
  type OddsIntelligenceProvider,
} from "./providers.ts";
import type {
  OddsClosingRecord,
  OddsHistoryRecord,
  OddsIntelligenceDashboardViewModel,
  OddsMovementViewModel,
} from "./types.ts";

export class OddsIntelligenceService {
  private readonly calculator: ClosingLineCalculator;
  private readonly movementAnalyzer: MarketMovementAnalyzer;
  private readonly provider: OddsIntelligenceProvider;
  private readonly steamDetector: SteamMoveDetector;

  constructor({
    calculator = new ClosingLineCalculator(),
    movementAnalyzer = new MarketMovementAnalyzer(),
    provider = getConfiguredOddsIntelligenceProvider(),
    steamDetector = new SteamMoveDetector(),
  }: {
    calculator?: ClosingLineCalculator;
    movementAnalyzer?: MarketMovementAnalyzer;
    provider?: OddsIntelligenceProvider;
    steamDetector?: SteamMoveDetector;
  } = {}) {
    this.calculator = calculator;
    this.movementAnalyzer = movementAnalyzer;
    this.provider = provider;
    this.steamDetector = steamDetector;
  }

  async getDashboard(): Promise<OddsIntelligenceDashboardViewModel> {
    const response = await this.provider.getHistory();
    const movementHistory = buildMovementHistory({
      calculator: this.calculator,
      closings: response.closings,
      history: response.history,
      movementAnalyzer: this.movementAnalyzer,
      steamDetector: this.steamDetector,
    });
    const sortedByClv = [...movementHistory].sort(
      (left, right) => right.analysis.clvPercent - left.analysis.clvPercent,
    );

    return {
      averageClv: average(movementHistory.map((item) => item.analysis.clvPercent)),
      bestClv: sortedByClv[0],
      fetchedAt: response.fetchedAt,
      marketAgreement: this.movementAnalyzer.calculateMarketAgreement(
        movementHistory.flatMap((item) => item.timeline),
      ),
      mode: response.mode,
      movementHistory,
      provider: response.provider,
      steamAlerts: movementHistory.filter((item) => item.analysis.movementType === "steam-move"),
      worstClv: sortedByClv[sortedByClv.length - 1],
    };
  }
}

export const oddsIntelligenceService = new OddsIntelligenceService();

export function buildMovementHistory({
  calculator,
  closings,
  history,
  movementAnalyzer,
  steamDetector,
}: {
  calculator: ClosingLineCalculator;
  closings: OddsClosingRecord[];
  history: OddsHistoryRecord[];
  movementAnalyzer: MarketMovementAnalyzer;
  steamDetector: SteamMoveDetector;
}): OddsMovementViewModel[] {
  const byPrediction = new Map<string, OddsHistoryRecord[]>();
  const closingByPrediction = new Map(closings.map((closing) => [closing.predictionId, closing]));

  for (const record of history) {
    byPrediction.set(record.predictionId, [...(byPrediction.get(record.predictionId) ?? []), record]);
  }

  return [...byPrediction.entries()].map(([predictionId, records]) => {
    const ordered = [...records].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const openingRecord = ordered[0];
    const currentRecord = ordered[ordered.length - 1];
    const closing = closingByPrediction.get(predictionId);
    const timeline = ordered.map((record) => {
      const openingEdgePercent = calculator.calculateOpeningEdge(record);
      const closingEdgePercent = calculator.calculateClosingEdge(record, closing);
      return {
        closingEdgePercent,
        clvPercent: calculator.calculateClv(record, closing),
        currentOdds: record.currentOdds,
        currentLine: record.currentLine,
        movementPercent: calculator.calculateLineMovementPercent(record.openingOdds, record.currentOdds),
        openingEdgePercent,
        timestamp: record.timestamp,
      };
    });
    const steamAlert = steamDetector.detect(timeline);
    const movementType = movementAnalyzer.classify({
      closing,
      history: ordered,
      steamAlert,
    });
    const analysis = {
      averageClv: average(timeline.map((point) => point.clvPercent ?? 0)),
      closingEdgePercent: calculator.calculateClosingEdge(currentRecord, closing),
      clvPercent: calculator.calculateClv(currentRecord, closing),
      current: timeline[timeline.length - 1],
      expectedClosingEdgePercent: calculator.calculateExpectedClosingEdge(currentRecord, closing),
      marketDriftPercent: calculator.calculateMarketDrift(openingRecord.openingOdds, currentRecord.currentOdds),
      movementGraph: timeline,
      movementType,
      opening: timeline[0],
      predictionId,
      steamAlert,
    };

    return {
      analysis,
      closing,
      market: currentRecord.market,
      predictionId,
      sportsbook: currentRecord.sportsbook,
      timeline,
    };
  });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
