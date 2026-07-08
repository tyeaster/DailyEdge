import type { Pitcher, Player, Team } from "../../models/mlb.ts";
import type { DailySlateGame, DailySlateProp } from "../../services/daily-slate/types.ts";
import type { MatchupIntelligenceResult, PitchProfile } from "../../services/matchup/index.ts";
import { loadMatchupIntelligence } from "../../services/matchup-selection.ts";
import type { BatterIntelligence, PitcherIntelligence } from "../../services/player-intelligence/index.ts";

export interface PitchIntelligenceViewModel {
  arsenalRows: Array<{
    groundBallPercent: string;
    hardHitAllowed: string;
    horizontalBreak: string;
    pitchName: string;
    putAwayPercent: string;
    sampleSize: string;
    spinRate: string;
    strikePercent: string;
    usagePercent: string;
    velocity: string;
    verticalBreak: string;
    whiffPercent: string;
    zonePercent: string;
  }>;
  batter: Player;
  batterTeam: Team;
  contextScores: Array<{ explanation: string; label: string; score: number }>;
  disciplineRows: Array<{
    chasePercent: string;
    contactPercent: string;
    pitchName: string;
    strikeoutPercent: string;
    swingPercent: string;
    takePercent: string;
    whiffPercent: string;
  }>;
  explanation: string;
  game: DailySlateGame;
  gameTime: string;
  matchup: {
    confidence: number;
    overallMatch: number;
    pitchMatch: number;
  };
  pitchMix: Array<{ label: string; value: number }>;
  pitchScouting: Array<{
    contactMatch: number;
    expectedDamageMatch: number;
    movementMatch: number;
    pitchName: string;
    reasons: string[];
    score: number;
    topAdvantages: string[];
    topWeaknesses: string[];
    usagePercent: string;
    velocityMatch: number;
  }>;
  pitcher: Pitcher;
  pitcherIntelligence?: {
    recentForm: number;
    source: string;
    trendCount: number;
  };
  pitcherTeam: Team;
  primaryPitchType: string | null;
  selectedProp?: DailySlateProp;
  topAdvantages: string[];
  topWeaknesses: string[];
}

export async function getPitchIntelligence({
  batterId,
  pitcherId,
}: {
  batterId?: string;
  pitcherId?: string;
} = {}): Promise<PitchIntelligenceViewModel> {
  const { batterIntelligence, matchup, pitcherIntelligence, selection } =
    await loadMatchupIntelligence({ batterId, pitcherId });

  return buildPitchIntelligenceViewModel({
    ...selection,
    batterIntelligence,
    matchup,
    pitcherIntelligence,
  });
}

export function buildPitchIntelligenceViewModel({
  batter,
  batterTeam,
  game,
  matchup,
  pitcher,
  pitcherIntelligence,
  pitcherTeam,
  selectedProp,
}: {
  batter: Player;
  batterIntelligence?: BatterIntelligence;
  batterTeam: Team;
  game: DailySlateGame;
  matchup: MatchupIntelligenceResult;
  pitcher: Pitcher;
  pitcherIntelligence?: PitcherIntelligence;
  pitcherTeam: Team;
  selectedProp?: DailySlateProp;
}): PitchIntelligenceViewModel {
  return {
    arsenalRows: matchup.arsenal.profiles.map(buildArsenalRow),
    batter,
    batterTeam,
    contextScores: matchup.contextScores.map((context) => ({
      explanation: context.explanation,
      label: context.label,
      score: context.score,
    })),
    disciplineRows: buildDisciplineRows(matchup),
    explanation: matchup.pitchTypeMatch.explanation,
    game,
    gameTime: formatGameTime(game.game.scheduledAt),
    matchup: {
      confidence: matchup.confidence,
      overallMatch: matchup.overallMatchupScore,
      pitchMatch: matchup.pitchTypeMatch.score,
    },
    pitchMix: matchup.pitchMix.map((pitch) => ({
      label: pitch.pitchName,
      value: Math.round(pitch.usagePercent),
    })),
    pitchScouting: matchup.pitchTypeMatch.matches.map((match) => ({
      contactMatch: match.contactMatch,
      expectedDamageMatch: match.expectedDamageMatch,
      movementMatch: match.movementMatch,
      pitchName: match.pitchName,
      reasons: match.reasons,
      score: match.score,
      topAdvantages: match.topAdvantages ?? [],
      topWeaknesses: match.topWeaknesses ?? [],
      usagePercent: formatPercent(match.usagePercent),
      velocityMatch: match.velocityMatch,
    })),
    pitcher,
    pitcherIntelligence: pitcherIntelligence
      ? {
          recentForm: pitcherIntelligence.recentForm.score,
          source: pitcherIntelligence.source,
          trendCount: pitcherIntelligence.trends.length,
        }
      : undefined,
    pitcherTeam,
    primaryPitchType: matchup.arsenal.primaryPitchType,
    selectedProp,
    topAdvantages: matchup.pitchTypeMatch.topAdvantages,
    topWeaknesses: matchup.pitchTypeMatch.topWeaknesses,
  };
}

function buildArsenalRow(profile: PitchProfile) {
  return {
    groundBallPercent: formatPercent(profile.groundBallPercent),
    hardHitAllowed: formatPercent(profile.hardHitPercent),
    horizontalBreak: formatInches(profile.horizontalBreakInches),
    pitchName: profile.pitchName,
    putAwayPercent: formatPercent(profile.putAwayPercent),
    sampleSize: String(profile.sampleSize),
    spinRate: formatRpm(profile.spinRateRpm),
    strikePercent: formatPercent(profile.strikePercent),
    usagePercent: formatPercent(profile.usagePercent),
    velocity: formatMph(profile.averageVelocityMph),
    verticalBreak: formatInches(profile.verticalBreakInches),
    whiffPercent: formatPercent(profile.whiffPercent),
    zonePercent: formatPercent(profile.zonePercent),
  };
}

function buildDisciplineRows(matchup: MatchupIntelligenceResult) {
  const profilesByPitch = new Map<
    string,
    { chasePercent: number[]; contactPercent: number[]; pitchName: string; strikeoutPercent: number[]; swingPercent: number[]; takePercent: number[]; whiffPercent: number[] }
  >();

  for (const profile of matchup.batterProfiles) {
    for (const pitchProfile of profile.pitchProfiles) {
      const existing = profilesByPitch.get(pitchProfile.pitchType) ?? {
        chasePercent: [],
        contactPercent: [],
        pitchName: pitchProfile.pitchName,
        strikeoutPercent: [],
        swingPercent: [],
        takePercent: [],
        whiffPercent: [],
      };

      if (pitchProfile.chasePercent !== null) existing.chasePercent.push(pitchProfile.chasePercent);
      if (pitchProfile.contactPercent !== null) existing.contactPercent.push(pitchProfile.contactPercent);
      if (pitchProfile.strikeoutPercent !== null) existing.strikeoutPercent.push(pitchProfile.strikeoutPercent);
      if (pitchProfile.swingPercent !== null) existing.swingPercent.push(pitchProfile.swingPercent);
      if (pitchProfile.takePercent !== null) existing.takePercent.push(pitchProfile.takePercent);
      if (pitchProfile.whiffPercent !== null) existing.whiffPercent.push(pitchProfile.whiffPercent);

      profilesByPitch.set(pitchProfile.pitchType, existing);
    }
  }

  return matchup.arsenal.profiles.map((pitchProfile) => {
    const discipline = profilesByPitch.get(pitchProfile.pitchType);

    return {
      chasePercent: formatPercent(averageNullable(discipline?.chasePercent ?? [])),
      contactPercent: formatPercent(averageNullable(discipline?.contactPercent ?? [])),
      pitchName: pitchProfile.pitchName,
      strikeoutPercent: formatPercent(averageNullable(discipline?.strikeoutPercent ?? [])),
      swingPercent: formatPercent(averageNullable(discipline?.swingPercent ?? [])),
      takePercent: formatPercent(averageNullable(discipline?.takePercent ?? [])),
      whiffPercent: formatPercent(averageNullable(discipline?.whiffPercent ?? [])),
    };
  });
}

function formatGameTime(scheduledAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(scheduledAt));
}

function formatPercent(value: number | null | undefined) {
  return value === undefined || value === null || Number.isNaN(value)
    ? "-"
    : `${Math.round(value)}%`;
}

function formatMph(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : `${value.toFixed(1)}`;
}

function formatInches(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : `${value.toFixed(1)}"`;
}

function formatRpm(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : String(Math.round(value));
}

function averageNullable(values: number[]) {
  return values.length === 0
    ? undefined
    : values.reduce((total, value) => total + value, 0) / values.length;
}
