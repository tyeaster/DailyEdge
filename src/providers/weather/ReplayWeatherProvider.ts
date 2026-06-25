import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  WeatherProvider,
  WeatherProviderResponse,
  WeatherRequest,
} from "./WeatherProvider.ts";

type WeatherReplayFile = WeatherProviderResponse & {
  raw: unknown;
  request: WeatherRequest;
};

const DEFAULT_REPLAY_DIR = "replay/weather";

export class ReplayWeatherProvider implements WeatherProvider {
  readonly id = "weather-replay";
  private readonly replayDir: string;

  constructor(replayDir = getReplayDirectory()) {
    this.replayDir = replayDir;
  }

  async getWeather(
    request: WeatherRequest,
  ): Promise<WeatherProviderResponse> {
    const replay = await this.readReplay(request);

    return {
      fetchedAt: replay.fetchedAt,
      gameId: replay.gameId,
      mode: "replay",
      provider: replay.provider,
      weather: { ...replay.weather, source: "replay" },
    };
  }

  async writeReplay({
    provider,
    raw,
    request,
    weather,
  }: {
    provider: string;
    raw: unknown;
    request: WeatherRequest;
    weather: WeatherProviderResponse["weather"];
  }) {
    await mkdir(this.replayDir, { recursive: true });
    const fetchedAt = new Date().toISOString();
    const fileName = `${fetchedAt.replace(/[:.]/g, "-")}-${request.gameId}.json`;

    await writeFile(
      path.join(this.replayDir, fileName),
      JSON.stringify(
        {
          fetchedAt,
          gameId: request.gameId,
          mode: "live",
          provider,
          raw,
          request,
          weather,
        } satisfies WeatherReplayFile,
        null,
        2,
      ),
      "utf8",
    );
  }

  private async readReplay(request: WeatherRequest) {
    const explicitFile = process.env.WEATHER_REPLAY_FILE;

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

      if (replay.gameId === request.gameId) {
        return replay;
      }
    }

    throw new Error(`No weather replay found for game ${request.gameId}`);
  }
}

async function readReplayFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as WeatherReplayFile;
}

function getReplayDirectory() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.WEATHER_REPLAY_DIR ?? DEFAULT_REPLAY_DIR,
  );
}
