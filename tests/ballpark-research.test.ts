import assert from "node:assert/strict";
import test from "node:test";

import { mlbTeamCatalog } from "../src/data/mlb-teams.ts";
import { getBallparkDirectory } from "../src/features/ballpark-research/service.ts";
import type { BallparkProfile } from "../src/models/mlb.ts";
import { createBallparkUnavailable } from "../src/providers/ballparks/index.ts";
import type {
  BallparkProvider,
  BallparkProviderResponse,
  BallparkRequest,
} from "../src/providers/ballparks/index.ts";

test("builds a directory covering all 30 MLB ballparks, sorted by name", async () => {
  const directory = await getBallparkDirectory({
    provider: new StubBallparkProvider(),
    season: 2026,
  });

  assert.equal(directory.length, 30);
  assert.equal(new Set(directory.map((entry) => entry.ballpark.venueId)).size, 30);

  const sortedNames = directory.map((entry) => entry.ballpark.name);
  const expectedNames = [...sortedNames].sort((a, b) => a.localeCompare(b));

  assert.deepEqual(sortedNames, expectedNames);
});

test("carries the real park factors returned by the provider", async () => {
  const directory = await getBallparkDirectory({
    provider: new StubBallparkProvider(),
    season: 2026,
  });
  const coors = directory.find((entry) => entry.ballpark.venueId === 19);

  assert.ok(coors);
  assert.equal(coors?.ballpark.overallParkRating, 82);
  assert.equal(coors?.homeTeam.abbreviation, "COL");
});

test("every catalog venue id is unique", () => {
  assert.equal(new Set(mlbTeamCatalog.map((team) => team.venueId)).size, 30);
});

class StubBallparkProvider implements BallparkProvider {
  readonly id = "ballpark-stub";

  async getBallpark(request: BallparkRequest): Promise<BallparkProviderResponse> {
    const fetchedAt = "2026-06-26T12:00:00.000Z";
    const ballpark: BallparkProfile = {
      ...createBallparkUnavailable({
        fetchedAt,
        league: request.league,
        name: request.venueName,
        venueId: request.venueId,
      }),
      overallParkRating: request.venueId === 19 ? 82 : 50,
      source: "mock",
    };

    return { ballpark, fetchedAt, mode: "mock", provider: this.id, venueId: request.venueId };
  }
}
