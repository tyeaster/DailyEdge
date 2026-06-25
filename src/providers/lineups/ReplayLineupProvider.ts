import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  LineupProvider,
  LineupProviderResponse,
  LineupRequest,
} from "./LineupProvider.ts";

type LineupReplayFile = LineupProviderResponse & {
  currentScheduleRaw: unknown;
  recentScheduleRaw: unknown;
  rosterRaw: unknown;
};

const DEFAULT_REPLAY_DIR = "replay/lineups";

export class ReplayLineupProvider implements LineupProvider {
  readonly id = "lineup-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getLineup(
    request: LineupRequest,
  ): Promise<LineupProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      fetchedAt: replay.fetchedAt,
      gameId: replay.gameId,
      lineup: replay.lineup
        ? { ...replay.lineup, source: "replay" }
        : undefined,
      mode: "replay",
      provider: replay.provider,
      season: replay.season,
      teamId: replay.teamId,
    };
  }

  async writeReplay({
    currentScheduleRaw,
    lineup,
    provider,
    recentScheduleRaw,
    request,
    rosterRaw,
  }: {
    currentScheduleRaw: unknown;
    lineup?: LineupProviderResponse["lineup"];
    provider: string;
    recentScheduleRaw: unknown;
    request: LineupRequest;
    rosterRaw: unknown;
  }) {
    await mkdir(this.replayDir, { recursive: true });

    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.gameId}-${request.teamId}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          currentScheduleRaw,
          fetchedAt,
          gameId: request.gameId,
          lineup,
          mode: "live",
          provider,
          recentScheduleRaw,
          rosterRaw,
          season: request.season,
          teamId: request.teamId,
        } satisfies LineupReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: LineupRequest) {
    const explicitReplayFile = process.env.LINEUP_REPLAY_FILE;

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
        replay.gameId === request.gameId &&
        replay.teamId === request.teamId
      ) {
        return replay;
      }
    }

    throw new Error(
      `No lineup replay found for game ${request.gameId} and team ${request.teamId}`,
    );
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as LineupReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.LINEUP_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
