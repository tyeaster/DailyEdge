import assert from "node:assert/strict";
import test from "node:test";

import { buildSearchResults } from "../src/features/global-search/service.ts";
import type { Pitcher, Player, Team } from "../src/models/mlb.ts";
import type { DailySlateGame, DailySlateViewModel } from "../src/services/daily-slate/types.ts";

test("matches static routes by label", () => {
  const results = buildSearchResults("best bets", buildSlate());

  assert.ok(results.some((result) => result.href === "/best-bets" && result.type === "route"));
});

test("matches teams by city, name, or abbreviation", () => {
  const results = buildSearchResults("dodgers", buildSlate());
  const team = results.find((result) => result.type === "team");

  assert.ok(team);
  assert.equal(team?.label, "Los Angeles Dodgers");
  assert.equal(team?.href, "/research/teams");
});

test("matches today's players and links pitchers/batters to the right lab", () => {
  const results = buildSearchResults("strider", buildSlate());
  const player = results.find((result) => result.type === "player");

  assert.ok(player);
  assert.equal(player?.label, "Spencer Strider");
  assert.equal(player?.href, "/pitching/strikeouts?pitcher=pitcher-strider");
});

test("returns an empty array for an empty query", () => {
  assert.deepEqual(buildSearchResults("", buildSlate()), []);
});

function buildSlate(): DailySlateViewModel {
  const batterTeam = buildTeam("team-lad", "LAD", "Dodgers", "Los Angeles");
  const pitcherTeam = buildTeam("team-atl", "ATL", "Braves", "Atlanta");
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
  const awayPitcher: Pitcher = {
    ...pitcher,
    fullName: "Yoshinobu Yamamoto",
    id: "pitcher-yamamoto",
    teamId: batterTeam.id,
  };
  const batter: Player = {
    bats: "R",
    externalIds: { mlb: 1001 },
    fullName: "Mookie Betts",
    id: "player-betts",
    position: "2B",
    teamId: batterTeam.id,
    throws: "R",
  };

  const game: DailySlateGame = {
    awayPitcher,
    awayTeam: batterTeam,
    game: {
      awayPitcherId: awayPitcher.id,
      awayTeamId: batterTeam.id,
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

  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [game],
    injuries: [],
    kpiMetrics: [],
    propCategories: [
      {
        label: "Hits",
        props: [
          {
            player: batter,
            prop: { gameId: game.game.id } as never,
            team: batterTeam,
          },
        ],
      },
    ],
    slateMeta: {} as never,
    weatherReports: [],
  } as unknown as DailySlateViewModel;
}

function buildTeam(id: string, abbreviation: string, name: string, city: string): Team {
  return {
    abbreviation,
    city,
    division: "West",
    id,
    league: "NL",
    name,
  };
}
