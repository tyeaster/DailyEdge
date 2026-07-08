import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PitcherGameLog,
  PitcherGameLogProvider,
  PitcherGameLogProviderResponse,
  PitcherGameLogRequest,
} from "./PitcherGameLogProvider.ts";

type PitcherGameLogReplayFile = PitcherGameLogProviderResponse & {
  raw: unknown;
};

const DEFAULT_REPLAY_DIR = "replay/player-intelligence";

export class ReplayPitcherGameLogProvider implements PitcherGameLogProvider {
  readonly id = "pitcher-game-log-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getPitcherGameLogs(
    request: PitcherGameLogRequest,
  ): Promise<PitcherGameLogProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      fetchedAt: replay.fetchedAt,
      logs: replay.logs,
      mode: "replay",
      pitcherId: replay.pitcherId,
      provider: replay.provider,
      season: replay.season,
    };
  }

  async writeReplay({
    logs,
    pitcherId,
    provider,
    raw,
    season,
  }: {
    logs: PitcherGameLog[];
    pitcherId: number;
    provider: string;
    raw: unknown;
    season: number;
  }) {
    await mkdir(this.replayDir, { recursive: true });
    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${pitcherId}-${season}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          fetchedAt,
          logs,
          mode: "live",
          pitcherId,
          provider,
          raw,
          season,
        } satisfies PitcherGameLogReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: PitcherGameLogRequest) {
    const explicitReplayFile = process.env.PLAYER_INTELLIGENCE_REPLAY_FILE;

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
      `No pitcher game-log replay found for ${request.pitcherId} in ${request.season}`,
    );
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as PitcherGameLogReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.PLAYER_INTELLIGENCE_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}

