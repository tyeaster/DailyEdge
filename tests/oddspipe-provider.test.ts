import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildOddsPipeEndpoint,
  OddsPipeProvider,
} from "../src/providers/odds/OddsPipeProvider.ts";
import { MockOddsProvider } from "../src/providers/odds/MockOddsProvider.ts";
import { ReplayOddsProvider } from "../src/providers/odds/ReplayOddsProvider.ts";

test("buildOddsPipeEndpoint accepts a base URL or full endpoint", () => {
  assert.equal(
    buildOddsPipeEndpoint("https://api.oddspipe.com"),
    "https://api.oddspipe.com/v1/odds",
  );
  assert.equal(
    buildOddsPipeEndpoint("https://api.oddspipe.com/"),
    "https://api.oddspipe.com/v1/odds",
  );
  assert.equal(
    buildOddsPipeEndpoint("https://api.oddspipe.com/v1/odds"),
    "https://api.oddspipe.com/v1/odds",
  );
});

test("live OddsPipe provider sends auth, query params, and exposes rate limits", async () => {
  let requestedUrl = "";
  let authorization = "";
  const provider = new OddsPipeProvider(
    "https://example.test/v1/odds",
    "secret-token",
    new ReplayOddsProvider(await tempReplayDir()),
    async (input, init) => {
      requestedUrl = String(input);
      authorization = String(new Headers(init?.headers).get("authorization"));

      return new Response(
        JSON.stringify({
          records: [
            {
              event_id: "event-1",
              market: "moneyline",
              price: -120,
              selection: "Yankees",
              sportsbook: "DraftKings",
            },
          ],
        }),
        {
          headers: {
            "content-type": "application/json",
            "x-ratelimit-limit": "100",
            "x-ratelimit-remaining": "99",
            "x-ratelimit-reset": "60",
          },
          status: 200,
        },
      );
    },
  );

  const response = await provider.getOdds({
    date: "2026-07-08",
    eventIds: ["event-1"],
    markets: ["moneyline", "spread"],
    sport: "mlb",
  });
  const url = new URL(requestedUrl);

  assert.equal(authorization, "Bearer secret-token");
  assert.equal(url.searchParams.get("sport"), "mlb");
  assert.equal(url.searchParams.get("date"), "2026-07-08");
  assert.equal(url.searchParams.get("eventIds"), "event-1");
  assert.equal(url.searchParams.get("markets"), "moneyline,spread");
  assert.equal(response.mode, "live");
  assert.equal(response.rateLimit?.limit, "100");
  assert.equal(response.rateLimit?.remaining, "99");
  assert.equal(response.records.length, 1);
});

test("live OddsPipe provider includes retry-after detail on rate-limit errors", async () => {
  const provider = new OddsPipeProvider(
    "https://example.test/v1/odds",
    "secret-token",
    new ReplayOddsProvider(await tempReplayDir()),
    async () =>
      new Response("Too many requests", {
        headers: { "retry-after": "30" },
        status: 429,
      }),
  );

  await assert.rejects(
    provider.getOdds({ sport: "mlb" }),
    /OddsPipe request failed with 429; retry-after=30; body=Too many requests/,
  );
});

test("replay odds provider preserves normalized records and rate-limit metadata", async () => {
  const replay = new ReplayOddsProvider(await tempReplayDir());
  const request = { markets: ["moneyline" as const], sport: "mlb" as const };

  await replay.writeReplay({
    provider: "oddspipe",
    rateLimit: { limit: "100", remaining: "88" },
    raw: { records: [] },
    records: [
      {
        americanOdds: -120,
        id: "record-1",
        impliedProbability: 0.545,
        market: "moneyline",
        selection: "Yankees",
        sportsbook: "DraftKings",
        updatedAt: "2026-07-08T12:00:00.000Z",
      },
    ],
    request,
  });

  const response = await replay.getOdds(request);

  assert.equal(response.mode, "replay");
  assert.equal(response.provider, "oddspipe");
  assert.equal(response.rateLimit?.remaining, "88");
  assert.equal(response.records[0].selection, "Yankees");
});

test("mock odds provider filters missing odds by event and market", async () => {
  const provider = new MockOddsProvider();
  const response = await provider.getOdds({
    eventIds: ["missing-game"],
    markets: ["moneyline"],
    sport: "mlb",
  });

  assert.equal(response.mode, "mock");
  assert.equal(response.records.length, 0);
});

async function tempReplayDir() {
  return mkdtemp(path.join(os.tmpdir(), "trueline-odds-replay-"));
}
