import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PitcherStatsProvider,
  PitcherStatsProviderResponse,
  PitcherStatsRequest,
} from "./PitcherStatsProvider.ts";

type PitcherReplayFile = PitcherStatsProviderResponse & {
  raw: unknown;
};

const DEFAULT_REPLAY_DIR = "replay/pitchers";

export class ReplayPitcherStatsProvider implements PitcherStatsProvider {
  readonly id = "pitcher-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getPitcherStats(
    request: PitcherStatsRequest,
  ): Promise<PitcherStatsProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      fetchedAt: replay.fetchedAt,
      mode: "replay",
      pitcherId: replay.pitcherId,
      provider: replay.provider,
      season: replay.season,
      stats: replay.stats,
    };
  }

  async writeReplay({
    pitcherId,
    provider,
    raw,
    season,
    stats,
  }: {
    pitcherId: number;
    provider: string;
    raw: unknown;
    season: number;
    stats?: PitcherStatsProviderResponse["stats"];
  }) {
    await mkdir(this.replayDir, { recursive: true });

    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${pitcherId}-${season}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          fetchedAt,
          mode: "live",
          pitcherId,
          provider,
          raw,
          season,
          stats,
        } satisfies PitcherReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: PitcherStatsRequest) {
    const explicitReplayFile = process.env.PITCHER_REPLAY_FILE;

    if (explicitReplayFile) {
      return readReplayFile(
        path.resolve(
          /*turbopackIgnore: true*/ process.cwd(),
          explicitReplayFile,
        ),
      );
    }

    const files = (await readdir(this.replayDir))
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files) {
      const replay = await readReplayFile(path.join(this.replayDir, file));

      if (
        replay.pitcherId === request.pitcherId &&
        replay.season === request.season
      ) {
        return replay;
      }
    }

    throw new Error(
      `No pitcher replay found for ${request.pitcherId} in ${request.season}`,
    );
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as PitcherReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.PITCHER_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
