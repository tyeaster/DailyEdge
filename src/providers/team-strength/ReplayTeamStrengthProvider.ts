import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  TeamStrengthProvider,
  TeamStrengthProviderResponse,
  TeamStrengthRequest,
} from "./TeamStrengthProvider.ts";

type TeamStrengthReplayFile = TeamStrengthProviderResponse & {
  hittingRaw: unknown;
  pitchingRaw: unknown;
};

const DEFAULT_REPLAY_DIR = "replay/team-strength";

export class ReplayTeamStrengthProvider implements TeamStrengthProvider {
  readonly id = "team-strength-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getTeamStrength(
    request: TeamStrengthRequest,
  ): Promise<TeamStrengthProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      fetchedAt: replay.fetchedAt,
      mode: "replay",
      provider: replay.provider,
      season: replay.season,
      strength: replay.strength
        ? { ...replay.strength, source: "replay" }
        : undefined,
      teamId: replay.teamId,
    };
  }

  async writeReplay({
    hittingRaw,
    pitchingRaw,
    provider,
    request,
    strength,
  }: {
    hittingRaw: unknown;
    pitchingRaw: unknown;
    provider: string;
    request: TeamStrengthRequest;
    strength?: TeamStrengthProviderResponse["strength"];
  }) {
    await mkdir(this.replayDir, { recursive: true });

    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.teamId}-${request.season}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          fetchedAt,
          hittingRaw,
          mode: "live",
          pitchingRaw,
          provider,
          season: request.season,
          strength,
          teamId: request.teamId,
        } satisfies TeamStrengthReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: TeamStrengthRequest) {
    const explicitReplayFile = process.env.TEAM_STRENGTH_REPLAY_FILE;

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
      `No team-strength replay found for ${request.teamId} in ${request.season}`,
    );
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as TeamStrengthReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.TEAM_STRENGTH_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
