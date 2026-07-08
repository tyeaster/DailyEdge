import assert from "node:assert/strict";
import test from "node:test";

import { buildHitterResearchViewModel } from "../src/features/hitter-research/service.ts";
import type { DailySlateViewModel } from "../src/services/daily-slate/types.ts";

test("builds hitter research from Daily Slate-shaped data", () => {
  const research = buildHitterResearchViewModel(buildSlate(), "player-betts");

  assert.equal(research.batter.fullName, "Mookie Betts");
  assert.equal(research.opponent.abbreviation, "ATL");
  assert.equal(research.opposingPitcher.fullName, "Spencer Strider");
  assert.equal(research.overview.totalBaseLine, "Over 1.5");
  assert.equal(research.overview.projection, "0.90 H / 2.2 TB");
  assert.equal(research.rolling.length, 4);
  assert.equal(research.recentGames.length, 10);
  assert.equal(research.factors.length, 7);
  assert.equal(research.matchup.pitchMatchScore, 50);
  assert.equal(research.matchup.zoneMatchScore, 50);
  assert.ok(research.context.some((item) => item.label === "Weather"));
  assert.ok(research.modelExplanation.includes("TrueLine projects"));
});

function buildSlate(): DailySlateViewModel {
  const awayTeam = team("team-lad", "Los Angeles", "Dodgers", "LAD", 74);
  const homeTeam = team("team-atl", "Atlanta", "Braves", "ATL", 62);
  const batter = {
    bats: "R",
    fullName: "Mookie Betts",
    id: "player-betts",
    position: "2B",
    teamId: awayTeam.id,
    throws: "R",
  } as const;
  const awayPitcher = pitcher("pitcher-yamamoto", "Yoshinobu Yamamoto", awayTeam.id);
  const homePitcher = pitcher("pitcher-strider", "Spencer Strider", homeTeam.id);
  const weather = {
    relativeWindDirection: "Tailwind",
    runEnvironment: 62,
    summary: "82F, 7 MPH Tailwind",
    temperatureF: 82,
    weatherApplicable: true,
    windMph: 7,
  };
  const game = {
    awayTeamId: awayTeam.id,
    ballpark: {
      hitterFriendlyRating: 61,
      name: "Truist Park",
      overallParkRating: 59,
      powerFriendlyRating: 63,
    },
    homeTeamId: homeTeam.id,
    id: "game-lad-atl",
    prediction: {
      dataQuality: {
        score: 78,
      },
    },
    scheduledAt: "2026-06-22T23:20:00.000Z",
    venue: "Truist Park",
  };

  return {
    bets: [],
    dashboardNavItems: [],
    dataSource: "mock",
    games: [
      {
        awayPitcher,
        awayTeam,
        game,
        homePitcher,
        homeTeam,
        weather,
      },
    ],
    injuries: [],
    kpiMetrics: [],
    propCategories: [
      {
        label: "Hits",
        props: [],
      },
      {
        label: "Total Bases",
        props: [
          {
            player: batter,
            prop: {
              category: "Total Bases",
              confidence: { label: "High", value: 76 },
              edge: { percentage: 5.4, rating: "A" },
              gameId: game.id,
              id: "prop-betts-tb",
              odds: {
                displayLine: "Over 1.5",
                id: "odds-betts-tb",
                line: 1.5,
                market: "player-prop",
                movement: "+7 cents",
                price: -110,
                sportsbook: "DraftKings",
              },
              playerId: batter.id,
              projection: "2.2 TB",
              reasoning: "Betts grades highest in hard-contact probability.",
            },
            team: awayTeam,
          },
        ],
      },
    ],
    slateMeta: {
      averageConfidence: "76%",
      currentDate: "Monday, June 22",
      firstPitchCountdown: "2h",
      gamesToday: 1,
      lastUpdated: "12:00 PM ET",
    },
    weatherReports: [],
  } as unknown as DailySlateViewModel;
}

function team(
  id: string,
  city: string,
  name: string,
  abbreviation: string,
  lineupStrength: number,
) {
  return {
    abbreviation,
    city,
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
      overallStrength: lineupStrength,
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
  };
}

function pitcher(id: string, fullName: string, teamId: string) {
  return {
    arsenal: ["Four-seam", "Slider", "Changeup"],
    bats: "R",
    era: 3.21,
    fullName,
    handedness: "R",
    id,
    inningsPitched: 76.1,
    position: "SP",
    strikeoutRate: 35.2,
    teamId,
    throws: "R",
    whip: 1.09,
  };
}
