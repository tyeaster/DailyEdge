import { normalizeOddsPipeResponse } from "./normalize-oddspipe.ts";
import type {
  OddsProvider,
  OddsProviderRequest,
  OddsProviderResponse,
  OddsRateLimitInfo,
} from "./OddsProvider";
import { ReplayOddsProvider } from "./ReplayOddsProvider.ts";

export { normalizeOddsPipeResponse } from "./normalize-oddspipe.ts";

const DEFAULT_ODDSPIPE_BASE_URL = "https://api.oddspipe.com";
const ODDSPIPE_ODDS_PATH = "/v1/odds";

type FetchLike = typeof fetch;

export class OddsPipeProvider implements OddsProvider {
  readonly id = "oddspipe";
  private readonly apiKey?: string;
  private readonly endpoint: string;
  private readonly fetcher: FetchLike;
  private readonly replayProvider: ReplayOddsProvider;

  constructor(
    endpoint = getOddsPipeEndpoint(),
    apiKey = process.env.ODDSPIPE_API_KEY,
    replayProvider = new ReplayOddsProvider(),
    fetcher: FetchLike = fetch,
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.fetcher = fetcher;
    this.replayProvider = replayProvider;
  }

  async getOdds(request: OddsProviderRequest): Promise<OddsProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ODDSPIPE_API_KEY is required for live odds mode");
    }

    const response = await this.fetcher(this.buildUrl(request), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    const rateLimit = extractRateLimit(response.headers);

    if (!response.ok) {
      throw new Error(await formatOddsPipeError(response));
    }

    const raw = await response.json();
    const records = normalizeOddsPipeResponse(raw);

    if (process.env.ODDS_RECORD === "true") {
      await this.replayProvider.writeReplay({
        provider: this.id,
        rateLimit,
        raw,
        records,
        request,
      });
    }

    return {
      fetchedAt: new Date().toISOString(),
      mode: "live",
      provider: this.id,
      rateLimit,
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

export function getOddsPipeEndpoint() {
  if (process.env.ODDSPIPE_API_URL) {
    return process.env.ODDSPIPE_API_URL;
  }

  return buildOddsPipeEndpoint(process.env.ODDSPIPE_BASE_URL ?? DEFAULT_ODDSPIPE_BASE_URL);
}

export function buildOddsPipeEndpoint(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");

  if (trimmed.endsWith(ODDSPIPE_ODDS_PATH)) {
    return trimmed;
  }

  return `${trimmed}${ODDSPIPE_ODDS_PATH}`;
}

export function extractRateLimit(headers: Headers): OddsRateLimitInfo {
  return {
    limit: getHeader(headers, "x-ratelimit-limit"),
    remaining: getHeader(headers, "x-ratelimit-remaining"),
    reset: getHeader(headers, "x-ratelimit-reset"),
    retryAfter: getHeader(headers, "retry-after"),
  };
}

async function formatOddsPipeError(response: Response) {
  const body = await response.text().catch(() => "");
  const retryAfter = response.headers.get("retry-after");
  const retryText = retryAfter ? `; retry-after=${retryAfter}` : "";
  const bodyText = body ? `; body=${body.slice(0, 240)}` : "";

  return `OddsPipe request failed with ${response.status}${retryText}${bodyText}`;
}

function getHeader(headers: Headers, key: string) {
  return headers.get(key) ?? undefined;
}
