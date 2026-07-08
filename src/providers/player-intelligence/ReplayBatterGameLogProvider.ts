import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  BatterGameLog,
  BatterGameLogProvider,
  BatterGameLogProviderResponse,
  BatterGameLogRequest,
} from "./BatterGameLogProvider.ts";

type BatterGameLogReplayFile = BatterGameLogProviderResponse & {
  raw: unknown;
};

const DEFAULT_REPLAY_DIR = "replay/player-intelligence/batters";

export class ReplayBatterGameLogProvider implements BatterGameLogProvider {
  readonly id = "batter-game-log-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getBatterGameLogs(
    request: BatterGameLogRequest,
  ): Promise<BatterGameLogProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      batterId: replay.batterId,
      fetchedAt: replay.fetchedAt,
      logs: replay.logs,
      mode: "replay",
      provider: replay.provider,
      season: replay.season,
    };
  }

  async writeReplay({
    batterId,
    logs,
    provider,
    raw,
    season,
  }: {
    batterId: number;
    logs: BatterGameLog[];
    provider: string;
    raw: unknown;
    season: number;
  }) {
    await mkdir(this.replayDir, { recursive: true });
    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${batterId}-${season}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          batterId,
          fetchedAt,
          logs,
          mode: "live",
          provider,
          raw,
          season,
        } satisfies BatterGameLogReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: BatterGameLogRequest) {
    const explicitReplayFile =
      process.env.BATTER_INTELLIGENCE_REPLAY_FILE ??
      process.env.PLAYER_INTELLIGENCE_REPLAY_FILE;

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

      if (replay.batterId === request.batterId && replay.season === request.season) {
        return replay;
      }
    }

    throw new Error(
      `No batter game-log replay found for ${request.batterId} in ${request.season}`,
    );
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as BatterGameLogReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.BATTER_INTELLIGENCE_REPLAY_DIR ??
      process.env.PLAYER_INTELLIGENCE_REPLAY_DIR ??
      DEFAULT_REPLAY_DIR,
  );
}
