import type {
  MatchupProvider,
  MatchupProviderResponse,
  MatchupRequest,
} from "./MatchupProvider.ts";
import {
  buildBatterMatchupProfiles,
  buildNeutralBatterProfiles,
  buildNeutralPitchArsenal,
  buildPitchArsenal,
  type StatcastPitchRow,
} from "../../services/matchup/normalization.ts";
import { ReplayMatchupProvider } from "./ReplayMatchupProvider.ts";

const DEFAULT_STATCAST_CSV_URL = "https://baseballsavant.mlb.com/statcast_search/csv";

type CsvRecord = Record<string, string>;

export class StatcastMatchupProvider implements MatchupProvider {
  readonly id = "baseball-savant-statcast";
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly replayProvider: ReplayMatchupProvider;

  constructor(
    endpoint = process.env.STATCAST_CSV_URL ?? DEFAULT_STATCAST_CSV_URL,
    fetcher: typeof fetch = fetch,
    replayProvider = new ReplayMatchupProvider(),
  ) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getMatchupData(
    request: MatchupRequest,
  ): Promise<MatchupProviderResponse> {
    const fetchedAt = new Date().toISOString();

    if (!request.pitcherMlbId) {
      return {
        arsenal: buildNeutralPitchArsenal(request, fetchedAt, "unavailable"),
        batterProfiles: buildNeutralBatterProfiles(request, fetchedAt, "unavailable"),
        fetchedAt,
        mode: "live",
        provider: this.id,
        request,
      };
    }

    const pitcherCsv = await this.fetchCsv(buildStatcastUrl({
      endpoint: this.endpoint,
      mlbId: request.pitcherMlbId,
      playerType: "pitcher",
      request,
    }));
    const pitcherRows = parseStatcastCsv(pitcherCsv);
    const batterRows = await this.fetchBatterRows(request);
    const response = {
      arsenal: buildPitchArsenal({
        fetchedAt,
        pitcherId: request.pitcherId,
        pitcherMlbId: request.pitcherMlbId,
        pitcherName: request.pitcherName,
        request,
        rows: pitcherRows,
        season: request.season,
        source: "live",
      }),
      batterProfiles: buildBatterMatchupProfiles({
        batterIds: request.batterIds,
        batterMlbIds: request.batterMlbIds,
        batterNames: request.batterNames,
        fetchedAt,
        rows: batterRows,
        season: request.season,
        source: "live",
      }),
      fetchedAt,
      mode: "live",
      provider: this.id,
      request,
    } satisfies MatchupProviderResponse;

    if (process.env.MATCHUP_RECORD === "true") {
      await this.replayProvider.writeReplay({
        provider: this.id,
        raw: { batterRows, pitcherRows },
        request,
        response,
      });
    }

    return response;
  }

  private async fetchBatterRows(request: MatchupRequest) {
    const batterMlbIds = request.batterMlbIds ?? [];
    const rows: StatcastPitchRow[] = [];

    for (const batterMlbId of batterMlbIds) {
      const csv = await this.fetchCsv(buildStatcastUrl({
        endpoint: this.endpoint,
        mlbId: batterMlbId,
        playerType: "batter",
        request,
      }));

      rows.push(...parseStatcastCsv(csv));
    }

    return rows;
  }

  private async fetchCsv(url: URL) {
    const response = await this.fetcher(url);

    if (!response.ok) {
      throw new Error(`Statcast request failed with ${response.status}`);
    }

    return response.text();
  }
}

export function buildStatcastUrl({
  endpoint,
  mlbId,
  playerType,
  request,
}: {
  endpoint: string;
  mlbId: number;
  playerType: "batter" | "pitcher";
  request: MatchupRequest;
}) {
  const url = new URL(endpoint);
  const seasonStart = `${request.season}-03-01`;
  const asOfDate = request.asOfDate ?? `${request.season}-11-30`;

  url.searchParams.set("all", "true");
  url.searchParams.set("hfGT", "R|");
  url.searchParams.set("hfSea", `${request.season}|`);
  url.searchParams.set("player_type", playerType);
  url.searchParams.set("game_date_gt", seasonStart);
  url.searchParams.set("game_date_lt", asOfDate);
  url.searchParams.set("min_pitches", "0");
  url.searchParams.set("min_results", "0");
  url.searchParams.set("group_by", "name");
  url.searchParams.set("type", "details");
  url.searchParams.set(playerType === "pitcher" ? "pitchers_lookup[]" : "batters_lookup[]", String(mlbId));

  return url;
}

export function parseStatcastCsv(csv: string): StatcastPitchRow[] {
  const rows = parseCsv(csv);

  return rows.map((record) => ({
    atBatNumber: number(record.at_bat_number),
    balls: number(record.balls),
    batter: number(record.batter),
    batterName: record.player_name,
    bbType: emptyToUndefined(record.bb_type),
    description: emptyToUndefined(record.description),
    estimatedBaUsingSpeedangle: number(record.estimated_ba_using_speedangle),
    estimatedWobaUsingSpeedangle: number(record.estimated_woba_using_speedangle),
    events: emptyToUndefined(record.events),
    gameDate: emptyToUndefined(record.game_date),
    hcX: number(record.hc_x),
    hcY: number(record.hc_y),
    hitDistanceSc: number(record.hit_distance_sc),
    launchAngle: number(record.launch_angle),
    launchSpeed: number(record.launch_speed),
    pThrows: emptyToUndefined(record.p_throws),
    pitcher: number(record.pitcher),
    pitcherName: record.player_name,
    pitchName: emptyToUndefined(record.pitch_name),
    pitchNumber: number(record.pitch_number),
    pitchType: emptyToUndefined(record.pitch_type),
    plateX: number(record.plate_x),
    plateZ: number(record.plate_z),
    pfxX: number(record.pfx_x),
    pfxZ: number(record.pfx_z),
    releaseExtension: number(record.release_extension),
    releasePosX: number(record.release_pos_x),
    releasePosZ: number(record.release_pos_z),
    releaseSpeed: number(record.release_speed),
    releaseSpinRate: number(record.release_spin_rate),
    stand: emptyToUndefined(record.stand),
    strikes: number(record.strikes),
    type: emptyToUndefined(record.type),
    zone: number(record.zone),
  }));
}

function parseCsv(csv: string): CsvRecord[] {
  const lines = csv.trim().split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).flatMap((line) => {
    if (!line.trim()) {
      return [];
    }

    const values = splitCsvLine(line);
    const record: CsvRecord = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return [record];
  });
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);

  return cells;
}

function number(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function emptyToUndefined(value: string | undefined) {
  return value && value.trim() !== "" ? value : undefined;
}
