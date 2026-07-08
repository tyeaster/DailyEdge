import assert from "node:assert/strict";
import test from "node:test";

import { buildLineupBatters, matchLivePropsToSchedule } from "../src/services/providers/live-props-matching.ts";
import type { Game, Pitcher, Team } from "../src/models/mlb.ts";
import type { NormalizedOddsRecord } from "../src/providers/odds/OddsProvider.ts";

test("matches a live strikeouts prop to a real probable pitcher and its game", () => {
  const schedule = buildSchedule();
  const props = matchLivePropsToSchedule(
    [buildRecord({ line: 6.5, playerName: "Spencer Strider", propCategory: "Strikeouts" })],
    schedule,
  );

  assert.equal(props.length, 1);
  assert.equal(props[0].category, "Strikeouts");
  assert.equal(props[0].playerId, "pitcher-strider");
  assert.equal(props[0].gameId, "game-lad-atl");
  assert.equal(props[0].odds.line, 6.5);
  assert.equal(props[0].odds.price, -115);
  assert.equal(props[0].odds.displayLine, "Over 6.5");
  assert.equal(props[0].odds.market, "player-prop");
});

test("matches a live hits prop to a real lineup batter, case-insensitively", () => {
  const schedule = buildSchedule();
  const props = matchLivePropsToSchedule(
    [buildRecord({ line: 0.5, playerName: "mookie betts", propCategory: "Hits", side: "over" })],
    schedule,
  );

  assert.equal(props.length, 1);
  assert.equal(props[0].category, "Hits");
  assert.equal(props[0].playerId, "mlb-player-1001");
  assert.equal(props[0].gameId, "game-lad-atl");
});

test("builds an Under display line when the record side is under", () => {
  const schedule = buildSchedule();
  const props = matchLivePropsToSchedule(
    [buildRecord({ line: 5.5, playerName: "Spencer Strider", propCategory: "Strikeouts", side: "under" })],
    schedule,
  );

  assert.equal(props[0].odds.displayLine, "Under 5.5");
});

test("drops records for players not found on today's schedule", () => {
  const schedule = buildSchedule();
  const props = matchLivePropsToSchedule(
    [buildRecord({ line: 6.5, playerName: "Nobody Real", propCategory: "Strikeouts" })],
    schedule,
  );

  assert.equal(props.length, 0);
});

test("drops records without a propCategory or playerName (non-player-prop markets)", () => {
  const schedule = buildSchedule();
  const props = matchLivePropsToSchedule(
    [buildRecord({ line: 6.5, playerName: undefined, propCategory: undefined })],
    schedule,
  );

  assert.equal(props.length, 0);
});

test("buildLineupBatters constructs a stable mlb-player-<id> per lineup player", () => {
  const schedule = buildSchedule();
  const batters = buildLineupBatters(schedule.teams);

  assert.equal(batters.length, 1);
  assert.equal(batters[0].id, "mlb-player-1001");
  assert.equal(batters[0].fullName, "Mookie Betts");
  assert.equal(batters[0].teamId, "team-lad");
});

function buildRecord(overrides: {
  line: number;
  playerName: string | undefined;
  propCategory: NormalizedOddsRecord["propCategory"];
  side?: "over" | "under";
}): NormalizedOddsRecord {
  return {
    americanOdds: -115,
    id: "record-1",
    impliedProbability: 0.535,
    line: overrides.line,
    market: "player-prop",
    playerName: overrides.playerName,
    propCategory: overrides.propCategory,
    selection: overrides.playerName ?? "unknown",
    side: overrides.side ?? "over",
    sportsbook: "DraftKings",
    updatedAt: "2026-06-22T20:00:00.000Z",
  };
}

function buildSchedule(): { games: Game[]; pitchers: Pitcher[]; teams: Team[] } {
  const batterTeam: Team = {
    abbreviation: "LAD",
    city: "Los Angeles",
    division: "West",
    id: "team-lad",
    lineup: {
      averageOps: 0.76,
      averageStrikeoutRate: 0.22,
      averageWrcPlus: null,
      contactRating: 66,
      fetchedAt: "2026-06-22T12:00:00.000Z",
      handedness: { balanceRating: 70, left: 3, right: 5, switch: 1 },
      lineupConfidence: 82,
      missingStarPlayerIds: [],
      missingStarterIds: [],
      overallStrength: 68,
      players: [
        {
          battingAverage: 0.29,
          battingHand: "R",
          battingOrder: 1,
          fullName: "Mookie Betts",
          homeRuns: 18,
          isPinchHitter: false,
          isStarting: true,
          mlbId: 1001,
          onBasePercentage: 0.37,
          ops: 0.88,
          plateAppearances: 320,
          position: "2B",
          sluggingPercentage: 0.51,
          strikeoutRate: 0.14,
          wrcPlus: 140,
        },
      ],
      powerRating: 68,
      replacementQuality: 60,
      source: "mock",
      status: "confirmed",
    },
    league: "NL",
    name: "Dodgers",
  };
  const pitcherTeam: Team = {
    abbreviation: "ATL",
    city: "Atlanta",
    division: "East",
    id: "team-atl",
    league: "NL",
    name: "Braves",
  };
  const pitcher: Pitcher = {
    arsenal: ["Four-seam", "Slider"],
    bats: "R",
    era: 3.21,
    externalIds: { mlb: 2001 },
    fullName: "Spencer Strider",
    handedness: "R",
    id: "pitcher-strider",
    inningsPitched: 76.1,
    position: "SP",
    strikeoutRate: 35.2,
    teamId: pitcherTeam.id,
    throws: "R",
    whip: 1.09,
  };
  const game: Game = {
    awayPitcherId: pitcher.id,
    awayTeamId: pitcherTeam.id,
    homePitcherId: "pitcher-yamamoto",
    homeTeamId: batterTeam.id,
    id: "game-lad-atl",
    scheduledAt: "2026-06-22T23:20:00.000Z",
    status: "confirmed",
    venue: "Dodger Stadium",
  } as Game;

  return { games: [game], pitchers: [pitcher], teams: [batterTeam, pitcherTeam] };
}
