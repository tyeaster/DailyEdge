import { CACHE_TTL_SECONDS, type CacheProvider } from "../../cache/CacheProvider.ts";
import { memoryCache } from "../../cache/MemoryCache.ts";
import {
  MockMatchupProvider,
  ReplayMatchupProvider,
  StatcastMatchupProvider,
  type MatchupProvider,
  type MatchupProviderMode,
} from "../../providers/matchup/index.ts";
import type {
  BatterMatchupProfile,
  MatchupRequest,
  OverallPitchMatch,
  PitchArsenal,
  PitchProfile,
  PitchTypeMatch,
  ZoneMatch,
} from "./types.ts";
import { MATCHUP_INTELLIGENCE_CONFIG } from "./config.ts";

type MatchupInput = {
  arsenal: PitchArsenal;
  batterProfiles: BatterMatchupProfile[];
};

export class MatchupService {
  private readonly cache: CacheProvider;
  private readonly provider: MatchupProvider;

  constructor(
    provider: MatchupProvider = getConfiguredMatchupProvider(),
    cache: CacheProvider = memoryCache,
  ) {
    this.provider = provider;
    this.cache = cache;
  }

  async getMatchup(request: MatchupRequest): Promise<OverallPitchMatch> {
    const cacheKey = buildCacheKey(this.provider.id, request);
    const cached = await this.cache.get<OverallPitchMatch>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.provider.getMatchupData(request);
      const matchup = calculateOverallPitchMatch({
        arsenal: response.arsenal,
        batterProfiles: response.batterProfiles,
      });

      await this.cache.set(cacheKey, matchup, CACHE_TTL_SECONDS.matchup);

      return matchup;
    } catch {
      return createUnavailableMatchup(request);
    }
  }
}

export const matchupService = new MatchupService();

export function getConfiguredMatchupProvider(
  mode: MatchupProviderMode = getMatchupMode(),
) {
  if (mode === "replay") {
    return new ReplayMatchupProvider();
  }

  if (mode === "mock") {
    return new MockMatchupProvider();
  }

  return new StatcastMatchupProvider();
}

export function calculateOverallPitchMatch({
  arsenal,
  batterProfiles,
}: MatchupInput): OverallPitchMatch {
  const pitchTypeMatches = arsenal.profiles.map((pitchProfile) =>
    calculatePitchTypeMatch(pitchProfile, batterProfiles),
  );
  const weightedScore =
    pitchTypeMatches.length === 0
      ? 50
      : pitchTypeMatches.reduce(
          (total, match) => total + match.score * (match.usagePercent / 100),
          0,
        );
  const zoneMatch = calculateOverallZoneMatch(arsenal, batterProfiles);
  const overallWeights = MATCHUP_INTELLIGENCE_CONFIG.overallWeights;
  const dataPenalty =
    ((100 - arsenal.dataQuality) + (100 - getBatterDataQuality(batterProfiles))) /
    12;
  const score = clampScore(
    weightedScore * overallWeights.pitchType +
      zoneMatch.score * overallWeights.zone -
      dataPenalty,
  );
  const missingInputs = [
    ...(arsenal.profiles.length === 0 ? ["Pitch arsenal"] : []),
    ...(batterProfiles.length === 0 ? ["Batter pitch profiles"] : []),
    ...(arsenal.dataQuality < 50 ? ["Pitch sample size"] : []),
    ...(getBatterDataQuality(batterProfiles) < 50 ? ["Batter sample size"] : []),
  ];

  return {
    arsenalDataQuality: arsenal.dataQuality,
    batterDataQuality: getBatterDataQuality(batterProfiles),
    fetchedAt: new Date().toISOString(),
    inputSources: unique([
      arsenal.source,
      ...batterProfiles.map((profile) => profile.source),
    ]),
    missingInputs,
    pitchTypeMatches,
    pitcherId: arsenal.pitcherId,
    reasons: buildOverallReasons(score, pitchTypeMatches, zoneMatch),
    score,
    source: arsenal.source,
    zoneMatch,
  };
}

export function calculatePitchTypeMatch(
  pitchProfile: PitchProfile,
  batterProfiles: BatterMatchupProfile[],
): PitchTypeMatch {
  const batterPitchProfiles = batterProfiles.flatMap((profile) =>
    profile.pitchProfiles.filter(
      (pitch) => pitch.pitchType === pitchProfile.pitchType,
    ),
  );
  const batterDamageRating =
    batterPitchProfiles.length === 0
      ? 50
      : average(batterPitchProfiles.map((profile) => profile.expectedDamageRating));
  const whiffWeakness =
    batterPitchProfiles.length === 0
      ? 50
      : average(
          batterPitchProfiles.map((profile) =>
            normalizeRange(
              profile.whiffPercent,
              MATCHUP_INTELLIGENCE_CONFIG.ranges.whiffPercent,
            ),
          ),
        );
  const contactMatch = clampScore((pitchProfile.whiffPercent ?? 22) * 1.8 + whiffWeakness * 0.45);
  const velocityMatch = normalizeRange(
    pitchProfile.averageVelocityMph,
    MATCHUP_INTELLIGENCE_CONFIG.ranges.velocityMph,
  );
  const movementMatch = calculateMovementMatch(pitchProfile);
  const expectedDamageMatch = clampScore(100 - batterDamageRating);
  const zoneMatch = calculatePitchZoneMatch(pitchProfile, batterPitchProfiles.length);
  const weights = MATCHUP_INTELLIGENCE_CONFIG.componentWeights;
  const score = clampScore(
    contactMatch * weights.contact +
      velocityMatch * weights.velocity +
      movementMatch * weights.movement +
      zoneMatch.score * weights.zone +
      expectedDamageMatch * weights.expectedDamage,
  );

  return {
    batterDamageRating,
    contactMatch,
    expectedDamageMatch,
    movementMatch,
    pitchName: pitchProfile.pitchName,
    pitchType: pitchProfile.pitchType,
    reasons: buildPitchReasons({
      batterDamageRating,
      contactMatch,
      movementMatch,
      pitchProfile,
      score,
      zoneMatch,
    }),
    sampleSize: pitchProfile.sampleSize,
    score,
    usagePercent: pitchProfile.usagePercent,
    velocityMatch,
    zoneMatch,
  };
}

export function calculatePitchZoneMatch(
  pitchProfile: PitchProfile,
  batterProfileCount: number,
): ZoneMatch {
  if (pitchProfile.locations.length === 0 || batterProfileCount === 0) {
    return {
      reasons: ["Zone data is incomplete"],
      score: 50,
    };
  }

  const inZonePercent = pitchProfile.zonePercent ?? 50;
  const chaseZonePercent = pitchProfile.locations
    .filter((location) => location.zone !== null && location.zone > 9)
    .reduce((total, location) => total + location.frequencyPercent, 0);
  const score = clampScore(
    normalizeRange(
      inZonePercent,
      MATCHUP_INTELLIGENCE_CONFIG.ranges.inZonePercent,
    ) * 0.6 +
      normalizeRange(
        chaseZonePercent,
        MATCHUP_INTELLIGENCE_CONFIG.ranges.chaseZonePercent,
      ) * 0.4,
  );

  return {
    reasons: [
      inZonePercent >= 55 ? "Works in the strike zone" : "Uses chase locations",
      chaseZonePercent >= 20 ? "Can expand beyond the zone" : "Limited chase-zone usage",
    ],
    score,
  };
}

function calculateOverallZoneMatch(
  arsenal: PitchArsenal,
  batterProfiles: BatterMatchupProfile[],
): ZoneMatch {
  if (arsenal.profiles.length === 0) {
    return { reasons: ["Pitch location data is missing"], score: 50 };
  }

  const matches = arsenal.profiles.map((profile) =>
    calculatePitchZoneMatch(profile, batterProfiles.length),
  );

  return {
    reasons: unique(matches.flatMap((match) => match.reasons)).slice(0, 3),
    score: clampScore(average(matches.map((match) => match.score))),
  };
}

function calculateMovementMatch(pitchProfile: PitchProfile) {
  const horizontal = Math.abs(pitchProfile.horizontalBreakInches ?? 0);
  const vertical = Math.abs(pitchProfile.verticalBreakInches ?? 0);

  return clampScore(
    normalizeRange(
      horizontal,
      MATCHUP_INTELLIGENCE_CONFIG.ranges.horizontalBreakInches,
    ) * 0.45 +
      normalizeRange(
        vertical,
        MATCHUP_INTELLIGENCE_CONFIG.ranges.verticalBreakInches,
      ) * 0.55,
  );
}

function createUnavailableMatchup(request: MatchupRequest): OverallPitchMatch {
  return {
    arsenalDataQuality: 0,
    batterDataQuality: 0,
    fetchedAt: new Date().toISOString(),
    inputSources: ["unavailable"],
    missingInputs: ["Pitch arsenal", "Batter pitch profiles"],
    pitchTypeMatches: [],
    pitcherId: request.pitcherId,
    reasons: ["Matchup intelligence unavailable"],
    score: 50,
    source: "unavailable",
    zoneMatch: {
      reasons: ["Zone data unavailable"],
      score: 50,
    },
  };
}

function buildPitchReasons({
  batterDamageRating,
  contactMatch,
  movementMatch,
  pitchProfile,
  score,
  zoneMatch,
}: {
  batterDamageRating: number;
  contactMatch: number;
  movementMatch: number;
  pitchProfile: PitchProfile;
  score: number;
  zoneMatch: ZoneMatch;
}) {
  const reasons: string[] = [];

  if (pitchProfile.usagePercent >= 35) reasons.push(`High ${pitchProfile.pitchName} usage`);
  if (contactMatch >= 65) reasons.push("Pitch profile creates swing-and-miss pressure");
  if (movementMatch >= 65) reasons.push("Above-average pitch movement");
  if (batterDamageRating <= 45) reasons.push("Lineup has limited damage against this pitch type");
  if (zoneMatch.score >= 60) reasons.push("Strong strike-zone fit");
  if (score < 45) reasons.push("Batter profile handles this pitch type well");

  return reasons.length > 0 ? reasons : ["Neutral pitch-type matchup"];
}

function buildOverallReasons(
  score: number,
  pitchTypeMatches: PitchTypeMatch[],
  zoneMatch: ZoneMatch,
) {
  const bestPitch = [...pitchTypeMatches].sort((left, right) => right.score - left.score)[0];
  const reasons: string[] = [];

  if (bestPitch) {
    reasons.push(`${bestPitch.pitchName} is the strongest matchup pitch`);
  }

  if (zoneMatch.score >= 60) {
    reasons.push("Pitch locations align well against current batter profiles");
  }

  if (score >= 70) {
    reasons.push("Overall pitcher-batter compatibility is favorable");
  } else if (score <= 40) {
    reasons.push("Overall pitcher-batter compatibility is unfavorable");
  }

  return reasons.length > 0 ? reasons : ["Overall matchup profile is neutral"];
}

function getMatchupMode(): MatchupProviderMode {
  const mode = process.env.MATCHUP_MODE;

  if (mode === "live" || mode === "replay" || mode === "mock") {
    return mode;
  }

  return "live";
}

function buildCacheKey(providerId: string, request: MatchupRequest) {
  return [
    "matchup",
    providerId,
    request.pitcherId,
    request.pitcherMlbId ?? "no-mlb-id",
    request.season,
    request.asOfDate ?? "season",
    ...(request.batterMlbIds ?? []),
  ].join(":");
}

function getBatterDataQuality(batterProfiles: BatterMatchupProfile[]) {
  if (batterProfiles.length === 0) {
    return 0;
  }

  return Math.round(average(batterProfiles.map((profile) => profile.dataQuality)));
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

function average(values: number[]) {
  if (values.length === 0) {
    return 50;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function clampScore(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}
