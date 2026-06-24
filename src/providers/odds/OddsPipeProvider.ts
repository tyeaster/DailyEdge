import type { OddsMarket } from "@/src/models/mlb";
import { americanOddsToImpliedProbability } from "@/src/lib/odds";

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
  awayTeam?: string;
  away_team?: string;
  eventId?: string;
  event_id?: string;
  gameId?: string;
  game_id?: string;
  homeTeam?: string;
  home_team?: string;
  id?: string;
  key?: string;
  lastUpdate?: string;
  last_update?: string;
  line?: number;
  market?: string;
  name?: string;
  odds?: number;
  outcomes?: OddsPipeRecord[];
  point?: number;
  price?: number;
  selection?: string;
  side?: string;
  sportsbook?: string;
  sportsBook?: string;
  sportsbookName?: string;
  team?: string;
  teamName?: string;
  timestamp?: string;
  title?: string;
  type?: string;
  updatedAt?: string;
  updated_at?: string;
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

export function normalizeOddsPipeResponse(raw: unknown): NormalizedOddsRecord[] {
  const records = extractRecords(raw);

  return records.flatMap((record, index) => {
    const americanOdds = record.americanOdds ?? record.odds ?? record.price;
    const market = normalizeMarket(record.market ?? record.type ?? record.key);

    if (typeof americanOdds !== "number" || !market) {
      return [];
    }

    const selection = record.selection ?? record.name ?? record.teamName ?? record.team ?? market;
    const side = normalizeSide(record.side ?? selection);
    const updatedAt =
      record.updatedAt ??
      record.updated_at ??
      record.lastUpdate ??
      record.last_update ??
      record.timestamp ??
      new Date().toISOString();

    return [
      {
        americanOdds,
        awayTeam: record.awayTeam ?? record.away_team,
        eventId: record.eventId ?? record.event_id ?? record.gameId ?? record.game_id,
        homeTeam: record.homeTeam ?? record.home_team,
        id: record.id ?? `oddspipe-${index}`,
        impliedProbability: americanOddsToImpliedProbability(americanOdds),
        line: record.line ?? record.point,
        market,
        selection,
        side,
        sportsbook:
          record.sportsbook ??
          record.sportsBook ??
          record.sportsbookName ??
          record.title ??
          record.key ??
          "OddsPipe",
        teamName: record.teamName ?? record.team,
        updatedAt,
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
    bookmakers?: unknown;
    markets?: unknown;
  };
  const candidates = [
    response.records,
    response.odds,
    response.data,
    response.events,
    response.bookmakers,
    response.markets,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.flatMap((item) => flattenOddsItem(item));
    }
  }

  return [];
}

function flattenOddsItem(item: unknown): OddsPipeRecord[] {
  if (!item || typeof item !== "object") {
    return [];
  }

  const parent = item as OddsPipeRecord & {
    bookmakers?: unknown;
    markets?: unknown;
  };
  const nestedCandidates = [
    parent.outcomes,
    parent.odds,
    parent.markets,
    parent.bookmakers,
  ];

  for (const candidate of nestedCandidates) {
    if (Array.isArray(candidate)) {
      const parentFields: OddsPipeRecord = {
        americanOdds: parent.americanOdds,
        awayTeam: parent.awayTeam,
        away_team: parent.away_team,
        eventId: parent.eventId,
        event_id: parent.event_id,
        gameId: parent.gameId,
        game_id: parent.game_id,
        homeTeam: parent.homeTeam,
        home_team: parent.home_team,
        id: parent.id,
        key: parent.key,
        lastUpdate: parent.lastUpdate,
        last_update: parent.last_update,
        line: parent.line,
        market: parent.market,
        name: parent.name,
        odds: typeof parent.odds === "number" ? parent.odds : undefined,
        point: parent.point,
        price: parent.price,
        selection: parent.selection,
        side: parent.side,
        sportsbook: parent.sportsbook,
        sportsBook: parent.sportsBook,
        sportsbookName: parent.sportsbookName,
        team: parent.team,
        teamName: parent.teamName,
        timestamp: parent.timestamp,
        title: parent.title,
        type: parent.type,
        updatedAt: parent.updatedAt,
        updated_at: parent.updated_at,
      };

      return candidate.flatMap((child) => {
        return flattenOddsItem({
          ...parentFields,
          ...(typeof child === "object" && child ? child : {}),
        });
      });
    }
  }

  return [parent];
}

function normalizeMarket(market: string | undefined): OddsMarket | undefined {
  if (!market) {
    return undefined;
  }

  const normalized = market.toLowerCase().replace(/_/g, "-");

  if (normalized === "moneyline" || normalized === "h2h") {
    return "moneyline";
  }

  if (normalized === "spread" || normalized === "spreads") {
    return "spread";
  }

  if (normalized === "total" || normalized === "totals") {
    return "total";
  }

  if (normalized === "team-total" || normalized === "player-prop") {
    return normalized;
  }

  return undefined;
}

function normalizeSide(sideOrSelection: string | undefined) {
  if (!sideOrSelection) {
    return undefined;
  }

  const normalized = sideOrSelection.toLowerCase();

  if (normalized === "home" || normalized.includes(" home")) {
    return "home";
  }

  if (normalized === "away" || normalized.includes(" away")) {
    return "away";
  }

  if (normalized === "over" || normalized.startsWith("over ") || normalized === "o") {
    return "over";
  }

  if (normalized === "under" || normalized.startsWith("under ") || normalized === "u") {
    return "under";
  }

  return undefined;
}
