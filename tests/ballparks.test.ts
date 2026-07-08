import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MemoryCache } from "../src/cache/MemoryCache.ts";
import type { Game } from "../src/models/mlb.ts";
import {
  MLBBallparkProvider,
  normalizeParkFactors,
  normalizeVenueMetadata,
  parseSavantParkFactors,
} from "../src/providers/ballparks/MLBBallparkProvider.ts";
import { MockBallparkProvider } from "../src/providers/ballparks/MockBallparkProvider.ts";
import { ReplayBallparkProvider } from "../src/providers/ballparks/ReplayBallparkProvider.ts";
import {
  buildBallparkProfile,
  createBallparkUnavailable,
} from "../src/providers/ballparks/rating.ts";
import type {
  BallparkProvider,
  BallparkProviderResponse,
  BallparkRequest,
} from "../src/providers/ballparks/BallparkProvider.ts";
import { BallparkService } from "../src/services/BallparkService.ts";

const venueRaw = {
  venues: [
    {
      fieldInfo: {
        center: 415,
        leftCenter: 390,
        leftLine: 347,
        rightCenter: 375,
        rightLine: 350,
        roofType: "Open",
        turfType: "Grass",
      },
      id: 19,
      location: {
        azimuthAngle: 0,
        defaultCoordinates: { latitude: 39.756, longitude: -104.994 },
        elevation: 5190,
      },
      name: "Coors Field",
    },
  ],
};
const savantHtml = (homeRunFactor: number) => `
<script>
var data = [{"venue_id":"19","n_pa":"46556","index_runs":"125","index_hr":"${homeRunFactor}","index_1b":"116","index_2b":"123","index_3b":"191","index_so":"90","index_bb":"100","index_bacon":"113"}];
var queryString = {};
</script>`;
const request: BallparkRequest = {
  league: "NL",
  season: 2026,
  venueId: 19,
  venueName: "Coors Field",
};

test("normalizes official MLB venue metadata", () => {
  const metadata = normalizeVenueMetadata(venueRaw, 19, "Fallback");

  assert.equal(metadata.altitudeFeet, 5190);
  assert.equal(metadata.dimensions.center, 415);
  assert.equal(metadata.latitude, 39.756);
  assert.equal(metadata.roofType, "Open");
});

test("parses and normalizes Baseball Savant park factors", () => {
  const all = parseSavantParkFactors(savantHtml(105))[19];
  const left = parseSavantParkFactors(savantHtml(112))[19];
  const right = parseSavantParkFactors(savantHtml(98))[19];
  const factors = normalizeParkFactors({ all, left, right });

  assert.equal(factors?.runFactor, 125);
  assert.equal(factors?.leftHandedHomeRunFactor, 112);
  assert.equal(factors?.rightHandedHomeRunFactor, 98);
  assert.equal(factors?.babipFactor, 113);
});

test("calculates deterministic ballpark ratings", () => {
  const metadata = normalizeVenueMetadata(venueRaw, 19, "Coors Field");
  const factors = normalizeParkFactors({
    all: parseSavantParkFactors(savantHtml(105))[19],
    left: parseSavantParkFactors(savantHtml(112))[19],
    right: parseSavantParkFactors(savantHtml(98))[19],
  });
  const profile = buildBallparkProfile({
    factors,
    fetchedAt: "2026-06-25T12:00:00.000Z",
    league: "NL",
    metadata,
    source: "live",
  });

  assert.ok(profile.hitterFriendlyRating > 60);
  assert.ok(profile.speedFriendlyRating > 60);
  assert.ok(profile.overallParkRating > 60);
  assert.ok(profile.historicalConfidence > 90);
});

test("missing park factors stay neutral", () => {
  const unavailable = createBallparkUnavailable({
    league: "AL",
    name: "Unknown Park",
    venueId: 0,
  });

  assert.equal(unavailable.overallParkRating, 50);
  assert.equal(unavailable.historicalConfidence, 0);
  assert.equal(unavailable.runFactor, null);
});

test("live provider combines venue and Savant responses", async () => {
  const urls: string[] = [];
  const provider = new MLBBallparkProvider(
    {
      mlbEndpoint: "https://mlb.example.test/api/v1",
      savantEndpoint: "https://savant.example.test/parks",
    },
    async (input) => {
      const url = new URL(String(input));
      urls.push(url.toString());

      if (url.pathname.includes("/venues/")) {
        return new Response(JSON.stringify(venueRaw), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      const side = url.searchParams.get("batSide");

      return new Response(
        savantHtml(side === "L" ? 112 : side === "R" ? 98 : 105),
        { status: 200 },
      );
    },
  );
  const response = await provider.getBallpark(request);

  assert.equal(urls.length, 4);
  assert.equal(response.ballpark.runFactor, 125);
  assert.equal(response.ballpark.altitudeFeet, 5190);
});

test("live provider preserves venue metadata when Savant is unavailable", async () => {
  const provider = new MLBBallparkProvider(
    {
      mlbEndpoint: "https://mlb.example.test/api/v1",
      savantEndpoint: "https://savant.example.test/parks",
    },
    async (input) => {
      const url = new URL(String(input));

      return url.pathname.includes("/venues/")
        ? new Response(JSON.stringify(venueRaw), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          })
        : new Response("Unavailable", { status: 503 });
    },
  );
  const response = await provider.getBallpark(request);

  assert.equal(response.ballpark.name, "Coors Field");
  assert.equal(response.ballpark.altitudeFeet, 5190);
  assert.equal(response.ballpark.runFactor, null);
  assert.equal(response.ballpark.overallParkRating, 50);
  assert.equal(response.ballpark.historicalConfidence, 0);
});

test("mock and replay ballpark providers preserve the contract", async () => {
  const replayDir = await mkdtemp(path.join(tmpdir(), "ballpark-replay-"));
  const profile = buildBallparkProfile({
    factors: normalizeParkFactors({
      all: parseSavantParkFactors(savantHtml(105))[19],
      left: parseSavantParkFactors(savantHtml(112))[19],
      right: parseSavantParkFactors(savantHtml(98))[19],
    }),
    fetchedAt: "2026-06-25T12:00:00.000Z",
    league: "NL",
    metadata: normalizeVenueMetadata(venueRaw, 19, "Coors Field"),
    source: "live",
  });
  const mock = await new MockBallparkProvider().getBallpark({
    ...request,
    fallbackBallpark: profile,
  });
  const replayProvider = new ReplayBallparkProvider(replayDir);

  try {
    await replayProvider.writeReplay({
      ballpark: profile,
      factorsRaw: {},
      provider: "mlb-savant-ballpark",
      request,
      venueRaw,
    });
    const replay = await replayProvider.getBallpark(request);

    assert.equal(mock.mode, "mock");
    assert.equal(replay.mode, "replay");
    assert.equal(replay.ballpark.source, "replay");
    assert.equal(replay.ballpark.runFactor, 125);
  } finally {
    await rm(replayDir, { force: true, recursive: true });
  }
});

test("repository ballpark replay fixture runs without network access", async () => {
  const replay = await new ReplayBallparkProvider(
    path.resolve("replay/ballparks"),
  ).getBallpark(request);

  assert.equal(replay.mode, "replay");
  assert.equal(replay.ballpark.source, "replay");
  assert.equal(replay.ballpark.runFactor, 125);
});

test("ballpark service caches venue profiles", async () => {
  let calls = 0;
  const profile = createBallparkUnavailable({
    league: "NL",
    name: "Test Park",
    venueId: 19,
  });
  const provider: BallparkProvider = {
    id: "test-ballpark",
    async getBallpark(
      input: BallparkRequest,
    ): Promise<BallparkProviderResponse> {
      calls += 1;

      return {
        ballpark: { ...profile, source: "live" },
        fetchedAt: profile.fetchedAt,
        mode: "live",
        provider: "test-ballpark",
        venueId: input.venueId,
      };
    },
  };
  const service = new BallparkService(provider, new MemoryCache());
  const game = buildGame();

  await service.enrichGame(game, "NL", 2026);
  await service.enrichGame(game, "NL", 2026);

  assert.equal(calls, 1);
});

function buildGame(): Game {
  return {
    awayPitcherId: "away-pitcher",
    awayTeamId: "away",
    confidence: { label: "Medium", value: 50 },
    detail: "",
    externalIds: { venueMlb: 19 },
    homePitcherId: "home-pitcher",
    homeTeamId: "home",
    id: "game-park",
    modelProbability: 0.5,
    odds: {
      moneyline: {
        displayLine: "Pending",
        id: "ml",
        line: 0,
        market: "moneyline",
        movement: "",
        price: 0,
        sportsbook: "",
      },
      spread: {
        displayLine: "Pending",
        id: "spread",
        line: 0,
        market: "spread",
        movement: "",
        price: 0,
        sportsbook: "",
      },
      total: {
        displayLine: "8.5",
        id: "total",
        line: 8.5,
        market: "total",
        movement: "",
        price: -110,
        sportsbook: "",
      },
    },
    scheduledAt: "2026-06-25T23:00:00.000Z",
    status: "scheduled",
    venue: "Test Park",
    weatherId: "weather-game",
  };
}
