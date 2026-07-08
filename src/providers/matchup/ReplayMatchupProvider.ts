import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  MatchupProvider,
  MatchupProviderResponse,
  MatchupRequest,
} from "./MatchupProvider.ts";

type MatchupReplayFile = {
  provider: string;
  raw: unknown;
  request: MatchupRequest;
  response: MatchupProviderResponse;
};

const DEFAULT_REPLAY_DIR = "replay/matchup";

export class ReplayMatchupProvider implements MatchupProvider {
  readonly id = "matchup-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getMatchupData(
    request: MatchupRequest,
  ): Promise<MatchupProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      ...replay.response,
      arsenal: { ...replay.response.arsenal, source: "replay" },
      batterProfiles: replay.response.batterProfiles.map((profile) => ({
        ...profile,
        source: "replay",
      })),
      mode: "replay",
      provider: replay.provider,
      request,
    };
  }

  async writeReplay({
    provider,
    raw,
    request,
    response,
  }: MatchupReplayFile) {
    await mkdir(this.replayDir, { recursive: true });
    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.pitcherId}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify({ provider, raw, request, response }, null, 2),
      "utf8",
    );
  }

  private async readReplay(request: MatchupRequest) {
    const explicitFile = process.env.MATCHUP_REPLAY_FILE;

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

      if (
        replay.request.pitcherId === request.pitcherId ||
        replay.request.pitcherMlbId === request.pitcherMlbId
      ) {
        return replay;
      }
    }

    throw new Error(`No matchup replay found for pitcher ${request.pitcherId}`);
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as MatchupReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.MATCHUP_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
