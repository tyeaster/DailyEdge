import { betRecommendations, games } from "../../../mock/index.ts";
import { americanOddsToImpliedProbability } from "../../lib/odds.ts";

import type {
  NormalizedOddsRecord,
  OddsProvider,
  OddsProviderRequest,
  OddsProviderResponse,
} from "./OddsProvider";

export class MockOddsProvider implements OddsProvider {
  readonly id = "mock";

  async getOdds(request: OddsProviderRequest): Promise<OddsProviderResponse> {
    const now = new Date().toISOString();
    const gameOdds: NormalizedOddsRecord[] = games.flatMap((game) => [
      {
        americanOdds: game.odds.moneyline.price,
        eventId: game.id,
        id: `${game.odds.moneyline.id}-mock`,
        impliedProbability: americanOddsToImpliedProbability(game.odds.moneyline.price),
        line: game.odds.moneyline.line,
        market: game.odds.moneyline.market,
        selection: game.odds.moneyline.displayLine,
        sportsbook: game.odds.moneyline.sportsbook,
        updatedAt: now,
      },
      {
        americanOdds: game.odds.spread.price,
        eventId: game.id,
        id: `${game.odds.spread.id}-mock`,
        impliedProbability: americanOddsToImpliedProbability(game.odds.spread.price),
        line: game.odds.spread.line,
        market: game.odds.spread.market,
        selection: game.odds.spread.displayLine,
        sportsbook: game.odds.spread.sportsbook,
        updatedAt: now,
      },
      {
        americanOdds: game.odds.total.price,
        eventId: game.id,
        id: `${game.odds.total.id}-mock`,
        impliedProbability: americanOddsToImpliedProbability(game.odds.total.price),
        line: game.odds.total.line,
        market: game.odds.total.market,
        selection: game.odds.total.displayLine,
        sportsbook: game.odds.total.sportsbook,
        updatedAt: now,
      },
    ]);
    const betOdds: NormalizedOddsRecord[] = betRecommendations.map((bet) => ({
      americanOdds: bet.odds.price,
      eventId: bet.gameId,
      id: `${bet.odds.id}-mock`,
      impliedProbability: americanOddsToImpliedProbability(bet.odds.price),
      line: bet.odds.line,
      market: bet.odds.market,
      selection: bet.selection,
      sportsbook: bet.odds.sportsbook,
      updatedAt: now,
    }));
    const records = [...gameOdds, ...betOdds].filter((record) => {
      const matchesEvent =
        !request.eventIds?.length || request.eventIds.includes(record.eventId ?? "");
      const matchesMarket =
        !request.markets?.length || request.markets.includes(record.market);

      return matchesEvent && matchesMarket;
    });

    return {
      fetchedAt: now,
      mode: "mock",
      provider: this.id,
      records,
    };
  }
}
