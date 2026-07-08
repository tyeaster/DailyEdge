import assert from "node:assert/strict";
import test from "node:test";

import { memoryCache } from "../src/cache/MemoryCache.ts";
import { mlbTeamCatalog } from "../src/data/mlb-teams.ts";
import { getTeamDirectory } from "../src/features/team-research/service.ts";
import { MockTeamStrengthProvider } from "../src/providers/team-strength/MockTeamStrengthProvider.ts";
import { TeamStrengthService } from "../src/services/TeamStrengthService.ts";

test("builds a directory covering all 30 MLB teams, sorted by name", async () => {
  const strengthService = new TeamStrengthService(new MockTeamStrengthProvider(), memoryCache);
  const directory = await getTeamDirectory({ season: 2026, strengthService });

  assert.equal(directory.length, 30);
  assert.equal(new Set(directory.map((entry) => entry.team.id)).size, 30);

  const sortedNames = directory.map((entry) => entry.team.name);
  const expectedNames = [...sortedNames].sort((a, b) => a.localeCompare(b));

  assert.deepEqual(sortedNames, expectedNames);
});

test("every catalog entry has a unique mlb team id and venue id", () => {
  assert.equal(new Set(mlbTeamCatalog.map((team) => team.mlbTeamId)).size, 30);
  assert.equal(new Set(mlbTeamCatalog.map((team) => team.venueId)).size, 30);
});

test("degrades to an unavailable strength rating without live data", async () => {
  const strengthService = new TeamStrengthService(new MockTeamStrengthProvider(), memoryCache);
  const directory = await getTeamDirectory({ season: 2026, strengthService });
  const dodgers = directory.find((entry) => entry.team.abbreviation === "LAD");

  assert.ok(dodgers);
  assert.equal(dodgers?.team.strength?.source, "unavailable");
});
