import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import { type Game, type Pitcher, type Team } from "../src/models/mlb.ts";
import { MockMatchupProvider } from "../src/providers/matchup/MockMatchupProvider.ts";
import { ReplayMatchupProvider } from "../src/providers/matchup/ReplayMatchupProvider.ts";
import {
  buildStatcastUrl,
  parseStatcastCsv,
  StatcastMatchupProvider,
} from "../src/providers/matchup/StatcastMatchupProvider.ts";
import {
  buildBatterMatchupProfiles,
  buildPitchArsenal,
  calculateOverallPitchMatch,
  calculatePitchTypeMatch,
  MatchupService,
  type StatcastPitchRow,
} from "../src/services/matchup/index.ts";
import { PredictionEngine } from "../src/services/predictions/PredictionEngine.ts";

const request = {
  asOfDate: "2026-06-26",
  batterIds: ["batter-1"],
  batterMlbIds: [1001],
  batterNames: ["Test Hitter"],
  pitcherId: "pitcher-1",
  pitcherMlbId: 2002,
  pitcherName: "Test Pitcher",
  season: 2026,
};

test("builds Baseball Savant Statcast URLs for pitcher and batter lookups", () => {
  const pitcherUrl = buildStatcastUrl({
    endpoint: "https://savant.example.test/statcast_search/csv",
    mlbId: 2002,
    playerType: "pitcher",
    request,
  });
  const batterUrl = buildStatcastUrl({
    endpoint: "https://savant.example.test/statcast_search/csv",
    mlbId: 1001,
    playerType: "batter",
    request,
  });

  assert.equal(pitcherUrl.searchParams.get("player_type"), "pitcher");
  assert.equal(pitcherUrl.searchParams.get("pitchers_lookup[]"), "2002");
  assert.equal(batterUrl.searchParams.get("player_type"), "batter");
  assert.equal(batterUrl.searchParams.get("batters_lookup[]"), "1001");
});

test("parses Statcast CSV and normalizes a pitch arsenal", () => {
  const rows = parseStatcastCsv(statcastCsv());
  const arsenal = buildPitchArsenal({
    fetchedAt: "2026-06-26T12:00:00.000Z",
    pitcherId: request.pitcherId,
    pitcherMlbId: request.pitcherMlbId,
    pitcherName: request.pitcherName,
    request,
    rows,
    season: request.season,
    source: "live",
  });

  assert.equal(rows.length, 6);
  assert.equal(arsenal.profiles.length, 2);
  assert.equal(arsenal.primaryPitchType, "FF");
  assert.equal(arsenal.profiles[0].usagePercent, 66.7);
  assert.equal(arsenal.profiles[0].averageVelocityMph, 96.25);
  assert.ok((arsenal.profiles[0].spinRateRpm ?? 0) > 2300);
  assert.ok(arsenal.dataQuality > 0);
});

test("normalizes batter pitch profiles and deterministic matchup scores", () => {
  const pitcherRows = pitcherRowsFixture();
  const batterRows = batterRowsFixture();
  const arsenal = buildPitchArsenal({
    fetchedAt: "2026-06-26T12:00:00.000Z",
    pitcherId: request.pitcherId,
    pitcherMlbId: request.pitcherMlbId,
    pitcherName: request.pitcherName,
    request,
    rows: pitcherRows,
    season: request.season,
    source: "live",
  });
  const batterProfiles = buildBatterMatchupProfiles({
    batterIds: request.batterIds,
    batterMlbIds: request.batterMlbIds,
    batterNames: request.batterNames,
    fetchedAt: "2026-06-26T12:00:00.000Z",
    rows: batterRows,
    season: request.season,
    source: "live",
  });
  const fastballMatch = calculatePitchTypeMatch(arsenal.profiles[0], batterProfiles);
  const overall = calculateOverallPitchMatch({ arsenal, batterProfiles });

  assert.equal(batterProfiles.length, 1);
  assert.ok(batterProfiles[0].pitchProfiles[0].expectedDamageRating >= 50);
  assert.ok(fastballMatch.score >= 0 && fastballMatch.score <= 100);
  assert.ok(fastballMatch.reasons.length > 0);
  assert.ok(overall.score >= 0 && overall.score <= 100);
  assert.ok(overall.pitchTypeMatches.length > 0);
});

test("live, mock, and replay matchup providers preserve the contract", async () => {
  const replayDir = await mkdtemp(path.join(tmpdir(), "matchup-replay-"));
  const provider = new StatcastMatchupProvider(
    "https://savant.example.test/statcast_search/csv",
    async (input) => {
      const url = new URL(String(input));
      const playerType = url.searchParams.get("player_type");

      return new Response(
        playerType === "pitcher" ? statcastCsv() : batterStatcastCsv(),
        { headers: { "Content-Type": "text/csv" }, status: 200 },
      );
    },
  );
  const live = await provider.getMatchupData(request);
  const mock = await new MockMatchupProvider().getMatchupData(request);
  const replayProvider = new ReplayMatchupProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      provider: "baseball-savant-statcast",
      raw: {},
      request,
      response: live,
    });
    const replay = await replayProvider.getMatchupData(request);

    assert.equal(live.mode, "live");
    assert.equal(mock.mode, "mock");
    assert.equal(replay.mode, "replay");
    assert.equal(replay.arsenal.source, "replay");
    assert.equal(replay.batterProfiles[0].source, "replay");
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("repository matchup replay fixture runs without network access", async () => {
  const replay = await new ReplayMatchupProvider(
    path.resolve("replay/matchup"),
  ).getMatchupData(request);

  assert.equal(replay.mode, "replay");
  assert.equal(replay.arsenal.source, "replay");
  assert.ok(replay.arsenal.profiles.length > 0);
});

test("matchup service caches provider responses and degrades gracefully", async () => {
  let calls = 0;
  const service = new MatchupService(
    {
      id: "test-matchup",
      async getMatchupData(input) {
        calls += 1;
        return new MockMatchupProvider().getMatchupData(input);
      },
    },
    new MemoryCache(),
  );
  const first = await service.getMatchup(request);
  const second = await service.getMatchup(request);
  const unavailable = await new MatchupService(
    {
      id: "failing-matchup",
      async getMatchupData() {
        throw new Error("downstream unavailable");
      },
    },
    new MemoryCache(),
  ).getMatchup(request);

  assert.equal(calls, 1);
  assert.equal(first.score, second.score);
  assert.equal(unavailable.source, "unavailable");
  assert.equal(unavailable.score, 50);
});

test("prediction engine carries matchup intelligence without changing formulas", () => {
  const game = buildGame();
  const engine = new PredictionEngine();
  const prediction = engine.predictGame({
    awayPitcher: buildPitcher("away-pitcher", "Away Pitcher"),
    awayTeam: buildTeam("away", 54),
    game: {
      ...game,
      matchupIntelligence: {
        arsenalDataQuality: 80,
        batterDataQuality: 75,
        inputSources: ["mock"],
        missingInputs: [],
        reasons: ["Fastball is the strongest matchup pitch"],
        score: 72,
        source: "mock",
      },
    },
    homePitcher: buildPitcher("home-pitcher", "Home Pitcher"),
    homeTeam: buildTeam("home", 58),
  });

  assert.equal(prediction.matchupIntelligence?.score, 72);
  assert.ok(
    prediction.explanations.some((explanation) =>
      explanation.includes("Matchup Intelligence"),
    ),
  );
});

function statcastCsv() {
  return [
    "pitch_type,game_date,release_speed,release_pos_x,release_pos_z,player_name,batter,pitcher,events,description,zone,stand,p_throws,type,bb_type,balls,strikes,pfx_x,pfx_z,plate_x,plate_z,release_spin_rate,launch_speed,launch_angle,estimated_ba_using_speedangle,estimated_woba_using_speedangle,pitch_name,release_extension,pitch_number,at_bat_number",
    "FF,2026-06-01,96.0,-1.8,5.7,Test Pitcher,1001,2002,,called_strike,2,L,R,S,,0,0,-0.32,1.25,0.1,2.7,2350,,,0.200,0.300,4-Seam Fastball,6.2,1,1",
    "FF,2026-06-01,96.5,-1.9,5.8,Test Pitcher,1001,2002,,swinging_strike,2,L,R,S,,0,1,-0.31,1.26,0.2,2.8,2360,,,0.210,0.310,4-Seam Fastball,6.3,2,1",
    "FF,2026-06-01,95.7,-1.7,5.6,Test Pitcher,1001,2002,single,hit_into_play,5,L,R,X,line_drive,1,1,-0.33,1.23,0.0,2.5,2325,97,24,0.440,0.520,4-Seam Fastball,6.1,3,1",
    "FF,2026-06-01,96.8,-1.8,5.7,Test Pitcher,1001,2002,,called_strike,11,L,R,S,,0,0,-0.34,1.27,1.2,3.3,2380,,,0.205,0.305,4-Seam Fastball,6.3,1,2",
    "SL,2026-06-01,86.2,-1.9,5.7,Test Pitcher,1001,2002,,swinging_strike,7,L,R,S,,0,2,0.55,0.25,-0.6,1.9,2520,,,0.180,0.260,Slider,6.0,4,2",
    "SL,2026-06-01,85.9,-1.8,5.6,Test Pitcher,1001,2002,field_out,hit_into_play,14,L,R,X,ground_ball,1,2,0.58,0.22,-1.1,1.6,2540,83,3,0.120,0.190,Slider,6.1,5,2",
  ].join("\n");
}

function batterStatcastCsv() {
  return statcastCsv().replaceAll("Test Pitcher", "Test Hitter");
}

function pitcherRowsFixture(): StatcastPitchRow[] {
  return parseStatcastCsv(statcastCsv());
}

function batterRowsFixture(): StatcastPitchRow[] {
  return parseStatcastCsv(batterStatcastCsv()).map((row) => ({
    ...row,
    batter: 1001,
    batterName: "Test Hitter",
  }));
}

function buildGame(): Game {
  return {
    awayPitcherId: "away-pitcher",
    awayTeamId: "away",
    confidence: { label: "Medium", value: 60 },
    detail: "",
    homePitcherId: "home-pitcher",
    homeTeamId: "home",
    id: "game-1",
    modelProbability: 0.52,
    odds: {
      moneyline: {
        displayLine: "HOME -115 / AWAY +105",
        id: "ml",
        line: -115,
        market: "moneyline",
        movement: "stable",
        outcomes: [
          {
            impliedProbability: 0.535,
            price: -115,
            selection: "Home",
            side: "home",
            sportsbook: "Mockbook",
            updatedAt: "2026-06-26T12:00:00.000Z",
          },
          {
            impliedProbability: 0.488,
            price: 105,
            selection: "Away",
            side: "away",
            sportsbook: "Mockbook",
            updatedAt: "2026-06-26T12:00:00.000Z",
          },
        ],
        price: -115,
        sportsbook: "Mockbook",
      },
      spread: {
        displayLine: "-1.5",
        id: "spread",
        line: -1.5,
        market: "spread",
        movement: "stable",
        price: -110,
        sportsbook: "Mockbook",
      },
      total: {
        displayLine: "8.5",
        id: "total",
        line: 8.5,
        market: "total",
        movement: "stable",
        price: -110,
        sportsbook: "Mockbook",
      },
    },
    scheduledAt: "2026-06-26T23:00:00.000Z",
    status: "scheduled",
    venue: "Test Park",
    weatherId: "weather-1",
  };
}

function buildPitcher(id: string, fullName: string): Pitcher {
  return {
    arsenal: ["FF", "SL"],
    bats: "R",
    era: id === "home-pitcher" ? 3.1 : 4.2,
    fullName,
    handedness: "R",
    id,
    inningsPitched: 90,
    position: "P",
    strikeoutRate: id === "home-pitcher" ? 26 : 20,
    teamId: id === "home-pitcher" ? "home" : "away",
    throws: "R",
    whip: id === "home-pitcher" ? 1.08 : 1.3,
  };
}

function buildTeam(id: string, rating: number): Team {
  return {
    abbreviation: id === "home" ? "HOM" : "AWY",
    city: id,
    division: "East",
    id,
    league: "AL",
    name: id,
    record: { losses: 40, winPercentage: 0.55, wins: 49 },
    strength: {
      bullpen: { available: true, value: rating },
      fetchedAt: "2026-06-26T12:00:00.000Z",
      offense: {
        available: true,
        battingAverage: 0.25,
        ops: 0.74,
        runsPerGame: 4.5,
        strikeoutRate: 22,
        value: rating,
        walkRate: 8,
      },
      overall: { available: true, runDifferential: rating, value: rating },
      pitching: {
        available: true,
        era: 3.8,
        runsAllowedPerGame: 4.1,
        value: rating,
        whip: 1.22,
      },
      source: "mock",
    },
  };
}
