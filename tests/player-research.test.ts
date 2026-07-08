import assert from "node:assert/strict";
import test from "node:test";

import { buildPlayerDirectory } from "../src/features/player-research/service.ts";
import type { Pitcher, Player, Team } from "../src/models/mlb.ts";
import type { DailySlateGame, DailySlateViewModel } from "../src/services/daily-slate/types.ts";

test("builds a deduplicated player directory from the daily slate", () => {
  const slate = buildSlate();
  const directory = buildPlayerDirectory(slate);

  const names = directory.map((entry) => entry.fullName);

  assert.ok(names.includes("Spencer Strider"));
  assert.ok(names.includes("Yoshinobu Yamamoto"));
  assert.ok(names.includes("Mookie Betts"));
  assert.equal(new Set(names).size, names.length, "no duplicate players");

  const strider = directory.find((entry) => entry.fullName === "Spencer Strider");

  assert.equal(strider?.role, "pitcher");
  assert.equal(strider?.team.abbreviation, "ATL");

  const betts = directory.find((entry) => entry.fullName === "Mookie Betts");

  assert.equal(betts?.role, "batter");
});

test("excludes placeholder TBD starters", () => {
  const slate = buildSlate();
  const directory = buildPlayerDirectory(slate);

  assert.ok(!directory.some((entry) => entry.fullName === "Probable starter TBD"));
});

function buildSlate(): DailySlateViewModel {
  const batterTeam = buildTeam("team-lad", "LAD", "Dodgers");
  const pitcherTeam = buildTeam("team-atl", "ATL", "Braves");
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
  const tbdPitcher: Pitcher = {
    arsenal: [],
    bats: "R",
    era: 0,
    externalIds: {},
    fullName: "Probable starter TBD",
    handedness: "R",
    id: "pitcher-tbd",
    inningsPitched: 0,
    position: "SP",
    strikeoutRate: 0,
    teamId: "team-tbd",
    throws: "R",
    whip: 0,
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

  const secondGame: DailySlateGame = {
    ...game,
    awayPitcher: tbdPitcher,
    game: { ...game.game, awayPitcherId: tbdPitcher.id, id: "game-2" },
  };

  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [game, secondGame],
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

function buildTeam(id: string, abbreviation: string, name: string): Team {
  return {
    abbreviation,
    city: name,
    division: "West",
    id,
    league: "NL",
    name,
  };
}
