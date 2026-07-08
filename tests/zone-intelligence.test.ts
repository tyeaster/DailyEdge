import assert from "node:assert/strict";
import test from "node:test";

import { memoryCache } from "../src/cache/MemoryCache.ts";
import type { Pitcher, Player, Team } from "../src/models/mlb.ts";
import { MockMatchupProvider } from "../src/providers/matchup/MockMatchupProvider.ts";
import { MatchupService } from "../src/services/matchup/MatchupService.ts";
import { buildZoneIntelligenceViewModel } from "../src/features/zone-intelligence/service.ts";
import type { DailySlateGame } from "../src/services/daily-slate/types.ts";

test("builds Zone Intelligence view model from normalized matchup data", async () => {
  const batterTeam = buildTeam("team-lad", "LAD", "Dodgers");
  const pitcherTeam = buildTeam("team-atl", "ATL", "Braves");
  const batter: Player = {
    bats: "R",
    externalIds: { mlb: 1001 },
    fullName: "Mookie Betts",
    id: "player-betts",
    position: "2B",
    teamId: batterTeam.id,
    throws: "R",
  };
  const pitcher: Pitcher = {
    arsenal: ["Four-seam", "Slider", "Changeup"],
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
  const game = buildGame({ batterTeam, pitcherTeam, pitcher });
  const matchup = await new MatchupService(
    new MockMatchupProvider(),
    memoryCache,
  ).getMatchupIntelligence(
    {
      asOfDate: "2026-06-22",
      batterIds: [batter.id],
      batterMlbIds: [1001],
      batterNames: [batter.fullName],
      pitcherId: pitcher.id,
      pitcherMlbId: 2001,
      pitcherName: pitcher.fullName,
      season: 2026,
    },
    {
      ballpark: game.game.ballpark,
      bullpen: pitcherTeam.strength?.bullpen,
      lineup: batterTeam.lineup,
      weather: game.weather,
    },
  );

  const viewModel = buildZoneIntelligenceViewModel({
    batter,
    batterTeam,
    game,
    matchup,
    pitcher,
    pitcherTeam,
  });

  assert.equal(viewModel.pitcher.fullName, "Spencer Strider");
  assert.equal(viewModel.batter.fullName, "Mookie Betts");
  assert.equal(viewModel.pitchArsenalRows.length, 3);
  assert.equal(viewModel.batterPitchRows.length, 3);
  assert.equal(viewModel.pitchUsage.length, 3);
  assert.equal(viewModel.pitcherHeatCells.length, 9);
  assert.equal(viewModel.zoneDamageCells.length, 9);
  assert.equal(viewModel.overlayCells.length, 9);
  assert.ok(viewModel.matchup.overallMatch > 0);
  assert.ok(viewModel.matchup.pitchMatch > 0);
  assert.ok(viewModel.matchup.zoneMatch > 0);
  assert.ok(viewModel.summary.includes("Zone Match"));
  assert.ok(viewModel.reasons.length > 0);
});

function buildTeam(id: string, abbreviation: string, name: string): Team {
  return {
    abbreviation,
    city: name,
    division: "West",
    id,
    league: "NL",
    lineup: {
      averageOps: 0.76,
      averageStrikeoutRate: 0.22,
      averageWrcPlus: null,
      contactRating: 66,
      fetchedAt: "2026-06-22T12:00:00.000Z",
      handedness: {
        balanceRating: 70,
        left: 3,
        right: 5,
        switch: 1,
      },
      lineupConfidence: 82,
      missingStarPlayerIds: [],
      missingStarterIds: [],
      overallStrength: 68,
      players: [],
      powerRating: 68,
      replacementQuality: 60,
      source: "mock",
      status: "projected",
    },
    name,
    strength: {
      bullpen: {
        available: true,
        value: 63,
        workloadRating: 45,
      },
    },
  } as unknown as Team;
}

function buildGame({
  batterTeam,
  pitcher,
  pitcherTeam,
}: {
  batterTeam: Team;
  pitcher: Pitcher;
  pitcherTeam: Team;
}): DailySlateGame {
  const awayPitcher = {
    ...pitcher,
    fullName: "Yoshinobu Yamamoto",
    id: "pitcher-yamamoto",
    teamId: batterTeam.id,
  };

  return {
    awayPitcher,
    awayTeam: batterTeam,
    game: {
      awayPitcherId: awayPitcher.id,
      awayTeamId: batterTeam.id,
      ballpark: {
        hitterFriendlyRating: 61,
        name: "Truist Park",
        overallParkRating: 59,
        powerFriendlyRating: 63,
        runFactor: 104,
      },
      homePitcherId: pitcher.id,
      homeTeamId: pitcherTeam.id,
      id: "game-lad-atl",
      scheduledAt: "2026-06-22T23:20:00.000Z",
      status: "confirmed",
      venue: "Truist Park",
    },
    homePitcher: pitcher,
    homeTeam: pitcherTeam,
    weather: {
      relativeWindDirection: "Tailwind",
      strikeoutEnvironment: 48,
      summary: "82F, 7 MPH Tailwind",
      temperatureF: 82,
      weatherApplicable: true,
      windMph: 7,
    },
  } as DailySlateGame;
}
