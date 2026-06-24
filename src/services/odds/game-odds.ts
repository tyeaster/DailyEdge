import type { Game, Odds, OddsMarket, Team } from "@/src/models/mlb";
import type { NormalizedOddsRecord } from "@/src/providers/odds";
import { formatAmericanOdds } from "@/src/lib/odds";

const gameMarkets: OddsMarket[] = ["moneyline", "spread", "total"];

export function applyOddsToGames({
  games,
  oddsRecords,
  teamById,
}: {
  games: Game[];
  oddsRecords: NormalizedOddsRecord[];
  teamById: Record<string, Team>;
}) {
  return games.map((game) => {
    const gameRecords = getRecordsForGame(game, oddsRecords, teamById);

    if (gameRecords.length === 0) {
      return game;
    }

    return {
      ...game,
      odds: {
        moneyline: buildMarketOdds({
          fallback: game.odds.moneyline,
          game,
          market: "moneyline",
          records: gameRecords,
          teamById,
        }),
        spread: buildMarketOdds({
          fallback: game.odds.spread,
          game,
          market: "spread",
          records: gameRecords,
          teamById,
        }),
        total: buildMarketOdds({
          fallback: game.odds.total,
          game,
          market: "total",
          records: gameRecords,
          teamById,
        }),
      },
    };
  });
}

function buildMarketOdds({
  fallback,
  game,
  market,
  records,
  teamById,
}: {
  fallback: Odds;
  game: Game;
  market: OddsMarket;
  records: NormalizedOddsRecord[];
  teamById: Record<string, Team>;
}): Odds {
  if (!gameMarkets.includes(market)) {
    return fallback;
  }

  const marketRecords = sortMarketRecords({
    game,
    market,
    records: records.filter((record) => record.market === market),
    teamById,
  });
  const primaryRecord = marketRecords[0];

  if (!primaryRecord) {
    return fallback;
  }

  return {
    ...fallback,
    displayLine: formatDisplayLine(market, marketRecords, game, teamById),
    id: primaryRecord.id,
    impliedProbability: primaryRecord.impliedProbability,
    line: primaryRecord.line ?? fallback.line,
    market,
    movement: "Live",
    outcomes: marketRecords.map((record) => ({
      impliedProbability: record.impliedProbability,
      line: record.line,
      price: record.americanOdds,
      selection: record.selection,
      side: record.side,
      sportsbook: record.sportsbook,
      updatedAt: record.updatedAt,
    })),
    price: primaryRecord.americanOdds,
    sportsbook: formatSportsbook(marketRecords),
    updatedAt: getLatestUpdatedAt(marketRecords),
  };
}

function getRecordsForGame(
  game: Game,
  records: NormalizedOddsRecord[],
  teamById: Record<string, Team>,
) {
  const awayTeam = teamById[game.awayTeamId];
  const homeTeam = teamById[game.homeTeamId];
  const gameIdParts = new Set([game.id, game.id.replace(/^game-/, "")]);

  return records.filter((record) => {
    if (record.eventId && gameIdParts.has(record.eventId.replace(/^game-/, ""))) {
      return true;
    }

    return teamsMatch(record, awayTeam, homeTeam);
  });
}

function teamsMatch(
  record: NormalizedOddsRecord,
  awayTeam: Team | undefined,
  homeTeam: Team | undefined,
) {
  if (!awayTeam || !homeTeam) {
    return false;
  }

  const recordTeams = [
    record.awayTeam,
    record.homeTeam,
    record.teamName,
    record.selection,
  ].map(normalizeName);
  const awayNames = getTeamMatchNames(awayTeam);
  const homeNames = getTeamMatchNames(homeTeam);

  return (
    recordTeams.some((team) => awayNames.has(team)) ||
    recordTeams.some((team) => homeNames.has(team))
  );
}

function sortMarketRecords({
  game,
  market,
  records,
  teamById,
}: {
  game: Game;
  market: OddsMarket;
  records: NormalizedOddsRecord[];
  teamById: Record<string, Team>;
}) {
  const awayNames = getTeamMatchNames(teamById[game.awayTeamId]);
  const homeNames = getTeamMatchNames(teamById[game.homeTeamId]);

  return [...records].sort((left, right) => {
    return (
      getMarketSortValue(left, market, awayNames, homeNames) -
      getMarketSortValue(right, market, awayNames, homeNames)
    );
  });
}

function getMarketSortValue(
  record: NormalizedOddsRecord,
  market: OddsMarket,
  awayNames: Set<string>,
  homeNames: Set<string>,
) {
  const selection = normalizeName(record.teamName ?? record.selection);

  if (market === "total") {
    if (record.side === "over" || selection === "over") {
      return 0;
    }

    if (record.side === "under" || selection === "under") {
      return 1;
    }

    return 2;
  }

  if (market === "moneyline" && (record.side === "home" || homeNames.has(selection))) {
    return 0;
  }

  if (market === "moneyline" && (record.side === "away" || awayNames.has(selection))) {
    return 1;
  }

  if (record.side === "away" || awayNames.has(selection)) {
    return 0;
  }

  if (record.side === "home" || homeNames.has(selection)) {
    return 1;
  }

  return 2;
}

function formatDisplayLine(
  market: OddsMarket,
  records: NormalizedOddsRecord[],
  game: Game,
  teamById: Record<string, Team>,
) {
  if (market === "moneyline") {
    return records.map(formatMoneylineRecord).join(" / ");
  }

  if (market === "spread") {
    return records.map((record) => formatSpreadRecord(record, game, teamById)).join(" / ");
  }

  return records.map(formatTotalRecord).join(" / ");
}

function formatMoneylineRecord(record: NormalizedOddsRecord) {
  return `${record.selection} ${formatAmericanOdds(record.americanOdds)}`;
}

function formatSpreadRecord(
  record: NormalizedOddsRecord,
  game: Game,
  teamById: Record<string, Team>,
) {
  const label = getTeamLabel(record, game, teamById);
  const line = typeof record.line === "number" ? formatSignedNumber(record.line) : "";

  return `${label} ${line} (${formatAmericanOdds(record.americanOdds)})`.trim();
}

function formatTotalRecord(record: NormalizedOddsRecord) {
  const side = record.side === "under" ? "Under" : "Over";
  const line = typeof record.line === "number" ? String(record.line) : record.selection;

  return `${side} ${line} (${formatAmericanOdds(record.americanOdds)})`;
}

function getTeamLabel(
  record: NormalizedOddsRecord,
  game: Game,
  teamById: Record<string, Team>,
) {
  const awayTeam = teamById[game.awayTeamId];
  const homeTeam = teamById[game.homeTeamId];
  const selection = normalizeName(record.teamName ?? record.selection);

  if (awayTeam && getTeamMatchNames(awayTeam).has(selection)) {
    return awayTeam.abbreviation;
  }

  if (homeTeam && getTeamMatchNames(homeTeam).has(selection)) {
    return homeTeam.abbreviation;
  }

  return record.selection;
}

function getTeamMatchNames(team: Team | undefined) {
  if (!team) {
    return new Set<string>();
  }

  return new Set([
    normalizeName(team.abbreviation),
    normalizeName(team.name),
    normalizeName(team.city),
    normalizeName(`${team.city} ${team.name}`),
  ]);
}

function formatSportsbook(records: NormalizedOddsRecord[]) {
  const sportsbooks = [...new Set(records.map((record) => record.sportsbook))];

  return sportsbooks.length === 1 ? sportsbooks[0] : "Consensus";
}

function getLatestUpdatedAt(records: NormalizedOddsRecord[]) {
  return records
    .map((record) => record.updatedAt)
    .sort()
    .at(-1);
}

function normalizeName(name: string | undefined) {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
