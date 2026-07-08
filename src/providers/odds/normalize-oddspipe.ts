import type { OddsMarket, PlayerPropCategory } from "../../models/mlb.ts";
import { americanOddsToImpliedProbability } from "../../lib/odds.ts";

import type { NormalizedOddsRecord } from "./OddsProvider.ts";

/**
 * Pure OddsPipe response parsing, split out of OddsPipeProvider.ts (whose
 * class constructor uses TypeScript parameter-property shorthand - unsupported
 * by node --experimental-strip-types's syntax-only stripping, so that file
 * can't be imported directly by tests) and importing only via relative paths
 * so this module is directly unit-testable.
 */
export type OddsPipeRecord = {
  americanOdds?: number;
  awayTeam?: string;
  away_team?: string;
  description?: string;
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
  participant?: string;
  playerName?: string;
  player_name?: string;
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

export function normalizeOddsPipeResponse(raw: unknown): NormalizedOddsRecord[] {
  const records = extractRecords(raw);

  return records.flatMap((record, index) => {
    const americanOdds = record.americanOdds ?? record.odds ?? record.price;
    const normalized = normalizeMarket(record.market ?? record.type ?? record.key);

    if (typeof americanOdds !== "number" || !normalized) {
      return [];
    }

    const { market, propCategory } = normalized;
    const playerName = propCategory
      ? record.playerName ?? record.player_name ?? record.participant ?? record.description ?? record.name ?? record.selection
      : undefined;
    const selection =
      record.selection ?? record.name ?? record.teamName ?? record.team ?? playerName ?? market;
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
        playerName,
        propCategory,
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
        description: parent.description,
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
        participant: parent.participant,
        playerName: parent.playerName,
        player_name: parent.player_name,
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

const playerPropMarketKeys: Record<string, PlayerPropCategory> = {
  "batter-hits": "Hits",
  "batter-home-runs": "Home Runs",
  "batter-runs-scored": "Runs",
  "batter-rbis": "RBI",
  "batter-total-bases": "Total Bases",
  "player-hits": "Hits",
  "player-home-runs": "Home Runs",
  "player-rbi": "RBI",
  "player-rbis": "RBI",
  "player-runs": "Runs",
  "player-strikeouts": "Strikeouts",
  "player-total-bases": "Total Bases",
  "pitcher-strikeouts": "Strikeouts",
};

function normalizeMarket(
  market: string | undefined,
): { market: OddsMarket; propCategory?: PlayerPropCategory } | undefined {
  if (!market) {
    return undefined;
  }

  const normalized = market.toLowerCase().replace(/_/g, "-");

  if (normalized === "moneyline" || normalized === "h2h") {
    return { market: "moneyline" };
  }

  if (normalized === "spread" || normalized === "spreads") {
    return { market: "spread" };
  }

  if (normalized === "total" || normalized === "totals") {
    return { market: "total" };
  }

  if (normalized === "team-total") {
    return { market: "team-total" };
  }

  const propCategory = playerPropMarketKeys[normalized];

  if (propCategory) {
    return { market: "player-prop", propCategory };
  }

  if (normalized === "player-prop") {
    return { market: "player-prop" };
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
