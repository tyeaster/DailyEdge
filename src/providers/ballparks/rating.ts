import type { BallparkProfile, MlbLeague } from "../../models/mlb.ts";

export interface BallparkMetadata {
  altitudeFeet: number | null;
  azimuthDegrees: number | null;
  dimensions: BallparkProfile["dimensions"];
  latitude: number | null;
  longitude: number | null;
  name: string;
  roofType: string;
  surface: string;
  venueId: number;
}

export interface ParkFactorInput {
  babipFactor: number | null;
  doublesFactor: number | null;
  homeRunFactor: number | null;
  leftHandedHomeRunFactor: number | null;
  plateAppearances: number;
  rightHandedHomeRunFactor: number | null;
  runFactor: number | null;
  singlesFactor: number | null;
  strikeoutFactor: number | null;
  triplesFactor: number | null;
  walkFactor: number | null;
}

export function buildBallparkProfile({
  factors,
  fetchedAt,
  league,
  metadata,
  source,
}: {
  factors?: ParkFactorInput;
  fetchedAt: string;
  league: MlbLeague;
  metadata: BallparkMetadata;
  source: BallparkProfile["source"];
}): BallparkProfile {
  const runFactor = factors?.runFactor ?? null;
  const homeRunFactor = factors?.homeRunFactor ?? null;
  const triplesFactor = factors?.triplesFactor ?? null;
  const hitterFriendlyRating = factorRating(
    averageAvailable([runFactor, homeRunFactor]),
  );
  const pitcherFriendlyRating = 100 - hitterFriendlyRating;
  const powerFriendlyRating = factorRating(
    averageAvailable([
      homeRunFactor,
      factors?.leftHandedHomeRunFactor,
      factors?.rightHandedHomeRunFactor,
    ]),
  );
  const speedFriendlyRating = factorRating(
    averageAvailable([
      factors?.singlesFactor,
      factors?.doublesFactor,
      triplesFactor,
    ]),
  );
  const overallParkRating = Math.round(
    hitterFriendlyRating * 0.5 +
      powerFriendlyRating * 0.3 +
      speedFriendlyRating * 0.2,
  );
  const historicalConfidence = factors
    ? Math.round(clamp((factors.plateAppearances / 45_000) * 100, 35, 100))
    : 0;

  return {
    altitudeFeet: metadata.altitudeFeet,
    azimuthDegrees: metadata.azimuthDegrees,
    babipFactor: factors?.babipFactor ?? null,
    dimensions: metadata.dimensions,
    doublesFactor: factors?.doublesFactor ?? null,
    fetchedAt,
    flyBallFactor: null,
    foulTerritoryFactor: null,
    groundBallFactor: null,
    historicalConfidence,
    hitterFriendlyRating,
    homeRunFactor,
    league,
    leftHandedHomeRunFactor: factors?.leftHandedHomeRunFactor ?? null,
    latitude: metadata.latitude,
    name: metadata.name,
    longitude: metadata.longitude,
    outfieldSpeed:
      triplesFactor === null ? null : factorRating(triplesFactor),
    overallParkRating,
    pitcherFriendlyRating,
    powerFriendlyRating,
    rightHandedHomeRunFactor: factors?.rightHandedHomeRunFactor ?? null,
    roofType: metadata.roofType,
    runFactor,
    singlesFactor: factors?.singlesFactor ?? null,
    source,
    speedFriendlyRating,
    strikeoutFactor: factors?.strikeoutFactor ?? null,
    surface: metadata.surface,
    triplesFactor,
    venueId: metadata.venueId,
    walkFactor: factors?.walkFactor ?? null,
  };
}

export function createBallparkUnavailable({
  fetchedAt = new Date().toISOString(),
  league,
  name,
  venueId,
}: {
  fetchedAt?: string;
  league: MlbLeague;
  name: string;
  venueId: number;
}): BallparkProfile {
  return {
    altitudeFeet: null,
    azimuthDegrees: null,
    babipFactor: null,
    dimensions: {
      center: null,
      leftCenter: null,
      leftLine: null,
      rightCenter: null,
      rightLine: null,
    },
    doublesFactor: null,
    fetchedAt,
    flyBallFactor: null,
    foulTerritoryFactor: null,
    groundBallFactor: null,
    historicalConfidence: 0,
    hitterFriendlyRating: 50,
    homeRunFactor: null,
    league,
    leftHandedHomeRunFactor: null,
    latitude: null,
    name,
    longitude: null,
    outfieldSpeed: null,
    overallParkRating: 50,
    pitcherFriendlyRating: 50,
    powerFriendlyRating: 50,
    rightHandedHomeRunFactor: null,
    roofType: "Unknown",
    runFactor: null,
    singlesFactor: null,
    source: "unavailable",
    speedFriendlyRating: 50,
    strikeoutFactor: null,
    surface: "Unknown",
    triplesFactor: null,
    venueId,
    walkFactor: null,
  };
}

function factorRating(factor: number | null) {
  return factor === null
    ? 50
    : Math.round(clamp(50 + (factor - 100) * 1.5, 0, 100));
}

function averageAvailable(values: Array<number | null | undefined>) {
  const available = values.filter(
    (value): value is number => typeof value === "number",
  );

  return available.length === 0
    ? null
    : available.reduce((total, value) => total + value, 0) / available.length;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
