import type {
  AverageReleasePoint,
  BatterMatchupProfile,
  BatterPitchProfile,
  MatchupDataSource,
  MatchupRequest,
  PitchArsenal,
  PitchHeatMap,
  PitchLocation,
  PitchMovement,
  PitchProfile,
} from "./types.ts";

export interface StatcastPitchRow {
  atBatNumber?: number | null;
  balls?: number | null;
  batter?: number | null;
  batterName?: string;
  bbType?: string;
  description?: string;
  events?: string;
  estimatedBaUsingSpeedangle?: number | null;
  estimatedWobaUsingSpeedangle?: number | null;
  gameDate?: string;
  hcX?: number | null;
  hcY?: number | null;
  hitDistanceSc?: number | null;
  launchSpeed?: number | null;
  launchAngle?: number | null;
  pThrows?: string;
  pitcher?: number | null;
  pitcherName?: string;
  pitchName?: string;
  pitchNumber?: number | null;
  pitchType?: string;
  plateX?: number | null;
  plateZ?: number | null;
  pfxX?: number | null;
  pfxZ?: number | null;
  releaseExtension?: number | null;
  releasePosX?: number | null;
  releasePosZ?: number | null;
  releaseSpeed?: number | null;
  releaseSpinRate?: number | null;
  stand?: string;
  strikes?: number | null;
  type?: string;
  zone?: number | null;
}

const STRIKE_DESCRIPTIONS = new Set([
  "called_strike",
  "swinging_strike",
  "swinging_strike_blocked",
  "foul",
  "foul_tip",
  "foul_bunt",
  "missed_bunt",
  "hit_into_play",
]);
const WHIFF_DESCRIPTIONS = new Set(["swinging_strike", "swinging_strike_blocked", "missed_bunt"]);
const SWING_DESCRIPTIONS = new Set([
  "swinging_strike",
  "swinging_strike_blocked",
  "foul",
  "foul_tip",
  "foul_bunt",
  "missed_bunt",
  "hit_into_play",
]);
const IN_ZONE = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
const HIT_EVENTS = new Set(["single", "double", "triple", "home_run"]);
const AT_BAT_EVENTS = new Set([
  "field_out",
  "strikeout",
  "single",
  "double",
  "triple",
  "home_run",
  "force_out",
  "grounded_into_double_play",
  "fielders_choice",
  "fielders_choice_out",
  "double_play",
  "sac_fly",
]);

export function buildPitchArsenal({
  fetchedAt,
  pitcherId,
  pitcherMlbId,
  pitcherName,
  request,
  rows,
  season,
  source,
}: {
  fetchedAt: string;
  pitcherId: string;
  pitcherMlbId?: number;
  pitcherName?: string;
  request?: MatchupRequest;
  rows: StatcastPitchRow[];
  season: number;
  source: MatchupDataSource;
}): PitchArsenal {
  const grouped = groupByPitch(rows);
  const profiles = Array.from(grouped.entries())
    .map(([pitchType, pitchRows]) =>
      buildPitchProfile(pitchType, pitchRows, rows.length),
    )
    .sort((left, right) => right.usagePercent - left.usagePercent);
  const dataQuality = calculateArsenalDataQuality(rows, profiles);

  return {
    dataQuality,
    fetchedAt,
    handedness: normalizeHand(rows.find((row) => row.pThrows)?.pThrows),
    overallQuality: calculateArsenalQuality(profiles),
    pitcherId,
    pitcherMlbId,
    pitcherName:
      pitcherName ??
      request?.pitcherName ??
      rows.find((row) => row.pitcherName)?.pitcherName ??
      "Unknown Pitcher",
    primaryPitchType: profiles[0]?.pitchType ?? null,
    profiles,
    season,
    source,
  };
}

export function buildBatterMatchupProfiles({
  batterIds = [],
  batterMlbIds = [],
  batterNames = [],
  fetchedAt,
  rows,
  season,
  source,
}: {
  batterIds?: string[];
  batterMlbIds?: number[];
  batterNames?: string[];
  fetchedAt: string;
  rows: StatcastPitchRow[];
  season: number;
  source: MatchupDataSource;
}): BatterMatchupProfile[] {
  const rowsByBatter = new Map<number, StatcastPitchRow[]>();

  for (const row of rows) {
    if (typeof row.batter !== "number") {
      continue;
    }

    const existing = rowsByBatter.get(row.batter) ?? [];
    existing.push(row);
    rowsByBatter.set(row.batter, existing);
  }

  const ids = batterMlbIds.length > 0 ? batterMlbIds : Array.from(rowsByBatter.keys());

  return ids.map((mlbId, index) => {
    const batterRows = rowsByBatter.get(mlbId) ?? [];
    const profiles = Array.from(groupByPitch(batterRows).entries())
      .map(([pitchType, pitchRows]) => buildBatterPitchProfile(pitchType, pitchRows))
      .sort((left, right) => right.sampleSize - left.sampleSize);

    return {
      batterId: batterIds[index] ?? `mlb-${mlbId}`,
      batterMlbId: mlbId,
      batterName:
        batterNames[index] ??
        batterRows.find((row) => row.batterName)?.batterName ??
        `MLB ${mlbId}`,
      bats: normalizeBats(batterRows.find((row) => row.stand)?.stand),
      dataQuality: calculateBatterDataQuality(batterRows, profiles),
      fetchedAt,
      pitchProfiles: profiles,
      season,
      source,
    };
  });
}

export function buildNeutralPitchArsenal(request: MatchupRequest, fetchedAt: string, source: MatchupDataSource): PitchArsenal {
  return {
    dataQuality: 0,
    fetchedAt,
    handedness: "U",
    overallQuality: 50,
    pitcherId: request.pitcherId,
    pitcherMlbId: request.pitcherMlbId,
    pitcherName: request.pitcherName ?? "Unknown Pitcher",
    primaryPitchType: null,
    profiles: [],
    season: request.season,
    source,
  };
}

export function buildNeutralBatterProfiles(request: MatchupRequest, fetchedAt: string, source: MatchupDataSource): BatterMatchupProfile[] {
  return (request.batterMlbIds ?? []).map((mlbId, index) => ({
    batterId: request.batterIds?.[index] ?? `mlb-${mlbId}`,
    batterMlbId: mlbId,
    batterName: request.batterNames?.[index] ?? `MLB ${mlbId}`,
    bats: "U",
    dataQuality: 0,
    fetchedAt,
    pitchProfiles: [],
    season: request.season,
    source,
  }));
}

function buildPitchProfile(pitchType: string, rows: StatcastPitchRow[], totalRows: number): PitchProfile {
  const ballsInPlay = rows.filter((row) => row.description === "hit_into_play");
  const hardHit = ballsInPlay.filter((row) => (row.launchSpeed ?? 0) >= 95);
  const groundBalls = ballsInPlay.filter((row) => row.bbType === "ground_ball");
  const putAwayRows = rows.filter((row) => typeof row.strikes === "number" && row.strikes >= 2);
  const putAways = putAwayRows.filter((row) => row.events === "strikeout" || WHIFF_DESCRIPTIONS.has(row.description ?? ""));
  const heatMap = buildPitchHeatMap(rows);

  return {
    averageReleasePoint: averageReleasePoint(rows),
    averageVelocityMph: averageNumber(rows.map((row) => row.releaseSpeed)),
    groundBallPercent: percentage(groundBalls.length, ballsInPlay.length),
    hardHitPercent: percentage(hardHit.length, ballsInPlay.length),
    horizontalBreakInches: averageNumber(rows.map((row) => row.pfxX === null || row.pfxX === undefined ? null : row.pfxX * 12)),
    locations: buildPitchLocations(rows),
    movement: averageMovement(rows),
    pitchName: rows.find((row) => row.pitchName)?.pitchName ?? pitchType,
    pitchType,
    putAwayPercent: percentage(putAways.length, putAwayRows.length),
    sampleSize: rows.length,
    spinRateRpm: averageNumber(rows.map((row) => row.releaseSpinRate)),
    strikePercent: percentage(rows.filter((row) => STRIKE_DESCRIPTIONS.has(row.description ?? "") || row.type === "S").length, rows.length),
    usagePercent: percentage(rows.length, totalRows) ?? 0,
    verticalBreakInches: averageNumber(rows.map((row) => row.pfxZ === null || row.pfxZ === undefined ? null : row.pfxZ * 12)),
    whiffPercent: percentage(rows.filter((row) => WHIFF_DESCRIPTIONS.has(row.description ?? "")).length, rows.filter((row) => SWING_DESCRIPTIONS.has(row.description ?? "")).length),
    zonePercent: percentage(rows.filter((row) => IN_ZONE.has(row.zone ?? 0)).length, rows.length),
    ...{ heatMap },
  };
}

function buildBatterPitchProfile(pitchType: string, rows: StatcastPitchRow[]): BatterPitchProfile {
  const atBats = rows.filter((row) => AT_BAT_EVENTS.has(row.events ?? ""));
  const hits = atBats.filter((row) => HIT_EVENTS.has(row.events ?? ""));
  const totalBases = atBats.reduce((total, row) => total + getTotalBases(row.events), 0);
  const ballsInPlay = rows.filter((row) => row.description === "hit_into_play");
  const swings = rows.filter((row) => SWING_DESCRIPTIONS.has(row.description ?? ""));
  const whiffs = rows.filter((row) => WHIFF_DESCRIPTIONS.has(row.description ?? ""));
  const hardHits = ballsInPlay.filter((row) => (row.launchSpeed ?? 0) >= 95);
  const barrels = ballsInPlay.filter((row) => isBarrel(row.launchSpeed, row.launchAngle));
  const chases = rows.filter((row) => !IN_ZONE.has(row.zone ?? 0) && SWING_DESCRIPTIONS.has(row.description ?? ""));
  const outOfZone = rows.filter((row) => !IN_ZONE.has(row.zone ?? 0));
  const avg = percentageRatio(hits.length, atBats.length);
  const slg = percentageRatio(totalBases, atBats.length);
  const expectedWoba = averageNumber(rows.map((row) => row.estimatedWobaUsingSpeedangle));
  const expectedBa = averageNumber(rows.map((row) => row.estimatedBaUsingSpeedangle));

  return {
    average: avg,
    barrelPercent: percentage(barrels.length, ballsInPlay.length),
    chasePercent: percentage(chases.length, outOfZone.length),
    contactPercent: percentage(swings.length - whiffs.length, swings.length),
    expectedBattingAverage: expectedBa,
    expectedDamageRating: calculateExpectedDamageRating({ hardHitPercent: percentage(hardHits.length, ballsInPlay.length), slg, xwoba: expectedWoba }),
    expectedSlugging: expectedWoba === null ? slg : round(expectedWoba * 2.2, 3),
    hardHitPercent: percentage(hardHits.length, ballsInPlay.length),
    pitchName: rows.find((row) => row.pitchName)?.pitchName ?? pitchType,
    pitchType,
    runValue: null,
    sampleSize: rows.length,
    slugging: slg,
    swingPercent: percentage(swings.length, rows.length),
    takePercent: percentage(rows.length - swings.length, rows.length),
    whiffPercent: percentage(whiffs.length, swings.length),
  };
}

function buildPitchLocations(rows: StatcastPitchRow[]): PitchLocation[] {
  const grouped = new Map<number, StatcastPitchRow[]>();

  for (const row of rows) {
    const zone = row.zone ?? 0;
    grouped.set(zone, [...(grouped.get(zone) ?? []), row]);
  }

  return Array.from(grouped.entries()).map(([zone, zoneRows]) => ({
    frequencyPercent: percentage(zoneRows.length, rows.length) ?? 0,
    plateX: averageNumber(zoneRows.map((row) => row.plateX)),
    plateZ: averageNumber(zoneRows.map((row) => row.plateZ)),
    zone: zone === 0 ? null : zone,
  }));
}

function buildPitchHeatMap(rows: StatcastPitchRow[]): PitchHeatMap {
  const grouped = new Map<string, StatcastPitchRow[]>();

  for (const row of rows) {
    const xBucket = Math.round((row.plateX ?? 0) * 2) / 2;
    const zBucket = Math.round((row.plateZ ?? 0) * 2) / 2;
    const key = `${row.zone ?? "na"}:${xBucket}:${zBucket}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return {
    cells: Array.from(grouped.entries()).map(([key, bucketRows]) => {
      const [zone, xBucket, zBucket] = key.split(":");
      const swings = bucketRows.filter((row) => SWING_DESCRIPTIONS.has(row.description ?? ""));

      return {
        damageRating: calculateExpectedDamageRating({
          hardHitPercent: percentage(bucketRows.filter((row) => (row.launchSpeed ?? 0) >= 95).length, bucketRows.length),
          slg: null,
          xwoba: averageNumber(bucketRows.map((row) => row.estimatedWobaUsingSpeedangle)),
        }),
        frequencyPercent: percentage(bucketRows.length, rows.length) ?? 0,
        whiffPercent: percentage(bucketRows.filter((row) => WHIFF_DESCRIPTIONS.has(row.description ?? "")).length, swings.length) ?? 0,
        xBucket: Number(xBucket),
        zBucket: Number(zBucket),
        zone: zone === "na" ? null : Number(zone),
      };
    }),
    sampleSize: rows.length,
  };
}

function groupByPitch(rows: StatcastPitchRow[]) {
  const grouped = new Map<string, StatcastPitchRow[]>();

  for (const row of rows) {
    const pitchType = row.pitchType ?? "UNK";
    grouped.set(pitchType, [...(grouped.get(pitchType) ?? []), row]);
  }

  return grouped;
}

function averageMovement(rows: StatcastPitchRow[]): PitchMovement {
  return {
    horizontalBreakInches: averageNumber(rows.map((row) => row.pfxX === null || row.pfxX === undefined ? null : row.pfxX * 12)),
    verticalBreakInches: averageNumber(rows.map((row) => row.pfxZ === null || row.pfxZ === undefined ? null : row.pfxZ * 12)),
  };
}

function averageReleasePoint(rows: StatcastPitchRow[]): AverageReleasePoint {
  return {
    extensionFeet: averageNumber(rows.map((row) => row.releaseExtension)),
    xFeet: averageNumber(rows.map((row) => row.releasePosX)),
    zFeet: averageNumber(rows.map((row) => row.releasePosZ)),
  };
}

function calculateArsenalQuality(profiles: PitchProfile[]) {
  if (profiles.length === 0) {
    return 50;
  }

  const weighted = profiles.reduce((total, profile) => {
    const velocityScore = normalizeRange(profile.averageVelocityMph, 84, 98);
    const strikeScore = normalizeRange(profile.strikePercent, 55, 72);
    const whiffScore = normalizeRange(profile.whiffPercent, 12, 40);
    const hardHitPrevention = 100 - normalizeRange(profile.hardHitPercent, 20, 55);
    const pitchQuality = average([velocityScore, strikeScore, whiffScore, hardHitPrevention]);

    return total + pitchQuality * (profile.usagePercent / 100);
  }, 0);

  return Math.round(clamp(weighted, 0, 100));
}

function calculateArsenalDataQuality(rows: StatcastPitchRow[], profiles: PitchProfile[]) {
  if (rows.length === 0 || profiles.length === 0) {
    return 0;
  }

  const sampleScore = clamp((rows.length / 250) * 100, 0, 100);
  const movementScore = average(profiles.map((profile) => profile.horizontalBreakInches === null || profile.verticalBreakInches === null ? 0 : 100));
  const locationScore = average(profiles.map((profile) => profile.locations.length > 0 ? 100 : 0));

  return Math.round(average([sampleScore, movementScore, locationScore]));
}

function calculateBatterDataQuality(rows: StatcastPitchRow[], profiles: BatterPitchProfile[]) {
  if (rows.length === 0 || profiles.length === 0) {
    return 0;
  }

  return Math.round(average([
    clamp((rows.length / 200) * 100, 0, 100),
    average(profiles.map((profile) => profile.sampleSize > 0 ? 100 : 0)),
  ]));
}

function calculateExpectedDamageRating({ hardHitPercent, slg, xwoba }: { hardHitPercent: number | null; slg: number | null; xwoba: number | null }) {
  return Math.round(average([
    normalizeRange(hardHitPercent, 25, 55),
    normalizeRange(slg === null ? null : slg * 1000, 300, 650),
    normalizeRange(xwoba === null ? null : xwoba * 1000, 280, 450),
  ]));
}

function normalizeHand(value?: string) {
  return value === "L" || value === "R" ? value : "U";
}

function normalizeBats(value?: string) {
  return value === "L" || value === "R" ? value : "U";
}

function getTotalBases(event?: string) {
  if (event === "single") return 1;
  if (event === "double") return 2;
  if (event === "triple") return 3;
  if (event === "home_run") return 4;
  return 0;
}

function isBarrel(launchSpeed?: number | null, launchAngle?: number | null) {
  return (launchSpeed ?? 0) >= 98 && (launchAngle ?? 0) >= 26 && (launchAngle ?? 0) <= 30;
}

function averageNumber(values: Array<number | null | undefined>) {
  const available = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (available.length === 0) {
    return null;
  }

  return round(available.reduce((total, value) => total + value, 0) / available.length, 2);
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return round((numerator / denominator) * 100, 1);
}

function percentageRatio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return round(numerator / denominator, 3);
}

function normalizeRange(value: number | null | undefined, low: number, high: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 50;
  }

  return clamp(((value - low) / (high - low)) * 100, 0, 100);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 50;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
