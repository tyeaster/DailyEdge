import type { BullpenRating, LineupProfile, WeatherProfile, BallparkProfile } from "../../models/mlb.ts";
import type { PitcherIntelligence } from "../player-intelligence/types.ts";
import { MATCHUP_INTELLIGENCE_CONFIG } from "./config.ts";
import type {
  BatterMatchupProfile,
  BatterPitchProfile,
  MatchupContextScore,
  MatchupIntelligenceResult,
  MatchupRecentScore,
  MatchupZone,
  MatchupZoneOverlayCell,
  PitchArsenal,
  PitchProfile,
  PitchTypeMatch,
  ZoneMatch,
} from "./types.ts";

export interface MatchupIntelligenceInput {
  arsenal: PitchArsenal;
  ballpark?: BallparkProfile;
  batterProfiles: BatterMatchupProfile[];
  bullpen?: BullpenRating;
  lineup?: LineupProfile;
  pitcherIntelligence?: PitcherIntelligence;
  weather?: WeatherProfile;
}

export function buildMatchupIntelligence({
  arsenal,
  ballpark,
  batterProfiles,
  bullpen,
  lineup,
  pitcherIntelligence,
  weather,
}: MatchupIntelligenceInput): MatchupIntelligenceResult {
  const pitchTypeMatch = calculatePitchTypeMatchEngine({
    arsenal,
    batterProfiles,
  });
  const zoneMatch = calculateZoneMatchEngine({ arsenal, batterProfiles });
  const recentMatchup = calculateRecentMatchupScore({ pitcherIntelligence });
  const contextScores = buildContextScores({
    ballpark,
    bullpen,
    lineup,
    weather,
  });
  const overall = calculateOverallMatchupScore({
    contextScores,
    pitchTypeScore: pitchTypeMatch.score,
    recentScore: recentMatchup.score,
    zoneScore: zoneMatch.score,
  });
  const confidence = calculateMatchupConfidence({
    arsenal,
    batterProfiles,
    contextScores,
    pitcherIntelligence,
    recentMatchup,
    zoneMatch,
  });

  return {
    arsenal,
    batterProfiles,
    confidence,
    contextScores,
    fetchedAt: new Date().toISOString(),
    overallMatchupScore: overall,
    pitchMix: arsenal.profiles.map((profile) => ({
      pitchName: profile.pitchName,
      pitchType: profile.pitchType,
      usagePercent: profile.usagePercent,
    })),
    pitchTypeMatch,
    reasons: buildOverallReasons({
      contextScores,
      overall,
      pitchTypeMatch,
      recentMatchup,
      zoneMatch,
    }),
    recentMatchup,
    zoneMatch,
  };
}

export function calculatePitchTypeMatchEngine({
  arsenal,
  batterProfiles,
}: {
  arsenal: PitchArsenal;
  batterProfiles: BatterMatchupProfile[];
}): MatchupIntelligenceResult["pitchTypeMatch"] {
  const matches = arsenal.profiles.map((pitchProfile) =>
    calculatePitchTypeMatchDetail(pitchProfile, batterProfiles),
  );
  const score =
    matches.length === 0
      ? 50
      : clampScore(
          matches.reduce(
            (total, match) => total + match.score * (match.usagePercent / 100),
            0,
          ),
        );
  const topAdvantages = matches
    .flatMap((match) => match.topAdvantages ?? [])
    .slice(0, 4);
  const topWeaknesses = matches
    .flatMap((match) => match.topWeaknesses ?? [])
    .slice(0, 4);

  return {
    explanation:
      topAdvantages[0] ??
      topWeaknesses[0] ??
      "Pitch-type matchup is neutral with current normalized profiles.",
    matches,
    score,
    topAdvantages,
    topWeaknesses,
  };
}

export function calculatePitchTypeMatchDetail(
  pitchProfile: PitchProfile,
  batterProfiles: BatterMatchupProfile[],
): PitchTypeMatch {
  const batterPitchProfiles = getBatterPitchProfiles(
    batterProfiles,
    pitchProfile.pitchType,
  );
  const batterDamageRating = averageOrNeutral(
    batterPitchProfiles.map(getBatterDamageRating),
  );
  const whiffWeakness = averageOrNeutral(
    batterPitchProfiles.map((profile) =>
      normalizeRange(
        profile.whiffPercent ?? profile.strikeoutPercent,
        MATCHUP_INTELLIGENCE_CONFIG.ranges.whiffPercent,
      ),
    ),
  );
  const contactMatch = clampScore(
    normalizeRange(
      pitchProfile.whiffPercent,
      MATCHUP_INTELLIGENCE_CONFIG.ranges.whiffPercent,
    ) * MATCHUP_INTELLIGENCE_CONFIG.contactWeights.pitchWhiffStrength +
      whiffWeakness * MATCHUP_INTELLIGENCE_CONFIG.contactWeights.batterWhiffWeakness,
  );
  const velocityMatch = normalizeRange(
    pitchProfile.averageVelocityMph,
    MATCHUP_INTELLIGENCE_CONFIG.ranges.velocityMph,
  );
  const movementMatch = calculateMovementMatch(pitchProfile);
  const expectedDamageMatch = clampScore(100 - batterDamageRating);
  const zoneMatch = calculatePitchZoneMatchDetail(
    pitchProfile,
    batterProfiles,
  );
  const weights = MATCHUP_INTELLIGENCE_CONFIG.componentWeights;
  const score = clampScore(
    contactMatch * weights.contact +
      velocityMatch * weights.velocity +
      movementMatch * weights.movement +
      zoneMatch.score * weights.zone +
      expectedDamageMatch * weights.expectedDamage,
  );
  const topAdvantages = buildPitchAdvantages({
    batterDamageRating,
    contactMatch,
    movementMatch,
    pitchProfile,
    zoneMatch,
  });
  const topWeaknesses = buildPitchWeaknesses({
    batterDamageRating,
    pitchProfile,
    score,
    zoneMatch,
  });

  return {
    batterDamageRating,
    contactMatch,
    expectedDamageMatch,
    explanation:
      topAdvantages[0] ??
      topWeaknesses[0] ??
      `${pitchProfile.pitchName} profiles as neutral against available hitter data.`,
    movementMatch,
    pitchName: pitchProfile.pitchName,
    pitchType: pitchProfile.pitchType,
    reasons: [...topAdvantages, ...topWeaknesses].slice(0, 4),
    sampleSize: pitchProfile.sampleSize,
    score,
    topAdvantages,
    topWeaknesses,
    usagePercent: pitchProfile.usagePercent,
    velocityMatch,
    zoneMatch,
  };
}

export function calculateZoneMatchEngine({
  arsenal,
  batterProfiles,
}: {
  arsenal: PitchArsenal;
  batterProfiles: BatterMatchupProfile[];
}): ZoneMatch {
  const overlay = buildZoneOverlay(arsenal, batterProfiles);
  const thresholds = MATCHUP_INTELLIGENCE_CONFIG.thresholds;
  const score =
    overlay.length === 0
      ? 50
      : clampScore(
          overlay.reduce(
            (total, cell) =>
              total + cell.score * (cell.pitcherFrequencyPercent / 100),
            0,
          ),
        );
  const hotZones = getBatterZones(batterProfiles)
    .filter((zone) => zone.damageRating >= thresholds.hotZoneDamage)
    .sort((left, right) => right.damageRating - left.damageRating)
    .slice(0, 5);
  const coldZones = getBatterZones(batterProfiles)
    .filter((zone) => zone.damageRating <= thresholds.coldZoneDamage)
    .sort((left, right) => left.damageRating - right.damageRating)
    .slice(0, 5);

  return {
    coldZones,
    hotZones,
    overlay,
    reasons: buildZoneReasons({ coldZones, hotZones, overlay, score }),
    score,
  };
}

export function calculateRecentMatchupScore({
  pitcherIntelligence,
}: {
  pitcherIntelligence?: PitcherIntelligence;
}): MatchupRecentScore {
  if (!pitcherIntelligence) {
    return {
      confidence: 0,
      explanation: "Recent matchup score unavailable without Player Intelligence.",
      score: 50,
    };
  }

  const positiveTrendCount = pitcherIntelligence.trends.filter(
    (trend) => trend.direction === "up" && trend.key !== "walks",
  ).length;
  const negativeTrendCount = pitcherIntelligence.trends.filter(
    (trend) =>
      trend.direction === "down" ||
      (trend.key === "walks" && trend.direction === "up"),
  ).length;
  const recentWeights = MATCHUP_INTELLIGENCE_CONFIG.recentWeights;
  const thresholds = MATCHUP_INTELLIGENCE_CONFIG.thresholds;
  const trendScore = clampScore(
    50 + (positiveTrendCount - negativeTrendCount) * thresholds.trendImpactPoints,
  );
  const score = clampScore(
    pitcherIntelligence.recentForm.score * recentWeights.recentForm +
      pitcherIntelligence.consistency.consistencyScore * recentWeights.consistency +
      trendScore * recentWeights.trends,
  );

  return {
    confidence: clampScore(
      thresholds.recentConfidenceBase +
        Math.min(
          thresholds.maxRecentConfidenceBonus,
          pitcherIntelligence.gameLogs.length * thresholds.recentConfidencePerLog,
        ),
    ),
    explanation: `${pitcherIntelligence.recentForm.explanation} Consistency grades ${pitcherIntelligence.consistency.consistencyScore}/100.`,
    score,
  };
}

export function calculateOverallMatchupScore({
  contextScores,
  pitchTypeScore,
  recentScore,
  zoneScore,
}: {
  contextScores: MatchupContextScore[];
  pitchTypeScore: number;
  recentScore: number;
  zoneScore: number;
}) {
  const weights = MATCHUP_INTELLIGENCE_CONFIG.overallWeights;
  const contextByLabel = Object.fromEntries(
    contextScores.map((context) => [context.label, context.score]),
  );

  return clampScore(
    pitchTypeScore * weights.pitchType +
      zoneScore * weights.zone +
      recentScore * weights.recentForm +
      (contextByLabel.Weather ?? 50) * weights.weather +
      (contextByLabel.Ballpark ?? 50) * weights.ballpark +
      (contextByLabel.Bullpen ?? 50) * weights.bullpen,
  );
}

function calculatePitchZoneMatchDetail(
  pitchProfile: PitchProfile,
  batterProfiles: BatterMatchupProfile[],
): ZoneMatch {
  const overlay = buildZoneOverlay(
    {
      dataQuality: 100,
      fetchedAt: "",
      handedness: "U",
      overallQuality: 50,
      pitcherId: "",
      pitcherName: "",
      primaryPitchType: pitchProfile.pitchType,
      profiles: [pitchProfile],
      season: 0,
      source: "mock",
    },
    batterProfiles,
  );

  if (overlay.length === 0) {
    return { reasons: ["Zone data is incomplete"], score: 50 };
  }

  const score = clampScore(
    overlay.reduce(
      (total, cell) =>
        total + cell.score * (cell.pitcherFrequencyPercent / 100),
      0,
    ),
  );

  return {
    overlay,
    reasons: buildZoneReasons({
      coldZones: [],
      hotZones: [],
      overlay,
      score,
    }),
    score,
  };
}

function buildZoneOverlay(
  arsenal: PitchArsenal,
  batterProfiles: BatterMatchupProfile[],
): MatchupZoneOverlayCell[] {
  const pitcherCells = aggregatePitcherZoneCells(arsenal);
  const batterZoneDamage = new Map(
    getBatterZones(batterProfiles).map((zone) => [zone.zone, zone.damageRating]),
  );

  return pitcherCells.map((cell) => {
    const batterDamageRating = batterZoneDamage.get(cell.zone) ?? 50;
    const score = clampScore(100 - batterDamageRating);
    const thresholds = MATCHUP_INTELLIGENCE_CONFIG.thresholds;

    return {
      batterDamageRating,
      classification:
        score >= thresholds.advantageScore
          ? "advantage"
          : score <= thresholds.riskScore
            ? "risk"
            : "neutral",
      pitcherFrequencyPercent: cell.frequencyPercent,
      score,
      xBucket: cell.xBucket,
      zBucket: cell.zBucket,
      zone: cell.zone,
    };
  });
}

function aggregatePitcherZoneCells(arsenal: PitchArsenal) {
  const frequencyByZone = new Map<
    number | null,
    { frequencyPercent: number; xBucket: number; zBucket: number; zone: number | null }
  >();

  for (const profile of arsenal.profiles) {
    for (const cell of profile.heatMap.cells) {
      const existing = frequencyByZone.get(cell.zone) ?? {
        frequencyPercent: 0,
        xBucket: cell.xBucket,
        zBucket: cell.zBucket,
        zone: cell.zone,
      };

      existing.frequencyPercent +=
        (cell.frequencyPercent * profile.usagePercent) / 100;
      frequencyByZone.set(cell.zone, existing);
    }
  }

  return Array.from(frequencyByZone.values());
}

function getBatterZones(batterProfiles: BatterMatchupProfile[]): MatchupZone[] {
  const explicit = batterProfiles.flatMap(
    (profile) =>
      profile.zoneHeatMap?.cells.map((cell) => ({
        damageRating: cell.damageRating ?? 50,
        frequencyPercent: cell.frequencyPercent,
        zone: cell.zone,
      })) ?? [],
  );

  if (explicit.length > 0) {
    return explicit;
  }

  return batterProfiles.flatMap((profile) =>
    profile.pitchProfiles.map((pitchProfile, index) => ({
      damageRating: pitchProfile.expectedDamageRating,
      frequencyPercent: 100 / Math.max(1, profile.pitchProfiles.length),
      zone: index + 1,
    })),
  );
}

function buildContextScores({
  ballpark,
  bullpen,
  lineup,
  weather,
}: {
  ballpark?: BallparkProfile;
  bullpen?: BullpenRating;
  lineup?: LineupProfile;
  weather?: WeatherProfile;
}): MatchupContextScore[] {
  return [
    {
      explanation: weather
        ? weather.weatherApplicable
          ? `Weather strikeout environment is ${weather.strikeoutEnvironment}/100.`
          : "Weather is not applicable for this venue state."
        : "Weather context unavailable.",
      label: "Weather",
      score: weather
        ? weather.weatherApplicable
          ? weather.strikeoutEnvironment
          : 50
        : 50,
    },
    {
      explanation: ballpark
        ? `Ballpark pitcher-friendly rating is ${ballpark.pitcherFriendlyRating}/100.`
        : "Ballpark context unavailable.",
      label: "Ballpark",
      score: ballpark?.pitcherFriendlyRating ?? 50,
    },
    {
      explanation: bullpen?.available
        ? `Bullpen support grades ${bullpen.workloadRating ?? bullpen.value}/100.`
        : "Bullpen context unavailable.",
      label: "Bullpen",
      score: bullpen?.available ? (bullpen.workloadRating ?? bullpen.value) : 50,
    },
    {
      explanation: lineup
        ? `Lineup confidence is ${lineup.lineupConfidence}/100.`
        : "Lineup context unavailable.",
      label: "Lineup",
      score: lineup?.lineupConfidence ?? 50,
    },
  ];
}

function calculateMatchupConfidence({
  arsenal,
  batterProfiles,
  contextScores,
  pitcherIntelligence,
  recentMatchup,
  zoneMatch,
}: {
  arsenal: PitchArsenal;
  batterProfiles: BatterMatchupProfile[];
  contextScores: MatchupContextScore[];
  pitcherIntelligence?: PitcherIntelligence;
  recentMatchup: MatchupRecentScore;
  zoneMatch: ZoneMatch;
}) {
  const batterQuality =
    batterProfiles.length === 0
      ? 0
      : average(batterProfiles.map((profile) => profile.dataQuality));
  const contextQuality = average(
    contextScores.map((context) =>
      context.score === MATCHUP_INTELLIGENCE_CONFIG.contextDefaults.neutralScore
        ? MATCHUP_INTELLIGENCE_CONFIG.contextDefaults.unavailableContextQuality
        : MATCHUP_INTELLIGENCE_CONFIG.contextDefaults.availableContextQuality,
    ),
  );
  const weights = MATCHUP_INTELLIGENCE_CONFIG.confidenceWeights;

  return clampScore(
    arsenal.dataQuality * weights.arsenalQuality +
      batterQuality * weights.batterQuality +
      (zoneMatch.overlay?.length
        ? MATCHUP_INTELLIGENCE_CONFIG.thresholds.zoneAvailableConfidence
        : MATCHUP_INTELLIGENCE_CONFIG.thresholds.zoneUnavailableConfidence) *
        weights.zoneAvailability +
      recentMatchup.confidence * weights.recentMatchup +
      (pitcherIntelligence
        ? MATCHUP_INTELLIGENCE_CONFIG.thresholds.zoneAvailableConfidence
        : MATCHUP_INTELLIGENCE_CONFIG.thresholds.playerIntelligenceUnavailableConfidence) *
        weights.playerIntelligenceAvailability +
      contextQuality * weights.contextQuality,
  );
}

function buildOverallReasons({
  contextScores,
  overall,
  pitchTypeMatch,
  recentMatchup,
  zoneMatch,
}: {
  contextScores: MatchupContextScore[];
  overall: number;
  pitchTypeMatch: MatchupIntelligenceResult["pitchTypeMatch"];
  recentMatchup: MatchupRecentScore;
  zoneMatch: ZoneMatch;
}) {
  return [
    pitchTypeMatch.explanation,
    zoneMatch.reasons[0],
    recentMatchup.explanation,
    ...contextScores
      .filter((context) => Math.abs(context.score - 50) >= 8)
      .map((context) => context.explanation),
    overall >= MATCHUP_INTELLIGENCE_CONFIG.thresholds.favorableOverall
      ? "Overall matchup profile is favorable."
      : overall <= MATCHUP_INTELLIGENCE_CONFIG.thresholds.riskyOverall
        ? "Overall matchup profile is unfavorable."
        : "Overall matchup profile is neutral.",
  ].filter(Boolean);
}

function buildPitchAdvantages({
  batterDamageRating,
  contactMatch,
  movementMatch,
  pitchProfile,
  zoneMatch,
}: {
  batterDamageRating: number;
  contactMatch: number;
  movementMatch: number;
  pitchProfile: PitchProfile;
  zoneMatch: ZoneMatch;
}) {
  const advantages: string[] = [];

  const thresholds = MATCHUP_INTELLIGENCE_CONFIG.thresholds;

  if (pitchProfile.usagePercent >= thresholds.primaryPitchUsagePercent) {
    advantages.push(`${pitchProfile.pitchName} usage drives the arsenal.`);
  }
  if (contactMatch >= thresholds.advantageScore) {
    advantages.push(`${pitchProfile.pitchName} generates elevated whiff pressure.`);
  }
  if (movementMatch >= thresholds.advantageScore) {
    advantages.push(`${pitchProfile.pitchName} movement grades above average.`);
  }
  if (batterDamageRating <= thresholds.riskScore) {
    advantages.push(`Batter profile shows limited damage against ${pitchProfile.pitchName}.`);
  }
  if (zoneMatch.score >= thresholds.advantageScore) {
    advantages.push(`${pitchProfile.pitchName} location overlaps hitter cold zones.`);
  }

  return advantages;
}

function buildPitchWeaknesses({
  batterDamageRating,
  pitchProfile,
  score,
  zoneMatch,
}: {
  batterDamageRating: number;
  pitchProfile: PitchProfile;
  score: number;
  zoneMatch: ZoneMatch;
}) {
  const weaknesses: string[] = [];

  const thresholds = MATCHUP_INTELLIGENCE_CONFIG.thresholds;

  if (batterDamageRating >= thresholds.hotZoneDamage) {
    weaknesses.push(`Batter profile damages ${pitchProfile.pitchName}.`);
  }
  if ((pitchProfile.whiffPercent ?? 0) < thresholds.limitedWhiffPercent) {
    weaknesses.push(`${pitchProfile.pitchName} has limited whiff rate.`);
  }
  if (zoneMatch.score <= thresholds.riskScore) {
    weaknesses.push(`${pitchProfile.pitchName} location overlaps hitter hot zones.`);
  }
  if (score <= thresholds.riskScore) {
    weaknesses.push(`${pitchProfile.pitchName} is a matchup risk.`);
  }

  return weaknesses;
}

function buildZoneReasons({
  coldZones,
  hotZones,
  overlay,
  score,
}: {
  coldZones: MatchupZone[];
  hotZones: MatchupZone[];
  overlay: MatchupZoneOverlayCell[];
  score: number;
}) {
  const advantageZone = overlay.find((cell) => cell.classification === "advantage");
  const riskZone = overlay.find((cell) => cell.classification === "risk");
  const reasons: string[] = [];

  if (advantageZone) {
    reasons.push(`Pitcher frequency overlaps a hitter cold zone (${formatZone(advantageZone.zone)}).`);
  }
  if (riskZone) {
    reasons.push(`Pitcher frequency reaches a hitter hot zone (${formatZone(riskZone.zone)}).`);
  }
  if (hotZones[0]) {
    reasons.push(`Primary hitter hot zone is ${formatZone(hotZones[0].zone)}.`);
  }
  if (coldZones[0]) {
    reasons.push(`Primary hitter cold zone is ${formatZone(coldZones[0].zone)}.`);
  }
  if (score >= MATCHUP_INTELLIGENCE_CONFIG.thresholds.advantageScore) {
    reasons.push("Zone matchup is favorable.");
  } else if (score <= MATCHUP_INTELLIGENCE_CONFIG.thresholds.riskScore) {
    reasons.push("Zone matchup is risky.");
  }

  return reasons.length > 0 ? reasons : ["Zone matchup is neutral."];
}

function getBatterPitchProfiles(
  batterProfiles: BatterMatchupProfile[],
  pitchType: string,
) {
  return batterProfiles.flatMap((profile) =>
    profile.pitchProfiles.filter((pitch) => pitch.pitchType === pitchType),
  );
}

function getBatterDamageRating(profile: BatterPitchProfile) {
  return average([
    profile.expectedDamageRating,
    normalizeRange(
      profile.isolatedPower,
      MATCHUP_INTELLIGENCE_CONFIG.ranges.isolatedPower,
    ),
    normalizeRange(
      profile.averageExitVelocityMph,
      MATCHUP_INTELLIGENCE_CONFIG.ranges.averageExitVelocityMph,
    ),
    normalizeRange(
      profile.barrelPercent,
      MATCHUP_INTELLIGENCE_CONFIG.ranges.barrelPercent,
    ),
  ]);
}

function calculateMovementMatch(pitchProfile: PitchProfile) {
  const horizontal = Math.abs(pitchProfile.horizontalBreakInches ?? 0);
  const vertical = Math.abs(pitchProfile.verticalBreakInches ?? 0);

  return clampScore(
    normalizeRange(
      horizontal,
      MATCHUP_INTELLIGENCE_CONFIG.ranges.horizontalBreakInches,
    ) * MATCHUP_INTELLIGENCE_CONFIG.movementWeights.horizontal +
      normalizeRange(
        vertical,
        MATCHUP_INTELLIGENCE_CONFIG.ranges.verticalBreakInches,
      ) * MATCHUP_INTELLIGENCE_CONFIG.movementWeights.vertical,
  );
}

function normalizeRange(
  value: number | null | undefined,
  range: { high: number; low: number },
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 50;
  }

  return clampScore(((value - range.low) / (range.high - range.low)) * 100);
}

function averageOrNeutral(values: number[]) {
  return values.length === 0 ? 50 : average(values);
}

function average(values: number[]) {
  return values.length === 0
    ? 50
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function clampScore(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function formatZone(zone: number | null) {
  return zone === null ? "outside zone" : `zone ${zone}`;
}
