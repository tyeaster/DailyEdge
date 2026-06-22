import type { OddsMarket } from "@/src/models/mlb";

import type {
  NormalizedOddsRecord,
  OddsProvider,
  OddsProviderRequest,
  OddsProviderResponse,
} from "./OddsProvider";
import { ReplayOddsProvider } from "./ReplayOddsProvider";

const DEFAULT_ODDSPIPE_URL = "https://api.oddspipe.com/v1/odds";

type OddsPipeRecord = {
  americanOdds?: number;
  eventId?: string;
  gameId?: string;
  id?: string;
  line?: number;
  market?: string;
  odds?: number;
  price?: number;
  selection?: string;
  sportsbook?: string;
  sportsBook?: string;
  updatedAt?: string;
};

export class OddsPipeProvider implements OddsProvider {
  readonly id = "oddspipe";

  constructor(
    private readonly endpoint = process.env.ODDSPIPE_API_URL ?? DEFAULT_ODDSPIPE_URL,
    private readonly apiKey = process.env.ODDSPIPE_API_KEY,
    private readonly replayProvider = new ReplayOddsProvider(),
  ) {}

  async getOdds(request: OddsProviderRequest): Promise<OddsProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ODDSPIPE_API_KEY is required for live odds mode");
    }

    const response = await fetch(this.buildUrl(request), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OddsPipe request failed with ${response.status}`);
    }

    const raw = await response.json();
    const records = normalizeOddsPipeResponse(raw);

    if (process.env.ODDS_RECORD === "true") {
      await this.replayProvider.writeReplay({
        provider: this.id,
        raw,
        records,
        request,
      });
    }

    return {
      fetchedAt: new Date().toISOString(),
      mode: "live",
      provider: this.id,
      records,
    };
  }

  private buildUrl(request: OddsProviderRequest) {
    const url = new URL(this.endpoint);

    url.searchParams.set("sport", request.sport);

    if (request.date) {
      url.searchParams.set("date", request.date);
    }

    if (request.eventIds?.length) {
      url.searchParams.set("eventIds", request.eventIds.join(","));
    }

    if (request.markets?.length) {
      url.searchParams.set("markets", request.markets.join(","));
    }

    return url;
  }
}

function normalizeOddsPipeResponse(raw: unknown): NormalizedOddsRecord[] {
  const records = extractRecords(raw);

  return records.flatMap((record, index) => {
    const americanOdds = record.americanOdds ?? record.odds ?? record.price;
    const market = normalizeMarket(record.market);

    if (typeof americanOdds !== "number" || !market) {
      return [];
    }

    return [
      {
        americanOdds,
        eventId: record.eventId ?? record.gameId,
        id: record.id ?? `oddspipe-${index}`,
        line: record.line,
        market,
        selection: record.selection ?? market,
        sportsbook: record.sportsbook ?? record.sportsBook ?? "OddsPipe",
        updatedAt: record.updatedAt ?? new Date().toISOString(),
      },
    ];
  });
}

function extractRecords(raw: unknown): OddsPipeRecord[] {
  if (Array.isArray(raw)) {
    return raw as OddsPipeRecord[];
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const response = raw as {
    data?: unknown;
    events?: unknown;
    odds?: unknown;
    records?: unknown;
  };
  const candidates = [
    response.records,
    response.odds,
    response.data,
    response.events,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.flatMap((item) => {
        if (item && typeof item === "object" && Array.isArray((item as { odds?: unknown }).odds)) {
          return (item as { odds: OddsPipeRecord[] }).odds;
        }

        return item as OddsPipeRecord;
      });
    }
  }

  return [];
}

function normalizeMarket(market: string | undefined): OddsMarket | undefined {
  if (!market) {
    return undefined;
  }

  const normalized = market.toLowerCase().replace(/_/g, "-");

  if (
    normalized === "moneyline" ||
    normalized === "spread" ||
    normalized === "total" ||
    normalized === "team-total" ||
    normalized === "player-prop"
  ) {
    return normalized;
  }

  return undefined;
}
