import assert from "node:assert/strict";
import test from "node:test";

import { InjuriesService } from "../src/services/InjuriesService.ts";
import { MockInjuryProvider } from "../src/providers/injuries/MockInjuryProvider.ts";
import { normalizeMlbTransactions } from "../src/providers/injuries/MLBInjuryProvider.ts";

test("MockInjuryProvider returns deterministic IL transactions", async () => {
  const provider = new MockInjuryProvider();
  const response = await provider.getInjuries({ date: "2026-06-20" });

  assert.equal(response.mode, "mock");
  assert.equal(response.injuries.length, 2);
  assert.equal(response.injuries[0].status, "10-day IL");
});

test("normalizeMlbTransactions extracts 10-day and 15-day IL moves", () => {
  const results = normalizeMlbTransactions({
    transactions: [
      {
        date: "2026-06-20",
        description: "Diamondbacks placed OF Corbin Carroll on the 10-day injured list. Hamstring strain.",
        effectiveDate: "2026-06-20",
        id: 1,
        person: { fullName: "Corbin Carroll", id: 665742 },
        toTeam: { id: 109 },
      },
      {
        date: "2026-06-19",
        description: "Rangers placed RHP Jacob deGrom on the 15-day injured list.",
        effectiveDate: "2026-06-19",
        id: 2,
        person: { fullName: "Jacob deGrom", id: 594798 },
        toTeam: { id: 140 },
      },
    ],
  });

  assert.equal(results.length, 2);
  assert.deepEqual(results[0], {
    description: "Diamondbacks placed OF Corbin Carroll on the 10-day injured list. Hamstring strain.",
    effectiveDate: "2026-06-20",
    expectedReturn: "10-day IL",
    id: "injury-1",
    impactRating: 50,
    playerId: "mlb-player-665742",
    playerName: "Corbin Carroll",
    status: "10-day IL",
    teamId: "mlb-team-109",
  });
  assert.equal(results[1].status, "15-day IL");
});

test("normalizeMlbTransactions skips non-IL transactions and incomplete records", () => {
  const results = normalizeMlbTransactions({
    transactions: [
      {
        description: "Yankees selected the contract of a player.",
        id: 3,
        person: { fullName: "Someone", id: 1 },
        toTeam: { id: 147 },
      },
      {
        description: "placed on the 10-day injured list",
        id: 4,
        // missing person - should be skipped
        toTeam: { id: 147 },
      },
    ],
  });

  assert.equal(results.length, 0);
});

test("InjuriesService.list() maps provider data to the Injury model shape", async () => {
  const service = new InjuriesService(new MockInjuryProvider());
  const injuries = await service.list("2026-06-20");

  assert.equal(injuries.length, 2);
  assert.deepEqual(Object.keys(injuries[0]).sort(), [
    "expectedReturn",
    "id",
    "impactRating",
    "playerId",
    "playerName",
    "status",
    "teamId",
  ]);
});

test("InjuriesService.getById() finds a previously listed injury", async () => {
  const service = new InjuriesService(new MockInjuryProvider());
  const found = await service.getById("injury-mock-1");

  assert.ok(found);
  assert.equal(found?.status, "10-day IL");
});

test("InjuriesService degrades to an empty list on provider failure, not mock data", async () => {
  const failingProvider = {
    id: "failing-provider",
    async getInjuries() {
      throw new Error("network unavailable");
    },
  };

  const service = new InjuriesService(failingProvider);
  const injuries = await service.list("2026-06-20");

  assert.deepEqual(injuries, []);
});
