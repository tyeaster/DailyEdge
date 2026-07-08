import type {
  InjuryProvider,
  InjuryRequest,
  InjuryProviderResponse,
  NormalizedInjury,
} from "./InjuryProvider.ts";

const DEFAULT_MLB_API_URL = "https://statsapi.mlb.com/api/v1";
const SPORT_ID_MLB = 1;
const DEFAULT_LOOKBACK_DAYS = 14;
const NEUTRAL_IMPACT_RATING = 50;

type MlbTransaction = {
  date?: string;
  description?: string;
  effectiveDate?: string;
  id?: number;
  person?: { id?: number; fullName?: string };
  toTeam?: { id?: number };
};

type MlbTransactionsResponse = {
  transactions?: MlbTransaction[];
};

/**
 * Fetches recent Injured List transactions from the MLB Stats API
 * transactions endpoint.
 *
 * IMPORTANT: like MLBGameResultsProvider, this parser follows the
 * long-documented, stable MLB Stats API transactions shape but has NOT
 * been exercised against a live network call - this sandbox blocks
 * outbound access to statsapi.mlb.com. Run one live smoke test before
 * relying on this in production.
 *
 * Only produces "10-day IL" / "15-day IL" statuses - those are the only
 * ones derivable from a transactions feed (see InjuryProvider.ts).
 * impactRating always defaults to neutral: scoring how much losing a
 * specific player actually hurts needs player-performance context this
 * feed doesn't provide.
 */
export class MLBInjuryProvider implements InjuryProvider {
  readonly id = "mlb-transactions";
  private readonly endpoint: string;

  constructor(endpoint: string = process.env.MLB_API_URL ?? DEFAULT_MLB_API_URL) {
    this.endpoint = endpoint;
  }

  async getInjuries(request: InjuryRequest): Promise<InjuryProviderResponse> {
    const url = new URL(`${this.endpoint}/transactions`);
    const endDate = request.date;
    const startDate = shiftDate(endDate, -(request.lookbackDays ?? DEFAULT_LOOKBACK_DAYS));

    url.searchParams.set("sportId", String(SPORT_ID_MLB));
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MLB transactions request failed with ${response.status}`);
    }

    const raw = (await response.json()) as MlbTransactionsResponse;

    return {
      fetchedAt: new Date().toISOString(),
      injuries: normalizeMlbTransactions(raw),
      mode: "live",
      provider: this.id,
    };
  }
}

export function normalizeMlbTransactions(
  raw: MlbTransactionsResponse,
): NormalizedInjury[] {
  const transactions = raw.transactions ?? [];

  return transactions.flatMap((transaction) => {
    const status = detectIlStatus(transaction.description);
    const playerId = transaction.person?.id;
    const teamId = transaction.toTeam?.id;

    if (!status || typeof playerId !== "number" || typeof teamId !== "number") {
      return [];
    }

    const effectiveDate = transaction.effectiveDate ?? transaction.date ?? new Date().toISOString();

    return [
      {
        description: transaction.description ?? "",
        effectiveDate,
        expectedReturn: status,
        id: transaction.id ? `injury-${transaction.id}` : `injury-${playerId}-${effectiveDate}`,
        impactRating: NEUTRAL_IMPACT_RATING,
        playerId: `mlb-player-${playerId}`,
        playerName: transaction.person?.fullName ?? "Unknown Player",
        status,
        teamId: `mlb-team-${teamId}`,
      },
    ];
  });
}

function detectIlStatus(description?: string): "10-day IL" | "15-day IL" | undefined {
  if (!description) {
    return undefined;
  }

  const normalized = description.toLowerCase();

  if (normalized.includes("15-day injured list")) {
    return "15-day IL";
  }

  if (normalized.includes("10-day injured list")) {
    return "10-day IL";
  }

  return undefined;
}

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
