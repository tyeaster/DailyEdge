import type { Pitcher, Player, Team } from "../models/mlb.ts";
import type {
  DailySlateGame,
  DailySlateProp,
  DailySlateViewModel,
} from "./daily-slate/types.ts";
import { matchupService, type MatchupIntelligenceResult } from "./matchup/index.ts";
import {
  playerIntelligenceService,
  type BatterIntelligence,
  type PitcherIntelligence,
} from "./player-intelligence/index.ts";

/**
 * Shared "pick a pitcher-vs-batter matchup from today's slate and load
 * every intelligence source for it" pipeline. Originally lived entirely
 * inside src/features/zone-intelligence/service.ts; extracted here so
 * Pitch Intelligence (src/features/pitch-intelligence/) can reuse the
 * exact same selection/loading logic instead of duplicating it -
 * Zone Intelligence's own buildZoneIntelligenceViewModel() is unchanged
 * and still covered by tests/zone-intelligence.test.ts.
 */
export interface MatchupSelection {
  batter: Player;
  batterTeam: Team;
  game: DailySlateGame;
  pitcher: Pitcher;
  pitcherTeam: Team;
  selectedProp?: DailySlateProp;
}

export interface LoadedMatchupIntelligence {
  batterIntelligence?: BatterIntelligence;
  matchup: MatchupIntelligenceResult;
  pitcherIntelligence?: PitcherIntelligence;
  season: number;
  selection: MatchupSelection;
}

export async function loadMatchupIntelligence({
  batterId,
  pitcherId,
}: {
  batterId?: string;
  pitcherId?: string;
} = {}): Promise<LoadedMatchupIntelligence> {
  const { getDailySlate } = await import("./daily-slate/service.ts");
  const slate = await getDailySlate();
  const selection = selectMatchup(slate, { batterId, pitcherId });
  const season = getSeason(selection.game.game.scheduledAt);
  const [pitcherIntelligence, batterIntelligence] = await Promise.all([
    loadPitcherIntelligence(selection, season),
    loadBatterIntelligence(selection, season),
  ]);
  const matchup = await matchupService.getMatchupIntelligence(
    {
      asOfDate: selection.game.game.scheduledAt.slice(0, 10),
      batterIds: [selection.batter.id],
      batterMlbIds: selection.batter.externalIds?.mlb
        ? [selection.batter.externalIds.mlb]
        : undefined,
      batterNames: [selection.batter.fullName],
      pitcherId: selection.pitcher.id,
      pitcherMlbId: selection.pitcher.externalIds?.mlb,
      pitcherName: selection.pitcher.fullName,
      season,
    },
    {
      ballpark: selection.game.game.ballpark,
      bullpen: selection.batterTeam.strength?.bullpen,
      lineup: selection.batterTeam.lineup,
      pitcherIntelligence,
      weather: selection.game.weather,
    },
  );

  return {
    batterIntelligence:
      batterIntelligence && "available" in batterIntelligence && batterIntelligence.available
        ? batterIntelligence
        : undefined,
    matchup,
    pitcherIntelligence,
    season,
    selection,
  };
}

async function loadPitcherIntelligence(selection: MatchupSelection, season: number) {
  try {
    return await playerIntelligenceService.getPitcher({
      context: {
        ballpark: selection.game.game.ballpark,
        game: selection.game.game,
        lineup: selection.pitcherTeam.lineup,
        opponent: selection.batterTeam,
        prediction: selection.game.game.prediction,
        team: selection.pitcherTeam,
        weather: selection.game.weather,
      },
      pitcher: selection.pitcher,
      season,
    });
  } catch {
    return undefined;
  }
}

async function loadBatterIntelligence(selection: MatchupSelection, season: number) {
  try {
    return await playerIntelligenceService.getBatter({
      batter: selection.batter,
      context: {
        ballpark: selection.game.game.ballpark,
        game: selection.game.game,
        lineup: selection.batterTeam.lineup,
        opponent: selection.pitcherTeam,
        prediction: selection.game.game.prediction,
        team: selection.batterTeam,
        weather: selection.game.weather,
      },
      season,
    });
  } catch {
    return undefined;
  }
}

function selectMatchup(
  slate: DailySlateViewModel,
  { batterId, pitcherId }: { batterId?: string; pitcherId?: string },
): MatchupSelection {
  const hitterProps = getHitterProps(slate);
  const selectedProp =
    hitterProps.find((prop) => prop.player.id === batterId) ?? hitterProps[0];
  const selectedPropGame = selectedProp
    ? findGameById(slate, selectedProp.prop.gameId)
    : undefined;
  const pitcherGame = pitcherId
    ? slate.games.find(
        (candidate) =>
          candidate.awayPitcher.id === pitcherId ||
          candidate.homePitcher.id === pitcherId,
      )
    : undefined;
  const game = pitcherGame ?? selectedPropGame ?? slate.games[0];
  const batterTeam =
    selectedProp && selectedProp.prop.gameId === game.game.id
      ? selectedProp.team
      : game.awayTeam.id === game.game.awayTeamId
        ? game.awayTeam
        : game.homeTeam;
  const batter =
    selectedProp && selectedProp.team.id === batterTeam.id
      ? (selectedProp.player as Player)
      : buildFallbackBatter(batterTeam);
  const pitcher =
    pitcherId === game.awayPitcher.id
      ? game.awayPitcher
      : pitcherId === game.homePitcher.id
        ? game.homePitcher
        : batterTeam.id === game.awayTeam.id
          ? game.homePitcher
          : game.awayPitcher;
  const pitcherTeam = pitcher.teamId === game.awayTeam.id ? game.awayTeam : game.homeTeam;

  return { batter, batterTeam, game, pitcher, pitcherTeam, selectedProp };
}

function getHitterProps(slate: DailySlateViewModel) {
  return slate.propCategories
    .filter(
      (category) =>
        category.label === "Hits" ||
        category.label === "Total Bases" ||
        category.label === "Home Runs",
    )
    .flatMap((category) => category.props);
}

function findGameById(slate: DailySlateViewModel, gameId: string) {
  return slate.games.find((game) => game.game.id === gameId) ?? slate.games[0];
}

function buildFallbackBatter(team: Team): Player {
  const lineupPlayer = team.lineup?.players[0];

  if (lineupPlayer) {
    return {
      bats: lineupPlayer.battingHand === "U" ? "R" : lineupPlayer.battingHand,
      externalIds: { mlb: lineupPlayer.mlbId },
      fullName: lineupPlayer.fullName,
      id: `mlb-player-${lineupPlayer.mlbId}`,
      position: lineupPlayer.position,
      teamId: team.id,
      throws: "R",
    };
  }

  return {
    bats: "R",
    fullName: "Projected Hitter",
    id: "projected-hitter",
    position: "DH",
    teamId: team.id,
    throws: "R",
  };
}

function getSeason(scheduledAt: string) {
  return new Date(scheduledAt).getUTCFullYear();
}
