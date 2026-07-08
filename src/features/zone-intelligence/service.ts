import type { Pitcher, Player, Team } from "../../models/mlb.ts";
import type { DailySlateGame, DailySlateProp } from "../../services/daily-slate/types.ts";
import {
  type BatterPitchProfile,
  type MatchupIntelligenceResult,
  type MatchupZoneOverlayCell,
  type PitchProfile,
} from "../../services/matchup/index.ts";
import { loadMatchupIntelligence } from "../../services/matchup-selection.ts";
import type { BatterIntelligence, PitcherIntelligence } from "../../services/player-intelligence/index.ts";

export interface ZoneCellViewModel {
  classification?: "advantage" | "neutral" | "risk";
  intensity: number;
  label: string;
  meta: string;
  zone: number;
}

export interface ZoneIntelligenceViewModel {
  batter: Player;
  batterPitchRows: Array<{
    average: string;
    barrelPercent: string;
    damageScore: number;
    hardHitPercent: string;
    pitchName: string;
    runValue: string;
    slugging: string;
    whiffPercent: string;
    expectedAverage: string;
    expectedSlugging: string;
  }>;
  batterTeam: Team;
  context: Array<{ label: string; value: string; meta?: string }>;
  dataSources: string[];
  game: DailySlateGame;
  gameTime: string;
  matchup: {
    confidence: number;
    overallMatch: number;
    pitchMatch: number;
    recentMatch: number;
    zoneMatch: number;
  };
  overlayCells: ZoneCellViewModel[];
  pitchArsenalRows: Array<{
    groundBallPercent: string;
    hardHitAllowed: string;
    horizontalBreak: string;
    pitchName: string;
    putAwayPercent: string;
    release: string;
    sampleSize: string;
    spinRate: string;
    strikePercent: string;
    usagePercent: string;
    velocity: string;
    verticalBreak: string;
    whiffPercent: string;
    zonePercent: string;
  }>;
  pitchComparisons: Array<{
    contactMatch: number;
    expectedDamageMatch: number;
    movementMatch: number;
    pitchName: string;
    reasons: string[];
    score: number;
    usagePercent: string;
    velocityMatch: number;
    zoneMatch: number;
  }>;
  pitchUsage: Array<{
    label: string;
    value: number;
  }>;
  pitcher: Pitcher;
  pitcherHeatCells: ZoneCellViewModel[];
  pitcherIntelligence?: {
    recentForm: number;
    source: string;
    trendCount: number;
  };
  pitcherTeam: Team;
  reasons: string[];
  selectedProp?: DailySlateProp;
  summary: string;
  zoneDamageCells: ZoneCellViewModel[];
  zoneReasons: string[];
}

export async function getZoneIntelligence({
  batterId,
  pitcherId,
}: {
  batterId?: string;
  pitcherId?: string;
} = {}): Promise<ZoneIntelligenceViewModel> {
  const { batterIntelligence, matchup, pitcherIntelligence, selection } =
    await loadMatchupIntelligence({ batterId, pitcherId });

  return buildZoneIntelligenceViewModel({
    ...selection,
    batterIntelligence,
    matchup,
    pitcherIntelligence,
  });
}

export function buildZoneIntelligenceViewModel({
  batter,
  batterIntelligence,
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
}): ZoneIntelligenceViewModel {
  return {
    batter,
    batterPitchRows: buildBatterPitchRows(matchup),
    batterTeam,
    context: buildContext({ batterTeam, game, pitcherTeam }),
    dataSources: Array.from(
      new Set(
        [
          matchup.arsenal.source,
          ...matchup.batterProfiles.map((profile) => profile.source),
          pitcherIntelligence?.source,
          batterIntelligence?.source,
        ].flatMap((source) => (source ? [source] : [])),
      ),
    ),
    game,
    gameTime: formatGameTime(game.game.scheduledAt),
    matchup: {
      confidence: matchup.confidence,
      overallMatch: matchup.overallMatchupScore,
      pitchMatch: matchup.pitchTypeMatch.score,
      recentMatch: matchup.recentMatchup.score,
      zoneMatch: matchup.zoneMatch.score,
    },
    overlayCells: buildOverlayCells(matchup.zoneMatch.overlay ?? []),
    pitchArsenalRows: matchup.arsenal.profiles.map(buildPitchArsenalRow),
    pitchComparisons: matchup.pitchTypeMatch.matches.map((match) => ({
      contactMatch: match.contactMatch,
      expectedDamageMatch: match.expectedDamageMatch,
      movementMatch: match.movementMatch,
      pitchName: match.pitchName,
      reasons: match.reasons,
      score: match.score,
      usagePercent: formatPercent(match.usagePercent),
      velocityMatch: match.velocityMatch,
      zoneMatch: match.zoneMatch.score,
    })),
    pitcher,
    pitcherHeatCells: buildPitcherHeatCells(matchup.arsenal.profiles),
    pitcherIntelligence: pitcherIntelligence
      ? {
          recentForm: pitcherIntelligence.recentForm.score,
          source: pitcherIntelligence.source,
          trendCount: pitcherIntelligence.trends.length,
        }
      : undefined,
    pitcherTeam,
    pitchUsage: matchup.pitchMix.map((pitch) => ({
      label: pitch.pitchName,
      value: Math.round(pitch.usagePercent),
    })),
    reasons: matchup.reasons,
    selectedProp,
    summary: buildSummary({ batter, game, matchup, pitcher }),
    zoneDamageCells: buildZoneDamageCells(matchup),
    zoneReasons: matchup.zoneMatch.reasons,
  };
}

function buildPitchArsenalRow(profile: PitchProfile) {
  return {
    groundBallPercent: formatPercent(profile.groundBallPercent),
    hardHitAllowed: formatPercent(profile.hardHitPercent),
    horizontalBreak: formatInches(profile.horizontalBreakInches),
    pitchName: profile.pitchName,
    putAwayPercent: formatPercent(profile.putAwayPercent),
    release: [
      `H ${formatFeet(profile.releaseHeightFeet)}`,
      `S ${formatFeet(profile.releaseSideFeet)}`,
      `E ${formatFeet(profile.extensionFeet)}`,
    ].join(" / "),
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

function buildBatterPitchRows(matchup: MatchupIntelligenceResult) {
  const profilesByPitch = new Map<string, BatterPitchProfile[]>();

  for (const profile of matchup.batterProfiles) {
    for (const pitchProfile of profile.pitchProfiles) {
      profilesByPitch.set(pitchProfile.pitchType, [
        ...(profilesByPitch.get(pitchProfile.pitchType) ?? []),
        pitchProfile,
      ]);
    }
  }

  return matchup.arsenal.profiles.map((pitchProfile) => {
    const batterProfiles = profilesByPitch.get(pitchProfile.pitchType) ?? [];

    return {
      average: formatDecimal(averageNullable(batterProfiles.map((profile) => profile.average)), 3),
      barrelPercent: formatPercent(averageNullable(batterProfiles.map((profile) => profile.barrelPercent))),
      damageScore: Math.round(
        averageNullable(batterProfiles.map((profile) => profile.expectedDamageRating)) ?? 50,
      ),
      expectedAverage: formatDecimal(
        averageNullable(batterProfiles.map((profile) => profile.expectedBattingAverage)),
        3,
      ),
      expectedSlugging: formatDecimal(
        averageNullable(batterProfiles.map((profile) => profile.expectedSlugging)),
        3,
      ),
      hardHitPercent: formatPercent(averageNullable(batterProfiles.map((profile) => profile.hardHitPercent))),
      pitchName: pitchProfile.pitchName,
      runValue: formatSignedDecimal(averageNullable(batterProfiles.map((profile) => profile.runValue))),
      slugging: formatDecimal(averageNullable(batterProfiles.map((profile) => profile.slugging)), 3),
      whiffPercent: formatPercent(averageNullable(batterProfiles.map((profile) => profile.whiffPercent))),
    };
  });
}

function buildPitcherHeatCells(profiles: PitchProfile[]) {
  const values = new Map<number, number>();

  for (const profile of profiles) {
    for (const cell of profile.heatMap.cells) {
      if (!cell.zone || cell.zone < 1 || cell.zone > 9) {
        continue;
      }

      values.set(
        cell.zone,
        (values.get(cell.zone) ?? 0) + (cell.frequencyPercent * profile.usagePercent) / 100,
      );
    }
  }

  return buildNineZoneGrid((zone) => {
    const value = values.get(zone) ?? 0;

    return {
      intensity: normalizeIntensity(value, 0, 24),
      label: formatPercent(value),
      meta: "Pitch frequency",
      zone,
    };
  });
}

function buildZoneDamageCells(matchup: MatchupIntelligenceResult) {
  const values = new Map<number, number>();

  for (const cell of matchup.zoneMatch.overlay ?? []) {
    if (!cell.zone || cell.zone < 1 || cell.zone > 9) {
      continue;
    }

    values.set(cell.zone, cell.batterDamageRating);
  }

  for (const zone of [...(matchup.zoneMatch.hotZones ?? []), ...(matchup.zoneMatch.coldZones ?? [])]) {
    if (!zone.zone || zone.zone < 1 || zone.zone > 9) {
      continue;
    }

    values.set(zone.zone, zone.damageRating);
  }

  return buildNineZoneGrid((zone) => {
    const value = values.get(zone) ?? 50;

    return {
      intensity: normalizeIntensity(value, 25, 85),
      label: String(Math.round(value)),
      meta: "Damage",
      zone,
    };
  });
}

function buildOverlayCells(cells: MatchupZoneOverlayCell[]) {
  const values = new Map<number, MatchupZoneOverlayCell>();

  for (const cell of cells) {
    if (!cell.zone || cell.zone < 1 || cell.zone > 9) {
      continue;
    }

    values.set(cell.zone, cell);
  }

  return buildNineZoneGrid((zone) => {
    const cell = values.get(zone);

    return {
      classification: cell?.classification ?? "neutral",
      intensity: normalizeIntensity(cell?.score ?? 50, 25, 85),
      label: cell ? String(Math.round(cell.score)) : "50",
      meta: cell ? `${formatPercent(cell.pitcherFrequencyPercent)} freq` : "Neutral",
      zone,
    };
  });
}

function buildNineZoneGrid(
  build: (zone: number) => Omit<ZoneCellViewModel, "zone"> & { zone?: number },
) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((zone) => ({
    ...build(zone),
    zone,
  }));
}

function buildContext({
  batterTeam,
  game,
  pitcherTeam,
}: {
  batterTeam: Team;
  game: DailySlateGame;
  pitcherTeam: Team;
}) {
  return [
    {
      label: "Weather",
      meta: game.weather.weatherApplicable ? "Applicable" : "Not applicable",
      value: game.weather.summary,
    },
    {
      label: "Ballpark",
      meta: `Run ${formatRating(game.game.ballpark?.runFactor)}`,
      value: game.game.ballpark?.name ?? game.game.venue,
    },
    {
      label: "Bullpen",
      meta: pitcherTeam.abbreviation,
      value: formatRating(pitcherTeam.strength?.bullpen.value),
    },
    {
      label: "Lineup",
      meta: batterTeam.lineup?.status ?? "unavailable",
      value: formatRating(batterTeam.lineup?.overallStrength),
    },
  ];
}

function buildSummary({
  batter,
  game,
  matchup,
  pitcher,
}: {
  batter: Player;
  game: DailySlateGame;
  matchup: MatchupIntelligenceResult;
  pitcher: Pitcher;
}) {
  const reason = matchup.reasons[0] ?? "The matchup is neutral with current data.";

  return `${batter.fullName} versus ${pitcher.fullName} grades ${matchup.overallMatchupScore}/100 overall with a ${matchup.zoneMatch.score}/100 Zone Match and ${matchup.pitchTypeMatch.score}/100 Pitch Match. ${reason} Context includes ${game.weather.summary} at ${game.game.venue}.`;
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

function formatDecimal(value: number | null | undefined, digits: number) {
  return value === undefined || value === null || Number.isNaN(value)
    ? "-"
    : value.toFixed(digits);
}

function formatSignedDecimal(value: number | null | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatMph(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : `${value.toFixed(1)}`;
}

function formatFeet(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : `${value.toFixed(1)}`;
}

function formatInches(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : `${value.toFixed(1)}"`;
}

function formatRpm(value: number | null | undefined) {
  return value === undefined || value === null ? "-" : String(Math.round(value));
}

function formatRating(value: number | undefined | null) {
  return value === undefined || value === null ? "-" : String(Math.round(value));
}

function averageNullable(values: Array<number | null | undefined>) {
  const valid = values.filter(
    (value): value is number => value !== undefined && value !== null && Number.isFinite(value),
  );

  return valid.length === 0
    ? undefined
    : valid.reduce((total, value) => total + value, 0) / valid.length;
}

function normalizeIntensity(value: number, low: number, high: number) {
  return Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));
}
