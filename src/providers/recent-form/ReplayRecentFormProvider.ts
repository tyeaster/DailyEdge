import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  RecentFormProvider,
  RecentFormProviderResponse,
  RecentFormRequest,
} from "./RecentFormProvider.ts";

type RecentFormReplayFile = RecentFormProviderResponse & {
  rawByWindow: Record<string, unknown>;
};

const DEFAULT_REPLAY_DIR = "replay/recent-form";

export class ReplayRecentFormProvider implements RecentFormProvider {
  readonly id = "recent-form-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getRecentForm(
    request: RecentFormRequest,
  ): Promise<RecentFormProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      fetchedAt: replay.fetchedAt,
      mode: "replay",
      provider: replay.provider,
      recentForm: replay.recentForm
        ? { ...replay.recentForm, source: "replay" }
        : undefined,
      season: replay.season,
      teamId: replay.teamId,
    };
  }

  async writeReplay({
    provider,
    rawByWindow,
    recentForm,
    request,
  }: {
    provider: string;
    rawByWindow: Record<string, unknown>;
    recentForm?: RecentFormProviderResponse["recentForm"];
    request: RecentFormRequest;
  }) {
    await mkdir(this.replayDir, { recursive: true });

    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.teamId}-${request.season}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          fetchedAt,
          mode: "live",
          provider,
          rawByWindow,
          recentForm,
          season: request.season,
          teamId: request.teamId,
        } satisfies RecentFormReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: RecentFormRequest) {
    const explicitReplayFile = process.env.RECENT_FORM_REPLAY_FILE;

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
      `No recent-form replay found for ${request.teamId} in ${request.season}`,
    );
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as RecentFormReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.RECENT_FORM_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
