import type { ServiceResult } from "@/src/services/shared/types";
import { oddsService } from "@/src/services/OddsService";

import type { OddsQuote } from "./types";

export async function getOddsQuotes(): Promise<ServiceResult<OddsQuote[]>> {
  try {
    const odds = await oddsService.getOdds();

    return {
      data: odds.records.map((record) => ({
        market: {
          id: record.market,
          label: formatMarketLabel(record.market),
          sport: "MLB",
          type: record.market,
        },
        impliedProbability: record.impliedProbability,
        price: record.americanOdds,
        sportsbook: {
          id: record.sportsbook.toLowerCase().replaceAll(" ", "-"),
          name: record.sportsbook,
        },
        updatedAt: record.updatedAt,
      })),
      ok: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load odds quotes",
      ok: false,
    };
  }
}

function formatMarketLabel(market: OddsQuote["market"]["type"]) {
  return market
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
