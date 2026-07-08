import { normalizeOddsPipeResponse } from "./normalize-oddspipe";
import type {
  OddsProvider,
  OddsProviderRequest,
  OddsProviderResponse,
} from "./OddsProvider";
import { ReplayOddsProvider } from "./ReplayOddsProvider";

export { normalizeOddsPipeResponse } from "./normalize-oddspipe";

const DEFAULT_ODDSPIPE_URL = "https://api.oddspipe.com/v1/odds";

export class OddsPipeProvider implements OddsProvider {
  readonly id = "oddspipe";

  constructor(
    private readonly endpoint = process.env.ODDSPIPE_API_URL ?? DEFAULT_ODDSPIPE_URL,
    private readonly apiKey = process.env.ODDSPIPE_API_KEY,
    private readonly replayProvider = new ReplayOddsProvider(),
  ) {}

  async getOdds(request: OddsProviderRequest): Promise<OddsProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ODDSPIPE_API_KEY is required for live odds mode");
    }

    const response = await fetch(this.buildUrl(request), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OddsPipe request failed with ${response.status}`);
    }

    const raw = await response.json();
    const records = normalizeOddsPipeResponse(raw);

    if (process.env.ODDS_RECORD === "true") {
      await this.replayProvider.writeReplay({
        provider: this.id,
        raw,
        records,
        request,
      });
    }

    return {
      fetchedAt: new Date().toISOString(),
      mode: "live",
      provider: this.id,
      records,
    };
  }

  private buildUrl(request: OddsProviderRequest) {
    const url = new URL(this.endpoint);

    url.searchParams.set("sport", request.sport);

    if (request.date) {
      url.searchParams.set("date", request.date);
    }

    if (request.eventIds?.length) {
      url.searchParams.set("eventIds", request.eventIds.join(","));
    }

    if (request.markets?.length) {
      url.searchParams.set("markets", request.markets.join(","));
    }

    return url;
  }
}
