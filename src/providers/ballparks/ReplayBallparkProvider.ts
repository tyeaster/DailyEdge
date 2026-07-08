import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  BallparkProvider,
  BallparkProviderResponse,
  BallparkRequest,
} from "./BallparkProvider.ts";

type BallparkReplayFile = BallparkProviderResponse & {
  factorsRaw: unknown;
  request: BallparkRequest;
  venueRaw: unknown;
};

const DEFAULT_REPLAY_DIR = "replay/ballparks";

export class ReplayBallparkProvider implements BallparkProvider {
  readonly id = "ballpark-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getBallpark(
    request: BallparkRequest,
  ): Promise<BallparkProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      ballpark: { ...replay.ballpark, source: "replay" },
      fetchedAt: replay.fetchedAt,
      mode: "replay",
      provider: replay.provider,
      venueId: replay.venueId,
    };
  }

  async writeReplay({
    ballpark,
    factorsRaw,
    provider,
    request,
    venueRaw,
  }: {
    ballpark: BallparkProviderResponse["ballpark"];
    factorsRaw: unknown;
    provider: string;
    request: BallparkRequest;
    venueRaw: unknown;
  }) {
    await mkdir(this.replayDir, { recursive: true });
    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.venueId}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          ballpark,
          factorsRaw,
          fetchedAt,
          mode: "live",
          provider,
          request,
          venueId: request.venueId,
          venueRaw,
        } satisfies BallparkReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: BallparkRequest) {
    const explicitFile = process.env.BALLPARK_REPLAY_FILE;

    if (explicitFile) {
      return readReplayFile(
        path.resolve(/*turbopackIgnore: true*/ process.cwd(), explicitFile),
      );
    }

    const files = (await readdir(this.replayDir))
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files) {
      const replay = await readReplayFile(path.join(this.replayDir, file));

      if (replay.venueId === request.venueId) {
        return replay;
      }
    }

    throw new Error(`No ballpark replay found for venue ${request.venueId}`);
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as BallparkReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.BALLPARK_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
