import type {
  BallparkProvider,
  BallparkProviderResponse,
  BallparkRequest,
} from "./BallparkProvider.ts";
import {
  buildBallparkProfile,
  type BallparkMetadata,
  type ParkFactorInput,
} from "./rating.ts";
import { ReplayBallparkProvider } from "./ReplayBallparkProvider.ts";

const DEFAULT_MLB_API_URL = "https://statsapi.mlb.com/api/v1";
const DEFAULT_SAVANT_URL =
  "https://baseballsavant.mlb.com/leaderboard/statcast-park-factors";

type MlbVenueResponse = {
  venues?: Array<{
    fieldInfo?: {
      center?: number;
      leftCenter?: number;
      leftLine?: number;
      rightCenter?: number;
      rightLine?: number;
      roofType?: string;
      turfType?: string;
    };
    id?: number;
    location?: {
      azimuthAngle?: number;
      defaultCoordinates?: {
        latitude?: number;
        longitude?: number;
      };
      elevation?: number;
    };
    name?: string;
  }>;
};

type SavantParkFactor = {
  index_1b?: string;
  index_2b?: string;
  index_3b?: string;
  index_bacon?: string;
  index_bb?: string;
  index_hr?: string;
  index_runs?: string;
  index_so?: string;
  n_pa?: string;
  venue_id?: string;
};

export class MLBBallparkProvider implements BallparkProvider {
  readonly id = "mlb-savant-ballpark";
  private readonly fetcher: typeof fetch;
  private readonly mlbEndpoint: string;
  private readonly replayProvider: ReplayBallparkProvider;
  private readonly savantEndpoint: string;
  private readonly sharedFactors = new Map<
    string,
    Promise<Record<number, SavantParkFactor>>
  >();

  constructor(
    {
      mlbEndpoint = process.env.MLB_API_URL ?? DEFAULT_MLB_API_URL,
      savantEndpoint = process.env.BASEBALL_SAVANT_PARK_FACTORS_URL ??
        DEFAULT_SAVANT_URL,
    } = {},
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayBallparkProvider(),
  ) {
    this.fetcher = fetcher;
    this.mlbEndpoint = mlbEndpoint;
    this.savantEndpoint = savantEndpoint;
    this.replayProvider = replayProvider;
  }

  async getBallpark(
    request: BallparkRequest,
  ): Promise<BallparkProviderResponse> {
    const [venueRaw, allFactors, leftFactors, rightFactors] = await Promise.all([
      this.fetchJson(this.buildVenueUrl(request.venueId)),
      this.getFactors(request.season, "").catch(emptySavantFactors),
      this.getFactors(request.season, "L").catch(emptySavantFactors),
      this.getFactors(request.season, "R").catch(emptySavantFactors),
    ]);
    const fetchedAt = new Date().toISOString();
    const metadata = normalizeVenueMetadata(
      venueRaw,
      request.venueId,
      request.venueName,
    );
    const factors = normalizeParkFactors({
      all: allFactors[request.venueId],
      left: leftFactors[request.venueId],
      right: rightFactors[request.venueId],
    });
    const ballpark = buildBallparkProfile({
      factors,
      fetchedAt,
      league: request.league,
      metadata,
      source: "live",
    });

    if (process.env.BALLPARK_RECORD === "true") {
      await this.replayProvider.writeReplay({
        ballpark,
        factorsRaw: { allFactors, leftFactors, rightFactors },
        provider: this.id,
        request,
        venueRaw,
      });
    }

    return {
      ballpark,
      fetchedAt,
      mode: "live",
      provider: this.id,
      venueId: request.venueId,
    };
  }

  private getFactors(season: number, battingSide: "" | "L" | "R") {
    const key = `${season}:${battingSide || "all"}`;
    const existing = this.sharedFactors.get(key);

    if (existing) {
      return existing;
    }

    const promise = this.fetchText(
      this.buildSavantUrl(season, battingSide),
    )
      .then(parseSavantParkFactors)
      .catch((error) => {
        this.sharedFactors.delete(key);
        throw error;
      });
    this.sharedFactors.set(key, promise);

    return promise;
  }

  private async fetchJson(url: URL) {
    const response = await this.fetcher(url);

    if (!response.ok) {
      throw new Error(`MLB venue request failed with ${response.status}`);
    }

    return response.json();
  }

  private async fetchText(url: URL) {
    const response = await this.fetcher(url);

    if (!response.ok) {
      throw new Error(`Baseball Savant request failed with ${response.status}`);
    }

    return response.text();
  }

  private buildVenueUrl(venueId: number) {
    const url = new URL(`${this.mlbEndpoint}/venues/${venueId}`);

    url.searchParams.set("hydrate", "location,fieldInfo");

    return url;
  }

  private buildSavantUrl(season: number, battingSide: "" | "L" | "R") {
    const url = new URL(this.savantEndpoint);

    url.searchParams.set("batSide", battingSide);
    url.searchParams.set("condition", "All");
    url.searchParams.set("parks", "mlb");
    url.searchParams.set("rolling", "3");
    url.searchParams.set("stat", "index_wOBA");
    url.searchParams.set("type", "year");
    url.searchParams.set("year", String(season));

    return url;
  }
}

export function normalizeVenueMetadata(
  raw: unknown,
  venueId: number,
  venueName: string,
): BallparkMetadata {
  const venue = (raw as MlbVenueResponse | undefined)?.venues?.[0];

  return {
    altitudeFeet: finiteOrNull(venue?.location?.elevation),
    azimuthDegrees: finiteOrNull(venue?.location?.azimuthAngle),
    dimensions: {
      center: finiteOrNull(venue?.fieldInfo?.center),
      leftCenter: finiteOrNull(venue?.fieldInfo?.leftCenter),
      leftLine: finiteOrNull(venue?.fieldInfo?.leftLine),
      rightCenter: finiteOrNull(venue?.fieldInfo?.rightCenter),
      rightLine: finiteOrNull(venue?.fieldInfo?.rightLine),
    },
    latitude: finiteOrNull(
      venue?.location?.defaultCoordinates?.latitude,
    ),
    longitude: finiteOrNull(
      venue?.location?.defaultCoordinates?.longitude,
    ),
    name: venue?.name ?? venueName,
    roofType: venue?.fieldInfo?.roofType ?? "Unknown",
    surface: venue?.fieldInfo?.turfType ?? "Unknown",
    venueId: venue?.id ?? venueId,
  };
}

export function parseSavantParkFactors(
  html: string,
): Record<number, SavantParkFactor> {
  const marker = "var data = ";
  const start = html.indexOf(marker);

  if (start < 0) {
    throw new Error("Baseball Savant park factor data was not found");
  }

  const dataStart = start + marker.length;
  const dataEnd = html.indexOf(";\n", dataStart);

  if (dataEnd < 0) {
    throw new Error("Baseball Savant park factor data was incomplete");
  }

  const records = JSON.parse(
    html.slice(dataStart, dataEnd),
  ) as SavantParkFactor[];

  return Object.fromEntries(
    records.flatMap((record) => {
      const venueId = integer(record.venue_id);

      return venueId > 0 ? [[venueId, record]] : [];
    }),
  );
}

export function normalizeParkFactors({
  all,
  left,
  right,
}: {
  all?: SavantParkFactor;
  left?: SavantParkFactor;
  right?: SavantParkFactor;
}): ParkFactorInput | undefined {
  if (!all) {
    return undefined;
  }

  return {
    babipFactor: finiteStringOrNull(all.index_bacon),
    doublesFactor: finiteStringOrNull(all.index_2b),
    homeRunFactor: finiteStringOrNull(all.index_hr),
    leftHandedHomeRunFactor: finiteStringOrNull(left?.index_hr),
    plateAppearances: integer(all.n_pa),
    rightHandedHomeRunFactor: finiteStringOrNull(right?.index_hr),
    runFactor: finiteStringOrNull(all.index_runs),
    singlesFactor: finiteStringOrNull(all.index_1b),
    strikeoutFactor: finiteStringOrNull(all.index_so),
    triplesFactor: finiteStringOrNull(all.index_3b),
    walkFactor: finiteStringOrNull(all.index_bb),
  };
}

function finiteOrNull(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : null;
}

function finiteStringOrNull(value: string | undefined) {
  const parsed = value === undefined ? Number.NaN : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value: string | undefined) {
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function emptySavantFactors(): Record<number, SavantParkFactor> {
  return {};
}
