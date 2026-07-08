import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOddsPipeResponse } from "../src/providers/odds/normalize-oddspipe.ts";

test("recognizes player-prop market keys and extracts category + player name", () => {
  const records = normalizeOddsPipeResponse([
    {
      americanOdds: -115,
      market: "player_strikeouts",
      player_name: "Spencer Strider",
      point: 6.5,
      side: "over",
      sportsbook: "DraftKings",
    },
    {
      americanOdds: 105,
      market: "batter_hits",
      playerName: "Mookie Betts",
      point: 0.5,
      side: "over",
      sportsbook: "FanDuel",
    },
    {
      americanOdds: 285,
      market: "batter_home_runs",
      point: 0.5,
      selection: "Aaron Judge",
      side: "over",
      sportsbook: "BetMGM",
    },
  ]);

  assert.equal(records.length, 3);
  assert.equal(records[0].market, "player-prop");
  assert.equal(records[0].propCategory, "Strikeouts");
  assert.equal(records[0].playerName, "Spencer Strider");
  assert.equal(records[1].propCategory, "Hits");
  assert.equal(records[1].playerName, "Mookie Betts");
  assert.equal(records[2].propCategory, "Home Runs");
  assert.equal(records[2].playerName, "Aaron Judge");
});

test("still normalizes existing game-level markets unchanged", () => {
  const records = normalizeOddsPipeResponse([
    { americanOdds: -120, market: "h2h", selection: "Dodgers", sportsbook: "Consensus" },
    { americanOdds: -110, market: "totals", point: 8.5, selection: "Over", sportsbook: "Consensus" },
    { price: "-115", market: "run_line", point: "-1.5", selection: "Yankees", sportsbook: "Consensus" },
    { price: "-105", market: "team_totals", point: "4.5", selection: "Dodgers Over", sportsbook: "Consensus" },
  ]);

  assert.equal(records[0].market, "moneyline");
  assert.equal(records[0].propCategory, undefined);
  assert.equal(records[1].market, "total");
  assert.equal(records[2].market, "spread");
  assert.equal(records[2].line, -1.5);
  assert.equal(records[3].market, "team-total");
  assert.equal(records[3].line, 4.5);
});

test("normalizes nested event bookmaker market outcome responses", () => {
  const records = normalizeOddsPipeResponse({
    data: [
      {
        away_team: "Boston Red Sox",
        bookmakers: [
          {
            key: "draftkings",
            markets: [
              {
                key: "h2h",
                last_update: "2026-07-08T12:00:00.000Z",
                outcomes: [
                  { name: "New York Yankees", price: -145 },
                  { name: "Boston Red Sox", price: 125 },
                ],
              },
              {
                key: "batter_total_bases",
                outcomes: [
                  {
                    description: "Aaron Judge",
                    name: "Over",
                    point: 1.5,
                    price: 110,
                  },
                ],
              },
            ],
            title: "DraftKings",
          },
        ],
        home_team: "New York Yankees",
        id: "event-1",
      },
    ],
  });

  assert.equal(records.length, 3);
  assert.equal(records[0].eventId, "event-1");
  assert.equal(records[0].sportsbook, "DraftKings");
  assert.equal(records[0].market, "moneyline");
  assert.equal(records[2].market, "player-prop");
  assert.equal(records[2].propCategory, "Total Bases");
  assert.equal(records[2].playerName, "Aaron Judge");
});

test("drops records with an unrecognized market key", () => {
  const records = normalizeOddsPipeResponse([
    { americanOdds: -110, market: "some_unknown_future_market", sportsbook: "Consensus" },
  ]);

  assert.equal(records.length, 0);
});
