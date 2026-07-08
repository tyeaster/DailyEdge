import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  NormalizedOddsRecord,
  OddsProvider,
  OddsProviderRequest,
  OddsProviderResponse,
  OddsRateLimitInfo,
} from "./OddsProvider";

type ReplayFile = {
  fetchedAt: string;
  provider: string;
  rateLimit?: OddsRateLimitInfo;
  raw: unknown;
  records: NormalizedOddsRecord[];
  request: OddsProviderRequest;
};

const DEFAULT_REPLAY_DIR = "replay/odds";

export class ReplayOddsProvider implements OddsProvider {
  readonly id = "replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getOdds(request: OddsProviderRequest): Promise<OddsProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      fetchedAt: replay.fetchedAt,
      mode: "replay",
      provider: replay.provider,
      rateLimit: replay.rateLimit,
      records: replay.records,
    };
  }

  async writeReplay({
    provider,
    rateLimit,
    raw,
    records,
    request,
  }: {
    provider: string;
    rateLimit?: OddsRateLimitInfo;
    raw: unknown;
    records: NormalizedOddsRecord[];
    request: OddsProviderRequest;
  }) {
    await mkdir(this.replayDir, { recursive: true });

    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.sport}.json`;
    const replay: ReplayFile = {
      fetchedAt,
      provider,
      rateLimit,
      raw,
      records,
      request,
    };

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(replay, null, 2),
      "utf8",
    );
  }

  private async readReplay(request: OddsProviderRequest) {
    const explicitReplayFile = process.env.ODDS_REPLAY_FILE;

    if (explicitReplayFile) {
      return readReplayFile(
        path.resolve(/*turbopackIgnore: true*/ process.cwd(), explicitReplayFile),
      );
    }

    const files = (await readdir(this.replayDir))
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files) {
      const replay = await readReplayFile(path.join(this.replayDir, file));

      if (replay.request.sport === request.sport) {
        return replay;
      }
    }

    throw new Error(`No odds replay found for ${request.sport}`);
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as ReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.ODDS_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
