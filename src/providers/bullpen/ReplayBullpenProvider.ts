import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  BullpenProvider,
  BullpenProviderResponse,
  BullpenRequest,
} from "./BullpenProvider.ts";

type BullpenReplayFile = BullpenProviderResponse & {
  recentRaw: unknown;
  seasonRaw: unknown;
};

const DEFAULT_REPLAY_DIR = "replay/bullpen";

export class ReplayBullpenProvider implements BullpenProvider {
  readonly id = "bullpen-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getBullpen(
    request: BullpenRequest,
  ): Promise<BullpenProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      bullpen: replay.bullpen
        ? { ...replay.bullpen, source: "replay" }
        : undefined,
      fetchedAt: replay.fetchedAt,
      mode: "replay",
      provider: replay.provider,
      season: replay.season,
      teamId: replay.teamId,
    };
  }

  async writeReplay({
    bullpen,
    provider,
    recentRaw,
    request,
    seasonRaw,
  }: {
    bullpen?: BullpenProviderResponse["bullpen"];
    provider: string;
    recentRaw: unknown;
    request: BullpenRequest;
    seasonRaw: unknown;
  }) {
    await mkdir(this.replayDir, { recursive: true });

    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.teamId}-${request.season}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          bullpen,
          fetchedAt,
          mode: "live",
          provider,
          recentRaw,
          season: request.season,
          seasonRaw,
          teamId: request.teamId,
        } satisfies BullpenReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: BullpenRequest) {
    const explicitReplayFile = process.env.BULLPEN_REPLAY_FILE;

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
        replay.teamId === request.teamId &&
        replay.season === request.season
      ) {
        return replay;
      }
    }

    throw new Error(
      `No bullpen replay found for ${request.teamId} in ${request.season}`,
    );
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as BullpenReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.BULLPEN_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
