import assert from "node:assert/strict";
import test from "node:test";

import type { Injury, Pitcher, Player, PlayerProp, Team } from "../src/models/mlb.ts";
import { resolveBets, resolveInjuries, resolveProps } from "../src/services/daily-slate/resolve.ts";

const team: Team = {
  abbreviation: "LAD",
  city: "Los Angeles",
  division: "West",
  id: "team-lad",
  league: "NL",
  name: "Dodgers",
};

const player: Player = {
  bats: "R",
  fullName: "Mookie Betts",
  id: "player-betts",
  position: "2B",
  teamId: team.id,
  throws: "R",
};

const playerById: Record<string, Player | Pitcher> = { [player.id]: player };
const teamById: Record<string, Team> = { [team.id]: team };

test("live injury for a player outside today's lineups no longer crashes the slate", () => {
  // The exact production scenario: a real IL transaction references a
  // player who - being injured - is not in any of today's lineups.
  const injuries: Injury[] = [
    buildInjury({ playerId: "mlb-player-999999", playerName: "Injured Star", teamId: team.id }),
    buildInjury({ id: "injury-2", playerId: player.id, teamId: team.id }),
  ];

  const resolved = resolveInjuries(injuries, playerById, teamById);

  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].player.fullName, "Injured Star");
  assert.equal(resolved[0].team.id, team.id);
  assert.equal(resolved[1].player.id, player.id);
});

test("injuries for teams not on today's slate are excluded", () => {
  const resolved = resolveInjuries(
    [buildInjury({ playerName: "Someone", teamId: "team-not-playing" })],
    playerById,
    teamById,
  );

  assert.equal(resolved.length, 0);
});

test("injuries with no resolvable player and no name are excluded", () => {
  const resolved = resolveInjuries(
    [buildInjury({ playerId: "mlb-player-999999", teamId: team.id })],
    playerById,
    teamById,
  );

  assert.equal(resolved.length, 0);
});

test("props with unresolvable players are skipped instead of throwing", () => {
  const props: PlayerProp[] = [
    buildProp({ playerId: player.id }),
    buildProp({ id: "prop-2", playerId: "player-unknown" }),
  ];

  const resolved = resolveProps(["Hits"], props, playerById, teamById);

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].props.length, 1);
  assert.equal(resolved[0].props[0].player.id, player.id);
});

test("bets with unresolvable player or team ids keep the bet with undefined joins", () => {
  const resolved = resolveBets(
    [
      {
        confidence: { label: "High", value: 75 },
        edge: { percentage: 4, rating: "B" },
        gameId: "game-1",
        id: "bet-1",
        modelProbability: 0.55,
        odds: buildProp({ playerId: player.id }).odds,
        playerId: "player-unknown",
        prediction: undefined as never,
        rank: 1,
        recommendedUnits: 1,
        selection: "Over",
        teamId: "team-unknown",
      },
    ],
    playerById,
    teamById,
  );

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].player, undefined);
  assert.equal(resolved[0].team, undefined);
});

function buildInjury(overrides: Partial<Injury> & { teamId: string }): Injury {
  return {
    expectedReturn: "10-day IL",
    id: "injury-1",
    impactRating: 50,
    playerId: "player-none",
    status: "10-day IL",
    ...overrides,
  };
}

function buildProp(overrides: Partial<PlayerProp> & { playerId: string }): PlayerProp {
  return {
    category: "Hits",
    confidence: { label: "High", value: 74 },
    edge: { percentage: 4.6, rating: "B" },
    gameId: "game-1",
    id: "prop-1",
    odds: {
      displayLine: "Over 0.5",
      id: "odds-1",
      line: 0.5,
      market: "player-prop",
      movement: "Flat",
      price: -185,
      sportsbook: "BetMGM",
    },
    projection: "1.1 H",
    reasoning: "Test prop.",
    ...overrides,
  };
}
