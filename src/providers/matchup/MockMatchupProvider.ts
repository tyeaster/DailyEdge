import type {
  MatchupProvider,
  MatchupProviderResponse,
  MatchupRequest,
} from "./MatchupProvider.ts";
import {
  buildBatterMatchupProfiles,
  buildPitchArsenal,
  type StatcastPitchRow,
} from "../../services/matchup/normalization.ts";

export class MockMatchupProvider implements MatchupProvider {
  readonly id = "matchup-mock";

  async getMatchupData(
    request: MatchupRequest,
  ): Promise<MatchupProviderResponse> {
    const fetchedAt = "2026-06-26T12:00:00.000Z";
    const pitcherRows = buildMockPitcherRows(request);
    const batterRows = buildMockBatterRows(request);

    return {
      arsenal: buildPitchArsenal({
        fetchedAt,
        pitcherId: request.pitcherId,
        pitcherMlbId: request.pitcherMlbId,
        pitcherName: request.pitcherName,
        request,
        rows: pitcherRows,
        season: request.season,
        source: "mock",
      }),
      batterProfiles: buildBatterMatchupProfiles({
        batterIds: request.batterIds,
        batterMlbIds: request.batterMlbIds,
        batterNames: request.batterNames,
        fetchedAt,
        rows: batterRows,
        season: request.season,
        source: "mock",
      }),
      fetchedAt,
      mode: "mock",
      provider: this.id,
      request,
    };
  }
}

function buildMockPitcherRows(request: MatchupRequest): StatcastPitchRow[] {
  return [
    ...buildRows({
      count: 70,
      pitchName: "4-Seam Fastball",
      pitchType: "FF",
      pitcher: request.pitcherMlbId,
      pitcherName: request.pitcherName,
      releaseSpeed: 96.1,
      whiffEvery: 4,
      zone: 2,
    }),
    ...buildRows({
      count: 35,
      pitchName: "Slider",
      pitchType: "SL",
      pitcher: request.pitcherMlbId,
      pitcherName: request.pitcherName,
      releaseSpeed: 86.4,
      whiffEvery: 3,
      zone: 7,
    }),
    ...buildRows({
      count: 20,
      pitchName: "Changeup",
      pitchType: "CH",
      pitcher: request.pitcherMlbId,
      pitcherName: request.pitcherName,
      releaseSpeed: 88.2,
      whiffEvery: 5,
      zone: 13,
    }),
  ];
}

function buildMockBatterRows(request: MatchupRequest): StatcastPitchRow[] {
  return (request.batterMlbIds ?? [1001]).flatMap((batter, index) => [
    ...buildRows({
      batter,
      batterName: request.batterNames?.[index] ?? `Mock Batter ${index + 1}`,
      count: 24,
      pitchName: "4-Seam Fastball",
      pitchType: "FF",
      whiffEvery: 6,
      zone: 2,
    }),
    ...buildRows({
      batter,
      batterName: request.batterNames?.[index] ?? `Mock Batter ${index + 1}`,
      count: 14,
      pitchName: "Slider",
      pitchType: "SL",
      whiffEvery: 3,
      zone: 7,
    }),
  ]);
}

function buildRows({
  batter,
  batterName,
  count,
  pitchName,
  pitcher,
  pitcherName,
  pitchType,
  releaseSpeed,
  whiffEvery,
  zone,
}: {
  batter?: number;
  batterName?: string;
  count: number;
  pitchName: string;
  pitcher?: number;
  pitcherName?: string;
  pitchType: string;
  releaseSpeed?: number;
  whiffEvery: number;
  zone: number;
}): StatcastPitchRow[] {
  return Array.from({ length: count }, (_, index) => ({
    batter,
    batterName,
    bbType: index % 5 === 0 ? "ground_ball" : "line_drive",
    description: index % whiffEvery === 0 ? "swinging_strike" : index % 4 === 0 ? "hit_into_play" : "called_strike",
    estimatedBaUsingSpeedangle: 0.245,
    estimatedWobaUsingSpeedangle: 0.335,
    events: index % 17 === 0 ? "home_run" : index % 9 === 0 ? "single" : undefined,
    launchAngle: 27,
    launchSpeed: index % 4 === 0 ? 97 : 88,
    pThrows: "R",
    pitcher,
    pitcherName,
    pitchName,
    pitchType,
    plateX: zone > 9 ? 1.1 : 0.2,
    plateZ: zone > 9 ? 3.4 : 2.5,
    pfxX: pitchType === "SL" ? 0.55 : -0.35,
    pfxZ: pitchType === "FF" ? 1.28 : 0.25,
    releaseExtension: 6.3,
    releasePosX: -1.9,
    releasePosZ: 5.7,
    releaseSpeed: releaseSpeed ?? (pitchType === "FF" ? 95.4 : 86.3),
    releaseSpinRate: pitchType === "FF" ? 2350 : 2520,
    stand: index % 2 === 0 ? "L" : "R",
    strikes: index % 3,
    type: index % whiffEvery === 0 ? "S" : "X",
    zone,
  }));
}
